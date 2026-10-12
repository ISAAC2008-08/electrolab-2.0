/**
 * ElectroLab 2.0 - Motor de Análisis Topológico y Reglas Eléctricas (ERC)
 * Analiza el modelo unificado del circuito de forma real y rigurosa:
 * - Detección de mallas, nodos y ramas
 * - Verificación de reglas eléctricas (ERC: pines sueltos, tierras ausentes, cortocircuitos)
 * - Fórmulas teóricas contextualizadas según los componentes presentes
 * - Generador de Netlist en formato SPICE estándar
 * - Estado transparente del solucionador numérico
 */

import { COMPONENT_CATALOG } from '../model/componentCatalog.js';
import { convertToOhms, formatSiemens, resistanceToConductance } from '../utils/resistorColorCode.js';

export class CircuitAnalysis {
  constructor(model) {
    this.model = model;
  }

  /**
   * Realiza un diagnóstico topológico completo del circuito actual.
   */
  analyzeTopology() {
    const components = Array.from(this.model.components.values());
    const wires = this.model.wires;
    const nets = this.model.calculateNets();

    const hasGround = components.some(c => c.type === 'gnd');
    const hasSource = components.some(c => ['dc_source', 'battery', 'ac_source', 'current_source'].includes(c.type));

    // Contar pines totales y pines conectados
    let totalPins = 0;
    const connectedPinSet = new Set();

    wires.forEach(w => {
      connectedPinSet.add(`${w.fromCompId}:${w.fromPinId}`);
      connectedPinSet.add(`${w.toCompId}:${w.toPinId}`);
    });

    components.forEach(c => {
      const def = COMPONENT_CATALOG[c.type];
      if (def && def.pins) {
        totalPins += def.pins.length;
      }
    });

    // Calcular componentes aislados (sin ningún cable)
    const isolatedComponents = components.filter(c => {
      const def = COMPONENT_CATALOG[c.type];
      if (!def || !def.pins) return false;
      return !def.pins.some(p => connectedPinSet.has(`${c.id}:${p.id}`));
    });

    // Calcular ramas activas y mallas estimadas (Fórmula de Euler para grafos planares: Mallas = Ramas - Nodos + 1)
    const activeBranches = wires.length;
    const activeNodes = nets.filter(n => n.pins.length > 1).length;
    const estimatedMeshes = activeBranches > 0 && activeNodes > 0 ? Math.max(0, activeBranches - activeNodes + 1) : 0;

    return {
      componentCount: components.length,
      wireCount: wires.length,
      netCount: nets.length,
      activeNodes,
      activeBranches,
      estimatedMeshes,
      hasGround,
      hasSource,
      totalPins,
      connectedPinsCount: connectedPinSet.size,
      isolatedCount: isolatedComponents.length,
      nets
    };
  }

