/**
 * ElectroLab 2.0 - Clasificador Automático de Topologías Resistivas
 * Analiza la red de interconexión real basada en nodos eléctricos (nets):
 * - Determina si el circuito es Serie Puro, Paralelo Puro, Mixto o Red General Compleja.
 * - Detecta ramas serie (nodos exclusivos de grado 2).
 * - Detecta ramas paralelo (mismo par de nodos compartidos).
 * - Genera el procedimiento de reducción paso a paso conservando identificadores.
 */

import { convertToOhms, formatOhms } from '../utils/resistorColorCode.js';

export class TopologyClassifier {
  constructor(model) {
    this.model = model;
  }

  /**
   * Clasifica la red resistiva conectada a la fuente y produce la reducción paso a paso.
   * @returns {Object} Clasificación ('SERIES', 'PARALLEL', 'MIXED', 'COMPLEX', 'NOT_APPLICABLE') y pasos.
   */
  classifyAndReduce() {
    const components = Array.from(this.model.components.values());
    const nets = this.model.calculateNets();

    const resistors = components.filter(c => c.type === 'resistor');
    const sources = components.filter(c => c.type === 'dc_source' || c.type === 'battery');

    if (resistors.length === 0 || sources.length === 0 || nets.length === 0) {
      return {
        type: 'NOT_APPLICABLE',
        typeName: 'No aplicable',
        description: 'Se requiere al menos una fuente DC y una o más resistencias conectadas para clasificar la topología.',
        steps: [],
        equivalentResistance: null
      };
    }

    if (resistors.length === 1) {
      const r = resistors[0];
      const rVal = r.params?.resistance !== undefined ? r.params.resistance : 10;
      const rUnit = r.params?.resistanceUnit || r.unit || 'kΩ';
      const ohms = convertToOhms(rVal, rUnit) || 1000;

      return {
        type: 'SINGLE',
        typeName: 'Circuito Simple (Resistencia Única)',
        description: `Circuito elemental con una sola resistencia (${r.name} de ${formatOhms(ohms)}).`,
        steps: [
          `La red consiste en una única resistencia ${r.name}. La resistencia total es directamente R_T = ${formatOhms(ohms)}.`
        ],
        equivalentResistance: ohms
      };
    }

    // Mapear cada pin a su nombre de red
    const pinToNetMap = new Map();
    nets.forEach(net => {
      net.pins.forEach(pinKey => {
        pinToNetMap.set(pinKey, net.name);
      });
    });

    // Construir grafo de resistencias
    // Cada elemento: { id, name, n1, n2, resistance, nominal, unit }
    let graphResistors = [];
    for (const r of resistors) {
      const net1 = pinToNetMap.get(`${r.id}:p1`);
      const net2 = pinToNetMap.get(`${r.id}:p2`);
      const rVal = r.params?.resistance !== undefined ? r.params.resistance : 10;
      const rUnit = r.params?.resistanceUnit || r.unit || 'kΩ';
      const ohms = convertToOhms(rVal, rUnit);

      if (!net1 || !net2 || net1 === net2 || !ohms) {
        return {
          type: 'NOT_APPLICABLE',
          typeName: 'Circuito con terminales abiertos o cortocircuitados',
          description: `La resistencia ${r.name} tiene terminales desconectados o en cortocircuito directo consigo misma.`,
          steps: [],
          equivalentResistance: null
        };
      }

      graphResistors.push({
        id: r.id,
        name: r.name,
        n1: net1,
        n2: net2,
        ohms: ohms
      });
    }

    // Identificar los nodos conectados a la fuente
    const src = sources[0];
    const srcNetPlus = pinToNetMap.get(`${src.id}:p_plus`);
    const srcNetMinus = pinToNetMap.get(`${src.id}:p_minus`);

    if (!srcNetPlus || !srcNetMinus || srcNetPlus === srcNetMinus) {
      return {
        type: 'NOT_APPLICABLE',
        typeName: 'Fuente desconectada o en cortocircuito',
        description: 'La fuente de alimentación no está conectada a dos redes eléctricas distintas.',
        steps: [],
        equivalentResistance: null
      };
    }

    // Proceso iterativo de reducción serie y paralelo
    const steps = [];
    let hadSeries = false;
    let hadParallel = false;
    let stepNumber = 1;
    let currentResistors = [...graphResistors];

    let reductionPossible = true;
    while (reductionPossible && currentResistors.length > 1) {
      reductionPossible = false;

      // 1. Buscar reducciones en paralelo (comparten los mismos dos nodos)
      let parallelPair = null;
      for (let i = 0; i < currentResistors.length; i++) {
        for (let j = i + 1; j < currentResistors.length; j++) {
          const rA = currentResistors[i];
          const rB = currentResistors[j];
          const sameNodes = (rA.n1 === rB.n1 && rA.n2 === rB.n2) || (rA.n1 === rB.n2 && rA.n2 === rB.n1);
          if (sameNodes) {
            parallelPair = { idxA: i, idxB: j };
            break;
          }
        }
        if (parallelPair) break;
      }

      if (parallelPair) {
        hadParallel = true;
        reductionPossible = true;
        const rA = currentResistors[parallelPair.idxA];
        const rB = currentResistors[parallelPair.idxB];

        const req = (rA.ohms * rB.ohms) / (rA.ohms + rB.ohms);
        const newName = `R_p(${rA.name}||${rB.name})`;

        steps.push(
          `Paso ${stepNumber++} [Reducción en Paralelo]: ${rA.name} (${formatOhms(rA.ohms)}) y ${rB.name} (${formatOhms(rB.ohms)}) comparten exactamente los mismos dos nodos (${rA.n1} y ${rA.n2}). ` +
          `R_eq = (${rA.name} · ${rB.name}) / (${rA.name} + ${rB.name}) = (${formatOhms(rA.ohms)} · ${formatOhms(rB.ohms)}) / (${formatOhms(rA.ohms + rB.ohms)}) = ${formatOhms(req)}.`
        );

        // Reemplazar la pareja por una sola resistencia equivalente
        const remaining = currentResistors.filter((_, idx) => idx !== parallelPair.idxA && idx !== parallelPair.idxB);
        remaining.push({
          id: `req_${stepNumber}`,
          name: newName,
          n1: rA.n1,
          n2: rA.n2,
          ohms: req
        });
        currentResistors = remaining;
        continue;
      }

      // 2. Buscar reducciones en serie
      // Dos resistencias están en serie si comparten un nodo que tiene grado exactamente 2
      // (conectado únicamente a rA y rB, y que NO sea el nodo positivo ni negativo de la fuente)
      let seriesPair = null;

      // Contar ocurrencias de cada nodo entre las resistencias actuales
      const nodeCounts = new Map();
      currentResistors.forEach(r => {
        nodeCounts.set(r.n1, (nodeCounts.get(r.n1) || 0) + 1);
        nodeCounts.set(r.n2, (nodeCounts.get(r.n2) || 0) + 1);
      });

      for (let i = 0; i < currentResistors.length; i++) {
        for (let j = i + 1; j < currentResistors.length; j++) {
          const rA = currentResistors[i];
          const rB = currentResistors[j];

          // Encontrar nodo común
          let commonNode = null;
          let otherNodeA = null;
          let otherNodeB = null;

          if (rA.n1 === rB.n1) { commonNode = rA.n1; otherNodeA = rA.n2; otherNodeB = rB.n2; }
          else if (rA.n1 === rB.n2) { commonNode = rA.n1; otherNodeA = rA.n2; otherNodeB = rB.n1; }
          else if (rA.n2 === rB.n1) { commonNode = rA.n2; otherNodeA = rA.n1; otherNodeB = rB.n2; }
          else if (rA.n2 === rB.n2) { commonNode = rA.n2; otherNodeA = rA.n1; otherNodeB = rB.n1; }

          if (commonNode) {
            // El nodo común debe tener grado 2 (sin otras conexiones) y no ser terminal de la fuente
            const isDegree2 = nodeCounts.get(commonNode) === 2;
            const isSourceNode = (commonNode === srcNetPlus || commonNode === srcNetMinus);

            if (isDegree2 && !isSourceNode) {
              seriesPair = { idxA: i, idxB: j, commonNode, n1: otherNodeA, n2: otherNodeB };
              break;
            }
          }
        }
        if (seriesPair) break;
      }

      if (seriesPair) {
        hadSeries = true;
        reductionPossible = true;
        const rA = currentResistors[seriesPair.idxA];
        const rB = currentResistors[seriesPair.idxB];

        const req = rA.ohms + rB.ohms;
        const newName = `R_s(${rA.name}+${rB.name})`;

        steps.push(
          `Paso ${stepNumber++} [Reducción en Serie]: ${rA.name} (${formatOhms(rA.ohms)}) y ${rB.name} (${formatOhms(rB.ohms)}) comparten el nodo intermedio ${seriesPair.commonNode} sin ninguna derivación externa ni conexión a la fuente. ` +
          `R_eq = ${rA.name} + ${rB.name} = ${formatOhms(rA.ohms)} + ${formatOhms(rB.ohms)} = ${formatOhms(req)}.`
        );

        const remaining = currentResistors.filter((_, idx) => idx !== seriesPair.idxA && idx !== seriesPair.idxB);
        remaining.push({
          id: `req_${stepNumber}`,
          name: newName,
          n1: seriesPair.n1,
          n2: seriesPair.n2,
          ohms: req
        });
        currentResistors = remaining;
      }
    }

    // Evaluar resultado final de la reducción
    if (currentResistors.length === 1) {
      const finalReq = currentResistors[0].ohms;
      let topologyType = 'MIXED';
      let typeName = 'Circuito Mixto (Serie-Paralelo Reducible)';
      let desc = 'La red se redujo sucesivamente aplicando combinaciones de ramas serie y ramas paralelo.';

      if (hadSeries && !hadParallel) {
        topologyType = 'SERIES';
        typeName = 'Circuito Serie Puro';
        desc = 'Todas las resistencias están conectadas secuencialmente formando una sola malla de corriente.';
      } else if (!hadSeries && hadParallel) {
        topologyType = 'PARALLEL';
        typeName = 'Circuito Paralelo Puro';
        desc = 'Todas las resistencias comparten exactamente el mismo par de nodos de alimentación.';
      }

      steps.push(`Resultado Final: La resistencia total equivalente de la red es R_T = ${formatOhms(finalReq)}.`);

      return {
        type: topologyType,
        typeName,
        description: desc,
        steps,
        equivalentResistance: finalReq
      };
    }

    // Si quedaron 2 o más resistencias no reducibles por serie/paralelo simple:
    return {
      type: 'COMPLEX',
      typeName: 'Red General Compleja (Puente / Mallas Cruzadas)',
      description: 'La red contiene interconexiones que no pueden reducirse mediante combinaciones elementales de serie y paralelo (como un puente de Wheatstone o red en delta-estrella). Se analiza de forma exacta mediante el motor numérico matricial MNA.',
      steps: steps.length > 0 ? steps : [
        'No se detectaron pares de resistencias con nodos exclusivos de grado 2 (serie) ni pares compartiendo los mismos dos nodos (paralelo).',
        'Se procede con la solución general de Análisis Nodal Modificado (MNA) para obtener corrientes y voltajes exactos.'
      ],
      equivalentResistance: null
    };
  }
}
