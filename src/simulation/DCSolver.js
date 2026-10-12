/**
 * ElectroLab 2.0 - Solucionador de Circuitos de Corriente Directa (DC Solver - MNA)
 * Implementa el método de Análisis Nodal Modificado (Modified Nodal Analysis) riguroso:
 * - Construye matrices de admitancia G, acoplamiento de fuentes B, y vector de excitación.
 * - Resuelve el sistema lineal mediante eliminación gaussiana con pivoteo parcial.
 * - Calcula voltajes nodales, caídas de tensión por rama, corrientes y potencias.
 * - Detecta singularidades: circuitos abiertos, nodos flotantes, tierras ausentes y cortocircuitos.
 * - Aplica convención de signos activa para fuentes y pasiva para resistencias.
 */

import { convertToOhms } from '../utils/resistorColorCode.js';
import { COMPONENT_CATALOG } from '../model/componentCatalog.js';

export class DCSolver {
  constructor(model) {
    this.model = model;
  }

  /**
   * Resuelve el circuito actual en estado estacionario de corriente directa (DC).
   * @returns {Object} Resultado estructurado con éxito, voltajes, corrientes, potencias y diagnóstico.
   */
  solve() {
    const components = Array.from(this.model.components.values());
    const wires = this.model.wires;

    // 1. Verificación básica de componentes
    if (components.length === 0) {
      return {
        success: false,
        errorType: 'EMPTY',
        title: 'Circuito vacío',
        message: 'No hay componentes en el lienzo para simular. Agrega componentes desde la biblioteca.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // 2. Detección de referencia de tierra (GND)
    const gndComp = components.find(c => c.type === 'gnd');
    if (!gndComp) {
      return {
        success: false,
        errorType: 'NO_GND',
        title: 'Referencia de Tierra (GND) requerida',
        message: 'El análisis nodal requiere un nodo de referencia de potencial cero (0V). Coloca un componente Tierra (GND) y conéctalo al circuito.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // 3. Cálculo de redes eléctricas reales (Nets)
    const nets = this.model.calculateNets();
    if (nets.length === 0 || wires.length === 0) {
      return {
        success: false,
        errorType: 'OPEN_CIRCUIT',
        title: 'Circuito abierto sin conexiones',
        message: 'No existen conductores conectando los terminales de los componentes.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // Identificar el índice de la red GND
    const gndNetIndex = nets.findIndex(n => n.isGnd);
    if (gndNetIndex === -1) {
      return {
        success: false,
        errorType: 'GND_DISCONNECTED',
        title: 'Tierra desconectada',
        message: 'El componente de Tierra (GND) está en el lienzo pero no tiene ningún cable conectado al circuito.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // Mapeo de terminales a índices de nodos:
    // Nodo 0: Tierra (GND). Nodos 1..N: redes no-tierra.
    const pinToNodeMap = new Map();
    const netToNodeIdx = new Map();
    let nonGndNodeCounter = 1;

    nets.forEach((net, idx) => {
      let nodeIdx;
      if (idx === gndNetIndex) {
        nodeIdx = 0; // Tierra de referencia
      } else {
        nodeIdx = nonGndNodeCounter++;
      }
      netToNodeIdx.set(idx, nodeIdx);
      net.pins.forEach(pinKey => {
        pinToNodeMap.set(pinKey, nodeIdx);
      });
    });

    const N = nonGndNodeCounter - 1; // Número de nodos independientes sin contar tierra
    if (N === 0) {
      return {
        success: false,
        errorType: 'ALL_GND',
        title: 'Circuito trivial o en cortocircuito directo a tierra',
        message: 'Todos los terminales conectados pertenecen al nodo de Tierra (GND).',
        nodeVoltages: { 0: 0 },
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // 4. Identificar fuentes de tensión DC independientes
    const vSources = [];
    const resistors = [];
    const capacitors = [];
    const unsupportedComps = [];

    components.forEach(c => {
      if (c.type === 'dc_source' || c.type === 'battery') {
        const pPlus = pinToNodeMap.get(`${c.id}:p_plus`);
        const pMinus = pinToNodeMap.get(`${c.id}:p_minus`);
        const val = parseFloat(c.params?.voltage !== undefined ? c.params.voltage : c.value) || 0;

        if (pPlus === undefined || pMinus === undefined) {
          // Terminal flotante
          unsupportedComps.push(`${c.name} tiene terminales flotantes sin conectar.`);
        } else if (pPlus === pMinus) {
          // Cortocircuito directo de la fuente consigo misma
          unsupportedComps.push(`${c.name} tiene sus terminales positivo y negativo en cortocircuito directo.`);
        } else {
          vSources.push({
            id: c.id,
            comp: c,
            nodePlus: pPlus,
            nodeMinus: pMinus,
            voltage: val
          });
        }
      } else if (c.type === 'resistor') {
        const p1 = pinToNodeMap.get(`${c.id}:p1`);
        const p2 = pinToNodeMap.get(`${c.id}:p2`);
        const rVal = c.params?.resistance !== undefined ? c.params.resistance : c.value;
        const rUnit = c.params?.resistanceUnit || c.unit || 'kΩ';
        const ohms = convertToOhms(rVal, rUnit);

        if (p1 !== undefined && p2 !== undefined && p1 !== p2 && ohms && ohms > 0) {
          resistors.push({
            id: c.id,
            comp: c,
            node1: p1,
            node2: p2,
            resistance: ohms,
            nominalVal: rVal,
            unit: rUnit
          });
        }
      } else if (c.type === 'potentiometer') {
        const p1 = pinToNodeMap.get(`${c.id}:p1`);
        const pw = pinToNodeMap.get(`${c.id}:pw`);
        const p2 = pinToNodeMap.get(`${c.id}:p2`);
        const totalOhms = convertToOhms(c.params?.resistance || 10, 'kΩ') || 10000;
        const pos = Math.max(0.01, Math.min(0.99, (parseFloat(c.params?.position) || 50) / 100));

        if (p1 !== undefined && pw !== undefined && p1 !== pw) {
          resistors.push({
            id: `${c.id}_r1`,
            comp: c,
            name: `${c.name} (A-W)`,
            node1: p1,
            node2: pw,
            resistance: totalOhms * pos,
            nominalVal: (totalOhms * pos / 1000).toFixed(2),
            unit: 'kΩ'
          });
        }
        if (pw !== undefined && p2 !== undefined && pw !== p2) {
          resistors.push({
            id: `${c.id}_r2`,
            comp: c,
            name: `${c.name} (W-B)`,
            node1: pw,
            node2: p2,
            resistance: totalOhms * (1 - pos),
            nominalVal: (totalOhms * (1 - pos) / 1000).toFixed(2),
            unit: 'kΩ'
          });
        }
      } else if (c.type === 'switch_spst') {
        const p1 = pinToNodeMap.get(`${c.id}:p1`);
        const p2 = pinToNodeMap.get(`${c.id}:p2`);
        const isClosed = (c.params?.state === 'closed');
        if (p1 !== undefined && p2 !== undefined && p1 !== p2) {
          if (isClosed) {
            // Interruptor cerrado: resistencia parásita mínima (1 mΩ) para continuidad
            resistors.push({
              id: c.id,
              comp: c,
              name: `${c.name} (Cerrado)`,
              node1: p1,
              node2: p2,
              resistance: 0.001,
              nominalVal: 0,
              unit: 'Ω',
              isSwitch: true
            });
          }
        }
      } else if (c.type === 'switch_spdt') {
        const pos = c.params?.position || '1';
        const pCom = pinToNodeMap.get(`${c.id}:p_common`);
        const pTarget = pinToNodeMap.get(`${c.id}:p${pos}`);
        if (pCom !== undefined && pTarget !== undefined && pCom !== pTarget) {
          resistors.push({
            id: c.id,
            comp: c,
            name: `${c.name} (Tiro ${pos})`,
            node1: pCom,
            node2: pTarget,
            resistance: 0.001,
            nominalVal: 0,
            unit: 'Ω',
            isSwitch: true
          });
        }
      } else if (c.type === 'push_button' || c.type === 'push_button_nc') {
        const isNC = (c.type === 'push_button_nc' || c.params?.buttonType === 'NC');
        const isPressed = (c.params?.state === 'pressed');
        // NC conduce en reposo (released); NO conduce al presionar (pressed)
        const isContactClosed = isNC ? !isPressed : isPressed;

        const p1 = pinToNodeMap.get(`${c.id}:p1`);
        const p2 = pinToNodeMap.get(`${c.id}:p2`);
        if (p1 !== undefined && p2 !== undefined && p1 !== p2 && isContactClosed) {
          resistors.push({
            id: c.id,
            comp: c,
            name: `${c.name} (${isNC ? 'NC' : 'NA'} Conduciendo)`,
            node1: p1,
            node2: p2,
            resistance: 0.001,
            nominalVal: 0,
            unit: 'Ω',
            isSwitch: true
          });
        }
      } else if (c.type === 'cap_ceramic' || c.type === 'cap_electrolytic') {
        capacitors.push(c);
      } else if (['led', 'diode', 'zener_diode'].includes(c.type)) {
        // Detección de semiconductores no lineales
        // Se preserva la topología sin inventar corrientes ni estados ficticios
      } else if (['ac_source', 'ic_555'].includes(c.type)) {
        unsupportedComps.push(`${c.name} (${c.type}): Este componente opera en régimen alterno o dinámico y no es modelable en corriente continua estática.`);
      }
    });

    // Verificación estricta: Si hay semiconductores (LED, Diodos), avisar de modelo pendiente sin inventar datos
    const semiComps = components.filter(c => ['led', 'diode', 'zener_diode'].includes(c.type));
    if (semiComps.length > 0) {
      const names = semiComps.map(s => `${s.name} (${s.type.toUpperCase()})`).join(', ');
      return {
        success: false,
        status: 'pending_semiconductor_model',
        errorType: 'PENDING_SEMICONDUCTOR_MODEL',
        title: 'Simulación de semiconductores (LED / Diodo) pendiente',
        message: `El circuito incluye componentes semiconductores (${names}). El modelo eléctrico no lineal para diodos y LEDs está en fase de desarrollo para el solucionador DC MNA. ElectroLab 2.0 no inventa corrientes, tensiones ni estados ficticios de iluminación.`,
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null,
        pendingComponents: semiComps.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          params: c.params,
          pins: (COMPONENT_CATALOG[c.type]?.pins || []).map(p => ({
            id: p.id,
            label: p.label,
            connectedNode: pinToNodeMap.get(`${c.id}:${p.id}`) !== undefined ? pinToNodeMap.get(`${c.id}:${p.id}`) : 'Flotante'
          }))
        }))
      };
    }

    if (unsupportedComps.length > 0) {
      return {
        success: false,
        errorType: 'UNSUPPORTED_OR_FLOATING',
        title: 'Condición no compatible en simulación DC',
        message: unsupportedComps.join(' '),
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    if (vSources.length === 0) {
      return {
        success: false,
        errorType: 'NO_SOURCE',
        title: 'Sin fuente de alimentación activa',
        message: 'No hay fuentes de tensión DC conectadas al circuito. Agrega una Fuente DC o Batería.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    if (resistors.length === 0) {
      return {
        success: false,
        errorType: 'NO_LOAD',
        title: 'Sin carga resistiva',
        message: 'El circuito contiene fuentes pero no contiene resistencias para limitar o disipar la corriente.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // 5. Construcción de Matrices MNA
    // Tamaño del sistema: N nodos no-tierra + M fuentes de tensión
    const M = vSources.length;
    const size = N + M;

    // Matriz A de tamaño size x size, vector b de tamaño size
    const A = Array.from({ length: size }, () => new Float64Array(size));
    const b = new Float64Array(size);

    // 5.1 Estampado de Conductancias (G)
    resistors.forEach(r => {
      const g = 1 / r.resistance;
      const n1 = r.node1;
      const n2 = r.node2;

      if (n1 > 0) {
        A[n1 - 1][n1 - 1] += g;
      }
      if (n2 > 0) {
        A[n2 - 1][n2 - 1] += g;
      }
      if (n1 > 0 && n2 > 0) {
        A[n1 - 1][n2 - 1] -= g;
        A[n2 - 1][n1 - 1] -= g;
      }
    });

    // 5.2 Estampado de Fuentes de Tensión (B y C)
    vSources.forEach((vSrc, mIdx) => {
      const rowColIdx = N + mIdx;
      const nPlus = vSrc.nodePlus;
      const nMinus = vSrc.nodeMinus;

      if (nPlus > 0) {
        A[nPlus - 1][rowColIdx] += 1.0;
        A[rowColIdx][nPlus - 1] += 1.0;
      }
      if (nMinus > 0) {
        A[nMinus - 1][rowColIdx] -= 1.0;
        A[rowColIdx][nMinus - 1] -= 1.0;
      }

      b[rowColIdx] = vSrc.voltage;
    });

    // 6. Solución del Sistema Lineal: Eliminación Gaussiana con Pivoteo Parcial
    const x = this.solveLinearSystem(A, b, size);

    if (!x) {
      return {
        success: false,
        errorType: 'SINGULAR_MATRIX',
        title: 'Circuito no invertible o singular (MNA)',
        message: 'La matriz del circuito no tiene solución única. Posibles causas: circuito abierto sin retorno, mallas de fuentes ideales en conflicto en paralelo, o nodos flotantes sin referencia de conductancia.',
        nodeVoltages: {},
        branchResults: {},
        totals: null,
        powerBalance: null
      };
    }

    // 7. Extracción de Resultados
    // Node voltages: index 0 es 0V (Tierra). Nodos 1..N están en x[0..N-1].
    const nodeVoltages = { 0: 0.0 };
    for (let i = 1; i <= N; i++) {
      nodeVoltages[i] = x[i - 1];
    }

    // Resultados por resistencia
    const resistorResults = [];
    let totalDissipatedPower = 0;

    resistors.forEach(r => {
      const v1 = nodeVoltages[r.node1];
      const v2 = nodeVoltages[r.node2];
      const vDiff = v1 - v2;
      const vMag = Math.abs(vDiff);
      const conductance = r.resistance > 0 ? (1 / r.resistance) : 0;
      const current = vMag / r.resistance;
      const power = vMag * current;

      totalDissipatedPower += power;

      const polarityStr = v1 > v2
        ? `T1(+) [${(v1).toFixed(2)}V] → T2(-) [${(v2).toFixed(2)}V]`
        : (v2 > v1
          ? `T2(+) [${(v2).toFixed(2)}V] → T1(-) [${(v1).toFixed(2)}V]`
          : 'Equipotencial (0.00 V)');

      resistorResults.push({
        id: r.id,
        name: r.name || r.comp.name,
        componentId: r.comp.id,
        node1: r.node1,
        node2: r.node2,
        v1: v1,
        v2: v2,
        voltage: vMag, // Magnitud absoluta |V_R|
        signedVoltage: vDiff, // Diferencia con signo V1 - V2
        conductance: conductance, // G = 1/R en Siemens
        current: current, // I en Amperios
        power: power, // P en Vatios
        resistance: r.resistance,
        nominalVal: r.nominalVal,
        unit: r.unit,
        polarity: polarityStr,
        higherPotentialNode: v1 >= v2 ? r.node1 : r.node2
      });
    });

    // Resultados por fuente de tensión
    // En MNA, la variable x[N + mIdx] representa la corriente que entra por el polo positivo (convención pasiva).
    // Para la potencia entregada (convención activa): I_out = -x[N + mIdx].
    const sourceResults = [];
    let totalDeliveredPower = 0;
    let mainSourceCurrent = 0;

    vSources.forEach((vSrc, mIdx) => {
      const iPasive = x[N + mIdx];
      const iActive = -iPasive; // Corriente saliendo del polo positivo
      const pGen = vSrc.voltage * iActive;

      totalDeliveredPower += pGen;
      if (mIdx === 0) {
        mainSourceCurrent = Math.abs(iActive);
      }

      sourceResults.push({
        id: vSrc.id,
        name: vSrc.comp.name,
        voltage: vSrc.voltage,
        current: Math.abs(iActive),
        signedCurrent: iActive,
        power: pGen,
        nodePlus: vSrc.nodePlus,
        nodeMinus: vSrc.nodeMinus
      });
    });

    // Resistencia equivalente total vista por la fuente principal
    const mainVoltage = vSources[0].voltage;
    let eqResistance = 0;
    if (mainSourceCurrent > 1e-12) {
      eqResistance = mainVoltage / mainSourceCurrent;
    }

    // Balance de potencia y verificación
    const powerDiscrepancy = Math.abs(totalDeliveredPower - totalDissipatedPower);
    const isPowerBalanced = powerDiscrepancy < 1e-3 || (totalDeliveredPower > 0 && (powerDiscrepancy / totalDeliveredPower) < 1e-4);

    return {
      success: true,
      errorType: null,
      nodeVoltages,
      resistorResults,
      sourceResults,
      totals: {
        totalVoltage: mainVoltage,
        totalCurrent: mainSourceCurrent,
        totalResistance: eqResistance,
        totalConductance: eqResistance > 0 ? (1 / eqResistance) : 0,
        totalPower: totalDissipatedPower,
        deliveredPower: totalDeliveredPower
      },
      powerBalance: {
        deliveredPower: totalDeliveredPower,
        dissipatedPower: totalDissipatedPower,
        discrepancy: powerDiscrepancy,
        isBalanced: isPowerBalanced
      },
      netsMap: netToNodeIdx,
      nonGndNodeCount: N
    };
  }

  /**
   * Resuelve el sistema lineal A * x = b mediante eliminación gaussiana con pivoteo parcial.
   */
  solveLinearSystem(A, b, n) {
    // Clonar matriz y vector para no mutar los originales
    const M = A.map(row => new Float64Array(row));
    const y = new Float64Array(b);

    for (let col = 0; col < n; col++) {
      // Búsqueda del pivote máximo en la columna
      let maxRow = col;
      let maxVal = Math.abs(M[col][col]);
      for (let row = col + 1; row < n; row++) {
        const val = Math.abs(M[row][col]);
        if (val > maxVal) {
          maxVal = val;
          maxRow = row;
        }
      }

      // Si el pivote es prácticamente cero, la matriz es singular
      if (maxVal < 1e-11) {
        return null;
      }

      // Intercambiar filas si es necesario
      if (maxRow !== col) {
        const tempRow = M[col];
        M[col] = M[maxRow];
        M[maxRow] = tempRow;

        const tempY = y[col];
        y[col] = y[maxRow];
        y[maxRow] = tempY;
      }

      // Eliminación gaussiana hacia adelante
      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / M[col][col];
        y[row] -= factor * y[col];
        for (let k = col; k < n; k++) {
          M[row][k] -= factor * M[col][k];
        }
      }
    }

    // Sustitución regresiva hacia atrás
    const x = new Float64Array(n);
    for (let row = n - 1; row >= 0; row--) {
      let sum = y[row];
      for (let k = row + 1; k < n; k++) {
        sum -= M[row][k] * x[k];
      }
      x[row] = sum / M[row][row];
      if (isNaN(x[row]) || !isFinite(x[row])) {
        return null;
      }
    }

    return x;
  }
}