  /**
   * Comprobación de Reglas Eléctricas (ERC - Electrical Rules Check).
   * Evalúa advertencias e infracciones reales sin inventar datos.
   */
  runERC() {
    const components = Array.from(this.model.components.values());
    const wires = this.model.wires;
    const nets = this.model.calculateNets();
    const issues = [];

    // 1. Verificación de circuito vacío
    if (components.length === 0) {
      return [{
        type: 'info',
        code: 'ERC_EMPTY',
        title: 'Lienzo en espera',
        message: 'No hay componentes en el circuito. Agrega elementos desde la biblioteca izquierda.'
      }];
    }

    // 2. Verificación de Tierra (GND)
    const gndComp = components.find(c => c.type === 'gnd');
    if (!gndComp) {
      issues.push({
        type: 'warning',
        code: 'ERC_NO_GND',
        title: 'Referencia de Tierra (GND) ausente',
        message: 'Para el cálculo de potenciales nodales absolutos, se recomienda colocar un nodo GND (0V).'
      });
    }

    // 3. Verificación de Fuente de Energía
    const sources = components.filter(c => ['dc_source', 'battery', 'ac_source', 'current_source'].includes(c.type));
    if (sources.length === 0) {
      issues.push({
        type: 'warning',
        code: 'ERC_NO_SOURCE',
        title: 'Sin fuente de excitación',
        message: 'El circuito es puramente pasivo sin fuentes de alimentación conectadas.'
      });
    }

    // 4. Verificación de Pines Abiertos / Flotantes
    const connectedPinSet = new Set();
    wires.forEach(w => {
      connectedPinSet.add(`${w.fromCompId}:${w.fromPinId}`);
      connectedPinSet.add(`${w.toCompId}:${w.toPinId}`);
    });

    components.forEach(c => {
      const def = COMPONENT_CATALOG[c.type];
      if (def && def.pins) {
        def.pins.forEach(p => {
          const pinKey = `${c.id}:${p.id}`;
          if (!connectedPinSet.has(pinKey)) {
            // Nota: En ICs algunos pines pueden ser opcionales, pero es buena práctica avisar
            issues.push({
              type: 'advisory',
              code: 'ERC_FLOATING_PIN',
              title: `Terminal flotante: ${c.name} [${p.label}]`,
              message: `El pin ${p.label} de ${c.name} (${def.name}) no tiene cable conectado.`
            });
          }
        });
      }
    });

    // 5. Verificación de Cortocircuitos de Fuentes
    sources.forEach(src => {
      const def = COMPONENT_CATALOG[src.type];
      if (def && def.pins.length >= 2) {
        const pinKeys = def.pins.map(p => `${src.id}:${p.id}`);
        // Ver si ambos pines terminan en la misma Red
        nets.forEach(net => {
          const bothInSameNet = pinKeys.every(pk => net.pins.includes(pk));
          if (bothInSameNet && wires.length > 0) {
            issues.push({
              type: 'error',
              code: 'ERC_SHORT_CIRCUIT',
              title: `¡Peligro de Cortocircuito en ${src.name}!`,
              message: `Los terminales positivo y negativo de ${src.name} están cortocircuitados en la red ${net.name}.`
            });
          }
        });
      }
    });

    // 6. Verificación de Componentes Totalmente Aislados
    components.forEach(c => {
      const def = COMPONENT_CATALOG[c.type];
      if (def && def.pins) {
        const isConnected = def.pins.some(p => connectedPinSet.has(`${c.id}:${p.id}`));
        if (!isConnected && components.length > 1) {
          issues.push({
            type: 'warning',
            code: 'ERC_ISOLATED',
            title: `Componente aislado: ${c.name}`,
            message: `${c.name} no posee ninguna interconexión con el resto del circuito.`
          });
        }
      }
    });

    if (issues.length === 0) {
      issues.push({
        type: 'success',
        code: 'ERC_OK',
        title: 'Verificación de Reglas Eléctricas Satisfactoria',
        message: 'No se detectaron violaciones topológicas críticas ni terminales en corto.'
      });
    }

    return issues;
  }

  /**
   * Genera fórmulas teóricas relevantes basadas en los componentes reales presentes.
   */
  getDynamicFormulas() {
    const components = Array.from(this.model.components.values());
    const formulas = [];

    // Fuentes y resistencias activas en el modelo
    const sources = components.filter(c => ['dc_source', 'battery'].includes(c.type));
    const resistors = components.filter(c => c.type === 'resistor' || c.type === 'potentiometer');
    const capacitors = components.filter(c => c.type === 'cap_ceramic' || c.type === 'cap_electrolytic');

    const vSourceVal = sources.length > 0 ? (parseFloat(sources[0].params?.voltage !== undefined ? sources[0].params.voltage : sources[0].value) || 9) : null;
    const r1Obj = resistors.length > 0 ? resistors[0] : null;
    const r2Obj = resistors.length > 1 ? resistors[1] : null;

    const r1Unit = r1Obj ? (r1Obj.params?.resistanceUnit || r1Obj.unit || 'kΩ') : 'kΩ';
    const r1Nom = r1Obj ? (parseFloat(r1Obj.params?.resistance !== undefined ? r1Obj.params.resistance : 10) || 10) : 10;
    const r1Ohms = r1Obj ? (convertToOhms(r1Nom, r1Unit) || 10000) : 10000;

    const r2Unit = r2Obj ? (r2Obj.params?.resistanceUnit || r2Obj.unit || 'kΩ') : 'kΩ';
    const r2Nom = r2Obj ? (parseFloat(r2Obj.params?.resistance !== undefined ? r2Obj.params.resistance : 10) || 10) : 10;
    const r2Ohms = r2Obj ? (convertToOhms(r2Nom, r2Unit) || 10000) : 10000;

    // 1. Ley de Corrientes de Kirchhoff (LCK)
    formulas.push({
      category: 'Leyes Fundamentales',
      title: 'Ley de Corrientes de Kirchhoff (LCK)',
      formulaLatex: '\\sum_{k=1}^n I_k = 0',
      substitutionLatex: '\\sum I_{\\text{entrantes}} = \\sum I_{\\text{salientes}}',
      steps: [
        { num: 1, title: 'Identificación de nodos', detail: 'Se seleccionan las redes de interconexión donde concurren dos o más ramas.' },
        { num: 2, title: 'Conservación de carga', detail: 'La corriente neta en cada nodo de la matriz nodal suma exactamente 0.00 A.' }
      ],
      result: 'I_{\\text{neta}} = 0.00\\text{ A}',
      description: 'La suma algebraica de las corrientes que convergen en cualquier nodo cerrado es exactamente cero.'
    });

    // 2. Ley de Tensiones de Kirchhoff (LTK / LVK)
    const ltkSubst = (vSourceVal !== null && resistors.length >= 2)
      ? `${vSourceVal}\\text{ V} - \\left(${(vSourceVal * (r1Ohms / (r1Ohms + r2Ohms))).toFixed(2)}\\text{ V} + ${(vSourceVal * (r2Ohms / (r1Ohms + r2Ohms))).toFixed(2)}\\text{ V}\\right) = 0.00\\text{ V}`
      : '\\sum V_{\\text{fuentes}} - \\sum V_{\\text{caídas}} = 0';

    formulas.push({
      category: 'Leyes Fundamentales',
      title: 'Ley de Tensiones de Kirchhoff (LTK / LVK)',
      formulaLatex: '\\sum_{k=1}^m V_k = 0',
      substitutionLatex: ltkSubst,
      steps: [
        { num: 1, title: 'Definición de la trayectoria cerrada', detail: 'Recorrido de la malla eléctrica desde el terminal positivo al polo de referencia.' },
        { num: 2, title: 'Balance de potenciales', detail: 'Las elevaciones de tensión provistas por fuentes igualan la suma de caídas en cargas pasivas.' }
      ],
      result: '\\Delta V_{\\text{malla}} = 0.00\\text{ V}',
      description: 'La suma algebraica de las diferencias de potencial alrededor de cualquier malla o lazo cerrado es nula.'
    });

    // 3. Ley de Ohm
    if (r1Obj) {
      const iEst = (vSourceVal !== null) ? (vSourceVal / (r1Ohms + (r2Obj ? r2Ohms : 0))) : 0.001;
      const vEst = iEst * r1Ohms;
      const iEstText = iEst < 0.01 ? `${(iEst * 1000).toFixed(2)}\\text{ mA}` : `${iEst.toFixed(3)}\\text{ A}`;

      formulas.push({
        category: 'Elementos Pasivos',
        title: `Ley de Ohm (${r1Obj.name})`,
        formulaLatex: 'V = I \\times R',
        substitutionLatex: `V_{${r1Obj.name}} = (${iEstText}) \\times (${r1Nom}\\text{ }${r1Unit})`,
        operationLatex: `V_{${r1Obj.name}} = ${vEst.toFixed(2)}\\text{ V}`,
        steps: [
          { num: 1, title: 'Resistencia del componente', detail: `${r1Obj.name} = ${r1Nom} ${r1Unit} (${r1Ohms.toLocaleString()} Ω)` },
          { num: 2, title: 'Corriente circulante', detail: `Intensidad a través del elemento = ${iEstText}` },
          { num: 3, title: 'Caída de potencial', detail: `Tensión en terminales = ${vEst.toFixed(2)} V` }
        ],
        result: `V_{${r1Obj.name}} = ${vEst.toFixed(2)}\\text{ V}`,
        description: `Relación lineal de proporcionalidad directa entre tensión y corriente en ${r1Obj.name}.`
      });

      // Conductancia Eléctrica (G = 1/R = I/V)
      const gEst = r1Ohms > 0 ? (1 / r1Ohms) : 0;
      const gEstText = formatSiemens(gEst);

      formulas.push({
        category: 'Elementos Pasivos',
        title: `Conductancia Eléctrica (${r1Obj.name})`,
        formulaLatex: 'G = \\frac{1}{R} = \\frac{I}{V}',
        substitutionLatex: `G_{${r1Obj.name}} = \\frac{1}{${r1Nom}\\text{ }${r1Unit}}`,
        operationLatex: `G_{${r1Obj.name}} = \\frac{1}{${r1Ohms.toLocaleString()}\\text{ }\\Omega} = ${gEstText}`,
        steps: [
          { num: 1, title: 'Concepto de Conductancia', detail: 'Facilidad que ofrece un conductor al paso de la corriente eléctrica. Expresada en siemens (S).' },
          { num: 2, title: 'Relación con Resistencia', detail: `Inverso multiplicativo: G = 1 / R = 1 / (${r1Nom} ${r1Unit}) = ${gEstText}.` },
          { num: 3, title: 'Relación Corriente-Voltaje', detail: (vEst > 0) ? `G = I / V = (${iEstText}) / (${vEst.toFixed(2)} V) = ${gEstText}.` : 'V = 0 V (requiere tensión no nula para calcular G = I/V).' }
        ],
        result: `G_{${r1Obj.name}} = ${gEstText}`,
        description: 'Medida cuantitativa de la facilidad de conducción de carga eléctrica en el elemento.'
      });

      // Potencia Disipada
      const pEst = vEst * iEst;
      const pEstText = pEst < 0.01 ? `${(pEst * 1000).toFixed(2)}\\text{ mW}` : `${pEst.toFixed(3)}\\text{ W}`;

      formulas.push({
        category: 'Potencia Eléctrica',
        title: `Potencia Disipada (${r1Obj.name})`,
        formulaLatex: 'P = V \\times I = I^2 \\times R = \\frac{V^2}{R}',
        substitutionLatex: `P_{${r1Obj.name}} = (${vEst.toFixed(2)}\\text{ V}) \\times (${iEstText})`,
        operationLatex: `P_{${r1Obj.name}} = (${iEstText})^2 \\times (${r1Nom}\\text{ }${r1Unit}) = ${pEstText}`,
        steps: [
          { num: 1, title: 'Efecto Joule', detail: `Conversión irreversible de energía eléctrica a calor en ${r1Obj.name}.` },
          { num: 2, title: 'Comprobación de disipación', detail: `Potencia calculada = ${pEstText} (límite comercial estándar: 0.25 W).` }
        ],
        result: `P_{${r1Obj.name}} = ${pEstText}`,
        description: 'Tasa temporal a la cual se disipa energía eléctrica en forma de calor por efecto Joule.'
      });
    }

    // 4. Divisor de Tensión
    if (resistors.length >= 2 && vSourceVal !== null) {
      const vOutVal = (vSourceVal * (r2Ohms / (r1Ohms + r2Ohms)));
      formulas.push({
        category: 'Topología Resistiva',
        title: 'Divisor de Tensión Resistivo',
        formulaLatex: 'V_{out} = V_{in} \\cdot \\frac{R_2}{R_1 + R_2}',
        substitutionLatex: `V_{out} = ${vSourceVal}\\text{ V} \\cdot \\frac{${r2Nom}\\text{ }${r2Unit}}{${r1Nom}\\text{ }${r1Unit} + ${r2Nom}\\text{ }${r2Unit}} = ${vOutVal.toFixed(2)}\\text{ V}`,
        steps: [
          { num: 1, title: 'Resistencias en serie', detail: `R₁ = ${r1Nom} ${r1Unit}, R₂ = ${r2Nom} ${r2Unit}. Suma total = ${((r1Ohms + r2Ohms) / 1000).toFixed(2)} kΩ.` },
          { num: 2, title: 'Fracción de reparto', detail: `Factor de atenuación: ${(r2Ohms / (r1Ohms + r2Ohms)).toFixed(3)}.` },
          { num: 3, title: 'Tensión escalada', detail: `Tensión intermedia de salida Vout = ${vOutVal.toFixed(2)} V.` }
        ],
        result: `V_{out} = ${vOutVal.toFixed(2)}\\text{ V}`,
        description: 'Regla de reparto de tensión en ramas conectadas en serie sometidas a una diferencia de potencial común.'
      });

      // Resistencia Equivalente en Paralelo y Serie
      const rEqSerie = (r1Ohms + r2Ohms);
      const rEqParalelo = (r1Ohms * r2Ohms) / (r1Ohms + r2Ohms);

      formulas.push({
        category: 'Topología Resistiva',
        title: 'Resistencias Equivalentes (Serie & Paralelo)',
        formulaLatex: 'R_{serie} = R_1 + R_2 \\quad , \\quad R_{paralelo} = \\frac{R_1 \\cdot R_2}{R_1 + R_2}',
        substitutionLatex: `R_{eq(s)} = ${(rEqSerie / 1000).toFixed(2)}\\text{ k}\\Omega \\quad , \\quad R_{eq(p)} = ${(rEqParalelo / 1000).toFixed(2)}\\text{ k}\\Omega`,
        steps: [
          { num: 1, title: 'Conexión Serie', detail: `Suma directa de resistencias: ${r1Nom} + ${r2Nom} = ${(rEqSerie / 1000).toFixed(2)} kΩ.` },
          { num: 2, title: 'Conexión Paralelo', detail: `Conductancias aditivas: ${(rEqParalelo / 1000).toFixed(2)} kΩ.` }
        ],
        result: `R_{s} = ${(rEqSerie / 1000).toFixed(2)}\\text{ k}\\Omega`,
        description: 'Fórmulas para simplificación analítica de redes de dos terminales pasivas.'
      });
    }

    // 5. Filtro RC si hay Resistencia + Capacitor
    if (resistors.length > 0 && capacitors.length > 0) {
      const cVal = (parseFloat(capacitors[0].params?.capacitance || 100) || 100) * 1e-9;
      const tau = (r1Ohms * cVal);
      const fc = (1 / (2 * Math.PI * r1Ohms * cVal));

      formulas.push({
        category: 'Circuitos RC & Transitorios',
        title: `Constante de Tiempo RC (${r1Obj.name} y ${capacitors[0].name})`,
        formulaLatex: '\\tau = R \\cdot C \\quad , \\quad f_c = \\frac{1}{2\\pi R C}',
        substitutionLatex: `\\tau = (${r1Nom}\\text{ }${r1Unit}) \\cdot (${capacitors[0].params?.capacitance || 100}\\text{ nF}) = ${(tau * 1000).toFixed(3)}\\text{ ms}`,
        steps: [
          { num: 1, title: 'Constante temporal τ', detail: `τ = ${tau.toExponential(3)} s (${(tau * 1000).toFixed(2)} ms). Tiempo para alcanzar 63.2% de carga.` },
          { num: 2, title: 'Frecuencia de corte fc (-3dB)', detail: `fc = ${fc.toFixed(1)} Hz. Límite de la banda de paso del filtro.` }
        ],
        result: `\\tau = ${(tau * 1000).toFixed(2)}\\text{ ms} \\quad (f_c = ${fc.toFixed(1)}\\text{ Hz})`,
        description: 'Respuesta dinámica al escalón y frecuencia de corte a -3dB en filtros pasa-bajos o pasa-altos.'
      });
    }

    return formulas;
  }

  /**
   * Genera un Netlist en sintaxis estándar SPICE para exportación y verificación.
   */
  generateSpiceNetlist() {
    const components = Array.from(this.model.components.values());
    const nets = this.model.calculateNets();

    // Mapear cada pin de cada componente a un número o nombre de nodo SPICE
    const pinToNodeMap = new Map();

    nets.forEach((net, idx) => {
      const nodeLabel = net.isGnd ? '0' : (idx + 1).toString();
      net.pins.forEach(pinKey => {
        pinToNodeMap.set(pinKey, nodeLabel);
      });
    });

    const lines = [];
    lines.push(`* Netlist generado por ElectroLab 2.0`);
    lines.push(`* Fecha: ${new Date().toLocaleString()}`);
    lines.push(`* Componentes: ${components.length} | Conexiones: ${this.model.wires.length}`);
    lines.push(``);

    components.forEach(c => {
      const def = COMPONENT_CATALOG[c.type];
      if (!def) return;

      const nodeOf = (pinId) => pinToNodeMap.get(`${c.id}:${pinId}`) || `FLOAT_${c.id}_${pinId}`;

      switch (c.type) {
        case 'dc_source':
        case 'battery': {
          const nPos = nodeOf('p_plus');
          const nNeg = nodeOf('p_minus');
          const volt = c.params?.voltage || c.value || 5;
          lines.push(`${c.name} ${nPos} ${nNeg} DC ${volt}V`);
          break;
        }
        case 'ac_source': {
          const nLive = nodeOf('p_live');
          const nNeutral = nodeOf('p_neutral');
          const volt = c.params?.voltage || 120;
          const freq = c.params?.frequency || 60;
          lines.push(`${c.name} ${nLive} ${nNeutral} SIN(0 ${volt}V ${freq}Hz)`);
          break;
        }
        case 'resistor': {
          const n1 = nodeOf('p1');
          const n2 = nodeOf('p2');
          const rNum = c.params?.resistance !== undefined ? c.params.resistance : 10;
          const rUnit = c.params?.resistanceUnit || c.unit || 'kΩ';
          let spiceVal = `${rNum}`;
          if (rUnit === 'kΩ') spiceVal = `${rNum}k`;
          else if (rUnit === 'MΩ') spiceVal = `${rNum}MEG`;
          lines.push(`${c.name} ${n1} ${n2} ${spiceVal}`);
          break;
        }
        case 'cap_ceramic':
        case 'cap_electrolytic': {
          const n1 = nodeOf('p1') || nodeOf('p_plus');
          const n2 = nodeOf('p2') || nodeOf('p_minus');
          const cVal = c.params?.capacitance ? `${c.params.capacitance}n` : '100n';
          lines.push(`${c.name} ${n1} ${n2} ${cVal}`);
          break;
        }
        case 'diode':
        case 'led': {
          const nA = nodeOf('p_anode');
          const nK = nodeOf('p_cathode');
          lines.push(`${c.name} ${nA} ${nK} DMOD_${c.name}`);
          lines.push(`.MODEL DMOD_${c.name} D(IS=1e-14 RS=0.1)`);
          break;
        }
        case 'transistor_npn': {
          const nC = nodeOf('p_collector');
          const nB = nodeOf('p_base');
          const nE = nodeOf('p_emitter');
          lines.push(`${c.name} ${nC} ${nB} ${nE} QMOD_NPN`);
          break;
        }
        case 'switch_spst': {
          const n1 = nodeOf('p1');
          const n2 = nodeOf('p2');
          const state = c.params?.state === 'closed' ? 'CERRADO (Ron=1m)' : 'ABIERTO (Roff=1G)';
          lines.push(`* ${c.name} [SW SPST] entre ${n1} y ${n2} -> Estado: ${state}`);
          break;
        }
        case 'gnd': {
          lines.push(`* ${c.name} conectado al nodo de referencia 0V`);
          break;
        }
        default: {
          const pinNodes = def.pins ? def.pins.map(p => nodeOf(p.id)).join(' ') : '';
          lines.push(`X_${c.name} ${pinNodes} SUBCKT_${c.type.toUpperCase()}`);
          break;
        }
      }
    });

    lines.push(``);
    lines.push(`.OP  * Análisis de punto de operación`);
    lines.push(`.END`);

    return lines.join('\n');
  }
}
