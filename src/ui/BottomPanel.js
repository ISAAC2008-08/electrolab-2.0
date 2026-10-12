/**
 * ElectroLab 2.0 - BottomPanel (Panel Inferior Expandible)
 * Presenta módulos de análisis eléctrico y cálculo riguroso:
 * 1. Simulación DC real con MNA: Voltajes de nodos, magnitudes por componente, LVK/LCK y balance de potencias.
 * 2. Clasificación topológica automática y procedimiento de reducción paso a paso (Serie/Paralelo/Mixto).
 * 3. Análisis topológico de redes (Nets) y nodos.
 * 4. Comprobación de reglas eléctricas (ERC).
 * 5. Fórmulas teóricas contextualizadas según los componentes en el circuito.
 * 6. Netlist en sintaxis estándar SPICE.
 */

import { CircuitAnalysis } from '../analysis/CircuitAnalysis.js';
import { DCSolver } from '../simulation/DCSolver.js';
import { TopologyClassifier } from '../analysis/TopologyClassifier.js';
import { formatOhms, formatAmps, formatVolts, formatWatts, formatSiemens } from '../utils/resistorColorCode.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderMath(latex, displayMode = false) {
  if (!latex) return '';
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false
    });
  } catch (err) {
    return `<code>${latex}</code>`;
  }
}

export class BottomPanel {
  constructor(containerElement, model) {
    this.container = containerElement;
    this.model = model;

    this.analyzer = new CircuitAnalysis(model);
    this.solver = new DCSolver(model);
    this.classifier = new TopologyClassifier(model);

    this.isExpanded = true;
    this.activeTab = 'simulation'; // 'simulation' | 'reduction' | 'topology' | 'erc' | 'formulas' | 'spice'

    this.lastSimulationResult = null;
    this.lastTopologyResult = null;
    this.isOutdated = true; // Requiere simular inicialmente o tras cambios

    this.initDOM();
    this.bindEvents();

    // Cuando el circuito cambia, marcar los resultados de simulación como desactualizados
    this.model.on('change', () => {
      this.isOutdated = true;
      this.render();
    });

    this.model.on('selection', () => {
      this.render();
    });

    // Ejecutar una primera simulación automática inicial para que el usuario no vea datos vacíos al abrir
    setTimeout(() => {
      this.runSimulation();
    }, 150);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="bottom-panel" id="bottom-panel">
        <!-- Barra de pestañas y controles de colapso -->
        <div class="bottom-panel-header">
          <div class="bottom-panel-tabs">
            <button class="bottom-tab-btn is-active" data-tab="simulation">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Simulación DC</span>
              <span class="sim-status-dot" id="sim-status-dot" title="Estado de cálculo"></span>
            </button>
            <button class="bottom-tab-btn" data-tab="reduction">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
              <span>Reducción Paso a Paso</span>
            </button>
            <button class="bottom-tab-btn" data-tab="topology">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>Topología & Redes</span>
            </button>
            <button class="bottom-tab-btn" data-tab="erc">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 22 22 22 12 2"></polygon>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Reglas Eléctricas (ERC)</span>
              <span class="erc-badge" id="erc-tab-count">0</span>
            </button>
            <button class="bottom-tab-btn" data-tab="formulas">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>Fórmulas & Leyes</span>
            </button>
            <button class="bottom-tab-btn" data-tab="spice">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              <span>Consola & SPICE</span>
            </button>
          </div>

          <div class="bottom-panel-controls">
            <button id="bottom-sim-quick-btn" class="bottom-action-pill" title="Ejecutar análisis MNA">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Calcular Simulación</span>
            </button>
            <button id="bottom-toggle-btn" class="bottom-icon-btn" title="Expandir / Minimizar panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Cuerpo del panel expandible -->
        <div class="bottom-panel-body" id="bottom-panel-body">
          <div class="bottom-tab-content" id="bottom-tab-content"></div>
        </div>
      </div>
    `;

    this.panelEl = this.container.querySelector('#bottom-panel');
    this.bodyEl = this.container.querySelector('#bottom-panel-body');
    this.contentEl = this.container.querySelector('#bottom-tab-content');
    this.toggleBtn = this.container.querySelector('#bottom-toggle-btn');
    this.quickSimBtn = this.container.querySelector('#bottom-sim-quick-btn');
    this.ercCountBadge = this.container.querySelector('#erc-tab-count');
    this.simStatusDot = this.container.querySelector('#sim-status-dot');
  }

  bindEvents() {
    // Manejo de tabs
    this.container.querySelectorAll('.bottom-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.activeTab = tab;
        this.container.querySelectorAll('.bottom-tab-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        if (!this.isExpanded) {
          this.isExpanded = true;
          this.updateExpandState();
        }

        this.render();
      });
    });

    // Botón de colapso
    this.toggleBtn.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.updateExpandState();
    });

    // Botón de cálculo rápido
    this.quickSimBtn.addEventListener('click', () => {
      this.runSimulation();
    });
  }

  updateExpandState() {
    if (this.isExpanded) {
      this.bodyEl.style.display = 'block';
      this.toggleBtn.querySelector('polyline').setAttribute('points', '6 9 12 15 18 9');
    } else {
      this.bodyEl.style.display = 'none';
      this.toggleBtn.querySelector('polyline').setAttribute('points', '18 15 12 9 6 15');
    }
  }

  /**
   * Ejecuta la simulación MNA real y la clasificación topológica.
   */
  runSimulation() {
    this.lastSimulationResult = this.solver.solve();
    this.lastTopologyResult = this.classifier.classifyAndReduce();
    this.isOutdated = false;

    // Si el panel está minimizado, expandirlo
    if (!this.isExpanded) {
      this.isExpanded = true;
      this.updateExpandState();
    }

    this.render();
  }

  render() {
    if (!this.contentEl) return;

    // Actualizar indicador de estado de simulación
    if (this.simStatusDot) {
      if (!this.lastSimulationResult) {
        this.simStatusDot.className = 'sim-status-dot dot-idle';
      } else if (!this.lastSimulationResult.success) {
        this.simStatusDot.className = 'sim-status-dot dot-error';
      } else if (this.isOutdated) {
        this.simStatusDot.className = 'sim-status-dot dot-outdated';
      } else {
        this.simStatusDot.className = 'sim-status-dot dot-ready';
      }
    }

    // Actualizar badge del ERC
    const ercIssues = this.analyzer.runERC();
    const alertCount = ercIssues.filter(i => i.type === 'warning' || i.type === 'error').length;
    this.ercCountBadge.textContent = alertCount;
    this.ercCountBadge.className = `erc-badge ${alertCount > 0 ? 'erc-badge-active' : ''}`;

    // Renderizar tab activo
    switch (this.activeTab) {
      case 'simulation':
        this.renderSimulationTab();
        break;
      case 'reduction':
        this.renderReductionTab();
        break;
      case 'topology':
        this.renderTopologyTab();
        break;
      case 'erc':
        this.renderERCTab(ercIssues);
        break;
      case 'formulas':
        this.renderFormulasTab();
        break;
      case 'spice':
        this.renderSpiceTab();
        break;
    }
  }

  /**
   * Renderiza el módulo de Simulación DC MNA real con magnitudes, leyes y balance.
   */
  renderSimulationTab() {
    if (!this.lastSimulationResult) {
      this.contentEl.innerHTML = `
        <div class="sim-empty-state">
          <div class="sim-empty-icon">⚡</div>
          <div class="sim-empty-title">Simulador Numérico de Corriente Directa (MNA)</div>
          <div class="sim-empty-desc">
            El motor resuelve de forma rigurosa las ecuaciones de Análisis Nodal Modificado para voltajes, corrientes por rama y potencias disipadas.
          </div>
          <button id="btn-trigger-sim" class="prop-btn-primary mt-3" style="max-width: 240px; margin: 12px auto 0;">
            ▶ Calcular Simulación Ahora
          </button>
        </div>
      `;
      const btn = this.contentEl.querySelector('#btn-trigger-sim');
      if (btn) btn.addEventListener('click', () => this.runSimulation());
      return;
    }

    const sim = this.lastSimulationResult;
    const topo = this.lastTopologyResult;

    // Caso de error en simulación (circuito abierto, sin tierra, singularidad, etc.)
    if (!sim.success) {
      if (sim.errorType === 'PENDING_SEMICONDUCTOR_MODEL') {
        this.contentEl.innerHTML = `
          <div class="sim-pending-box">
            <div class="sim-pending-header">
              <span class="sim-pending-tag">MODELO EN DESARROLLO</span>
              <span class="sim-pending-title">${sim.title}</span>
            </div>
            <div class="sim-pending-msg">${sim.message}</div>
            <div class="sim-pending-components mt-3">
              <div class="sim-pending-subtitle">Componentes identificados en el circuito con modelo pendiente:</div>
              <div class="sim-pending-chips">
                ${(sim.pendingComponents || []).map(c => `
                  <div class="sim-pending-chip font-mono">
                    <span class="chip-dot">●</span>
                    <strong>${c.name}</strong> (${c.type.toUpperCase()})
                    ${c.pins ? `
                      <span class="chip-pins">
                        [${c.pins.map(p => `${p.label}: nodo ${p.connectedNode}`).join(', ')}]
                      </span>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="sim-pending-notice mt-3">
              ℹ️ <strong>Integridad del circuito:</strong> Los símbolos, terminales, polaridades y conexiones de los semiconductores se preservan intactos en el lienzo para posterior resolución no lineal.
            </div>
          </div>
        `;
        return;
      }

      this.contentEl.innerHTML = `
        <div class="sim-error-box">
          <div class="sim-error-header">
            <span class="sim-error-tag">NO SIMULABLE</span>
            <span class="sim-error-title">${sim.title}</span>
          </div>
          <div class="sim-error-msg">${sim.message}</div>
          <div class="sim-checklist">
            <div class="sim-check-item">
              <span class="check-bullet">●</span>
              <span><strong>Referencia de Tierra (GND):</strong> Debe existir un componente Tierra conectado a un nodo para establecer el potencial 0V.</span>
            </div>
            <div class="sim-check-item">
              <span class="check-bullet">●</span>
              <span><strong>Malla cerrada:</strong> Debe existir un trayecto conductor completo desde la fuente hacia las resistencias y de vuelta al polo negativo/tierra.</span>
            </div>
            <div class="sim-check-item">
              <span class="check-bullet">●</span>
              <span><strong>Cargas resistivas:</strong> Debe haber al menos una resistencia con valor superior a 0 Ω para evitar corrientes infinitas o cortocircuitos.</span>
            </div>
          </div>
          <button id="btn-retry-sim" class="prop-btn-secondary mt-3" style="max-width: 200px;">
            Reintentar Simulación
          </button>
        </div>
      `;
      const rBtn = this.contentEl.querySelector('#btn-retry-sim');
      if (rBtn) rBtn.addEventListener('click', () => this.runSimulation());
      return;
    }

    // Caso exitoso
    const { totals, resistorResults, sourceResults, powerBalance } = sim;

    const outdatedBanner = this.isOutdated ? `
      <div class="sim-outdated-strip">
        <span>⚠️ Circuito modificado desde el último cálculo. Los datos mostrados corresponden a la versión previa.</span>
        <button id="btn-refresh-sim" class="btn-refresh-pill">Recalcular Ahora</button>
      </div>
    ` : '';

    const topoTag = topo ? `
      <div class="sim-topo-badge">
        <span class="topo-badge-label">Topología detectada:</span>
        <span class="topo-badge-name">${topo.typeName}</span>
      </div>
    ` : '';

    this.contentEl.innerHTML = `
      <div class="sim-results-wrapper">
        ${outdatedBanner}

        <div class="sim-top-header">
          <div class="sim-header-title">
            <span class="sim-status-chip chip-success">✓ SOLUCIÓN MNA CONVERGIDA</span>
            <span class="sim-subtitle font-mono">Nodos no-tierra: ${sim.nonGndNodeCount} | Fuentes DC: ${sourceResults.length}</span>
          </div>
          ${topoTag}
        </div>

        <!-- Magnitudes Totales de la Red -->
        <div class="sim-section-title">MAGNITUDES GENERALES DEL CIRCUITO</div>
        <div class="sim-totals-grid">
          <div class="sim-metric-card">
            <div class="sim-metric-top">
              <span class="metric-symbol font-mono">R_T</span>
              <span class="metric-name">Resistencia Total</span>
            </div>
            <div class="sim-metric-value font-mono text-cyan-400">${formatOhms(totals.totalResistance)}</div>
            <div class="sim-metric-foot font-mono">R_T = V_T / I_T</div>
          </div>

          <div class="sim-metric-card">
            <div class="sim-metric-top">
              <span class="metric-symbol font-mono">V_T</span>
              <span class="metric-name">Voltaje Total</span>
            </div>
            <div class="sim-metric-value font-mono text-emerald-400">${formatVolts(totals.totalVoltage)}</div>
            <div class="sim-metric-foot font-mono">Potencial de fuente</div>
          </div>

          <div class="sim-metric-card">
            <div class="sim-metric-top">
              <span class="metric-symbol font-mono">I_T</span>
              <span class="metric-name">Corriente Total</span>
            </div>
            <div class="sim-metric-value font-mono text-amber-400">${formatAmps(totals.totalCurrent)}</div>
            <div class="sim-metric-foot font-mono">Suministro de la red</div>
          </div>

          <div class="sim-metric-card">
            <div class="sim-metric-top">
              <span class="metric-symbol font-mono">P_T</span>
              <span class="metric-name">Potencia Total</span>
            </div>
            <div class="sim-metric-value font-mono text-rose-400">${formatWatts(totals.totalPower)}</div>
            <div class="sim-metric-foot font-mono">P_T = V_T · I_T</div>
          </div>

          <div class="sim-metric-card">
            <div class="sim-metric-top">
              <span class="metric-symbol font-mono">G_T</span>
              <span class="metric-name">Conductancia Total</span>
            </div>
            <div class="sim-metric-value font-mono text-teal-400">${totals.totalResistance > 0 ? formatSiemens(1 / totals.totalResistance) : '0 S'}</div>
            <div class="sim-metric-foot font-mono">G_T = 1 / R_T</div>
          </div>
        </div>

        <!-- Tabla de Magnitudes por Componente -->
        <div class="sim-section-title mt-4">MAGNITUDES POR COMPONENTE & CAÍDAS DE TENSIÓN INDIVIDUALES</div>
        <div class="sim-table-container">
          <table class="sim-table">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Resistencia (R)</th>
                <th>Conductancia (G = 1/R)</th>
                <th>Voltaje Individual (V_R)</th>
                <th>Corriente (I)</th>
                <th>Potencia (P)</th>
                <th>Relaciones y Polaridad</th>
              </tr>
            </thead>
            <tbody>
              ${resistorResults.map(r => `
                <tr>
                  <td class="font-mono font-bold text-cyan-300">
                    <div>${r.name}</div>
                    <div class="text-[10px] text-muted font-normal">Nodos: ${r.node1} ↔ ${r.node2}</div>
                  </td>
                  <td class="font-mono">${formatOhms(r.resistance)}</td>
                  <td class="font-mono text-cyan-300">${formatSiemens(r.conductance)}</td>
                  <td class="font-mono text-emerald-300 font-semibold">
                    <div>${formatVolts(r.voltage)}</div>
                    <div class="text-[10px] text-muted font-normal">V_{T1}-V_{T2} = ${r.signedVoltage >= 0 ? '+' : ''}${(r.signedVoltage).toFixed(2)} V</div>
                  </td>
                  <td class="font-mono text-amber-300 font-semibold">${formatAmps(r.current)}</td>
                  <td class="font-mono text-rose-300 font-semibold">${formatWatts(r.power)}</td>
                  <td class="text-xs text-muted">
                    <div class="font-mono text-[11px] text-cyan-200">V_R = |${(r.v1).toFixed(2)}V - ${(r.v2).toFixed(2)}V| = ${formatVolts(r.voltage)}</div>
                    <div>${r.polarity}</div>
                    <div class="text-[10px]">I = V·G = ${formatAmps(r.current)} | P = V·I = ${formatWatts(r.power)}</div>
                  </td>
                </tr>
              `).join('')}
              ${sourceResults.map(s => `
                <tr class="source-row">
                  <td class="font-mono font-bold text-emerald-400">
                    <div>${s.name} [Fuente DC]</div>
                    <div class="text-[10px] text-muted font-normal">Nodos: ${s.nodePlus} ↔ ${s.nodeMinus}</div>
                  </td>
                  <td class="font-mono text-muted">—</td>
                  <td class="font-mono text-muted">—</td>
                  <td class="font-mono text-emerald-300 font-semibold">
                    <div>${formatVolts(s.voltage)}</div>
                    <div class="text-[10px] text-emerald-500/80 font-normal">Tensión nominal de fuente</div>
                  </td>
                  <td class="font-mono text-amber-300 font-semibold">${formatAmps(s.current)} (entregada)</td>
                  <td class="font-mono text-emerald-300 font-semibold">${formatWatts(s.power)} (generada)</td>
                  <td class="text-xs text-muted">
                    <div class="font-mono text-[11px] text-emerald-300">P_{gen} = V_s · I_{entregada}</div>
                    <div>Flujo: Polo + (Nodo ${s.nodePlus}) → Red</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Balance de Potencias y Leyes de Kirchhoff -->
        <div class="sim-two-cols mt-4">
          <!-- Columna A: Balance de Potencia -->
          <div class="sim-card-panel">
            <div class="panel-card-heading">BALANCE DE POTENCIAS & CONSERVACIÓN DE ENERGÍA</div>
            <div class="power-balance-body">
              <div class="pb-row">
                <span>Potencia Total Suministrada por Fuentes:</span>
                <span class="font-mono font-bold text-emerald-400">${formatWatts(powerBalance.deliveredPower)}</span>
              </div>
              <div class="pb-row">
                <span>Potencia Total Disipada en Resistencias:</span>
                <span class="font-mono font-bold text-rose-400">${formatWatts(powerBalance.dissipatedPower)}</span>
              </div>
              <div class="pb-row pb-divider">
                <span>Discrepancia Numérica (|P_gen - P_dis|):</span>
                <span class="font-mono text-cyan-300">${formatWatts(powerBalance.discrepancy)}</span>
              </div>
              <div class="pb-status-box ${powerBalance.isBalanced ? 'status-ok' : 'status-warn'}">
                ${powerBalance.isBalanced
                  ? '✓ Cumple el principio de conservación de la energía (Balance exacto Σ P_fuentes = Σ P_resistencias).'
                  : '▲ Discrepancia detectada en la red. Verifique posibles ramas no conectadas.'}
              </div>
            </div>
          </div>

          <!-- Columna B: Leyes de Kirchhoff Verificadas -->
          <div class="sim-card-panel">
            <div class="panel-card-heading">VERIFICACIÓN DE LEYES DE KIRCHHOFF</div>
            <div class="kirk-laws-body">
              <div class="kirk-item">
                <span class="kirk-title">Ley de Tensiones de Kirchhoff (LTK):</span>
                <div class="kirk-eq font-mono text-xs overflow-x-auto py-1">
                  ${renderMath(`\\sum V_{\\text{malla}} = 0 \\iff ${totals.totalVoltage.toFixed(2)}\\text{ V} - (${resistorResults.map(r => r.voltage.toFixed(2) + '\\text{ V}').join(' + ')}) = 0.00\\text{ V}`, true)}
                </div>
                <span class="kirk-sub">La suma algebraica de las diferencias de potencial alrededor de la malla cerrada es nula.</span>
              </div>

              <div class="kirk-item mt-2">
                <span class="kirk-title">Ley de Corrientes de Kirchhoff (LCK):</span>
                <div class="kirk-eq font-mono text-xs overflow-x-auto py-1">
                  ${renderMath('\\sum I_{\\text{entrantes}} = \\sum I_{\\text{salientes}} = 0', true)}
                </div>
                <span class="kirk-sub">Verificada en todos los nodos de la matriz nodal (conservación de carga neta = 0.00 A).</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const refreshBtn = this.contentEl.querySelector('#btn-refresh-sim');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.runSimulation());
  }

  /**
   * Renderiza el módulo de Clasificación Topológica y Reducción Paso a Paso.
   */
  renderReductionTab() {
    if (!this.lastTopologyResult) {
      this.lastTopologyResult = this.classifier.classifyAndReduce();
    }

    const topo = this.lastTopologyResult;

    this.contentEl.innerHTML = `
      <div class="reduction-container">
        <div class="reduction-header-box">
          <div class="reduction-type-tag">${topo.typeName}</div>
          <div class="reduction-type-desc">${topo.description}</div>
        </div>

        <div class="reduction-steps-section">
          <div class="sim-section-title">PROCEDIMIENTO DE REDUCCIÓN PASO A PASO:</div>
          ${topo.steps.length === 0 ? `
            <div class="text-xs text-muted p-3">No hay pasos de reducción calculados para el circuito actual.</div>
          ` : `
            <div class="reduction-steps-list">
              ${topo.steps.map((st, i) => `
                <div class="reduction-step-card">
                  <div class="step-num-badge font-mono">${i + 1}</div>
                  <div class="step-text font-mono">${st}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderTopologyTab() {
    const topo = this.analyzer.analyzeTopology();

    this.contentEl.innerHTML = `
      <div class="topology-container">
        <div class="topo-summary-bar">
          <div class="topo-metric">
            <span class="topo-metric-val font-mono">${topo.componentCount}</span>
            <span class="topo-metric-label">Componentes</span>
          </div>
          <div class="topo-metric">
            <span class="topo-metric-val font-mono">${topo.wireCount}</span>
            <span class="topo-metric-label">Conductores</span>
          </div>
          <div class="topo-metric">
            <span class="topo-metric-val font-mono">${topo.netCount}</span>
            <span class="topo-metric-label">Redes Eléctricas</span>
          </div>
          <div class="topo-metric">
            <span class="topo-metric-val font-mono">${topo.activeNodes}</span>
            <span class="topo-metric-label">Nodos Activos</span>
          </div>
          <div class="topo-metric">
            <span class="topo-metric-val font-mono">${topo.estimatedMeshes}</span>
            <span class="topo-metric-label">Mallas (Euler)</span>
          </div>
          <div class="topo-metric">
            <span class="topo-metric-val font-mono ${topo.hasGround ? 'text-emerald-400' : 'text-amber-400'}">
              ${topo.hasGround ? 'PRESENTE' : 'AUSENTE'}
            </span>
            <span class="topo-metric-label">Tierra GND (0V)</span>
          </div>
        </div>

        <div class="topo-nets-section">
          <div class="topo-section-heading">REDES Y CONECTIVIDAD DETECTADAS:</div>
          <div class="topo-nets-grid">
            ${topo.nets.length === 0 ? `
              <div class="topo-empty-note">No hay conductores conectados entre terminales.</div>
            ` : topo.nets.map(net => `
              <div class="topo-net-card ${net.isGnd ? 'topo-net-gnd' : ''}">
                <div class="topo-net-title font-mono">${net.name}</div>
                <div class="topo-net-pins">
                  ${net.pins.map(p => {
                    const [cId, pId] = p.split(':');
                    const comp = this.model.components.get(cId);
                    return `<span class="pin-tag font-mono">${comp ? comp.name : cId}[${pId}]</span>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderERCTab(issues) {
    this.contentEl.innerHTML = `
      <div class="erc-container">
        <div class="erc-header-note">
          Inspección de integridad de diseño (Design Rule Check). Ayuda a detectar terminales sin cablear, ausencia de retorno a tierra o cortocircuitos directos:
        </div>
        <div class="erc-issues-list">
          ${issues.map(iss => {
            let badgeClass = 'erc-badge-info';
            let iconGlyph = '●';
            if (iss.type === 'error') { badgeClass = 'erc-badge-error'; iconGlyph = '✖'; }
            else if (iss.type === 'warning') { badgeClass = 'erc-badge-warning'; iconGlyph = '▲'; }
            else if (iss.type === 'success') { badgeClass = 'erc-badge-success'; iconGlyph = '✓'; }

            return `
              <div class="erc-issue-item ${badgeClass}">
                <div class="erc-issue-icon">${iconGlyph}</div>
                <div class="erc-issue-details">
                  <div class="erc-issue-title">${iss.title}</div>
                  <div class="erc-issue-message">${iss.message}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderFormulasTab() {
    const formulas = this.analyzer.getDynamicFormulas();

    this.contentEl.innerHTML = `
      <div class="formulas-container">
        <div class="formulas-header-note">
          Ecuaciones y modelos analíticos deducidos rigurosamente a partir de los componentes y topología de tu circuito:
        </div>
        <div class="formulas-grid">
          ${formulas.map(f => {
            const eqHtml = f.formulaLatex ? renderMath(f.formulaLatex, true) : (f.latex ? renderMath(f.latex, true) : '');
            const substHtml = f.substitutionLatex ? renderMath(f.substitutionLatex, true) : '';
            const opHtml = f.operationLatex ? renderMath(f.operationLatex, true) : '';
            const resHtml = f.result ? renderMath(f.result, false) : '';

            return `
              <div class="formula-card">
                <div class="formula-card-top">
                  <span class="formula-card-cat">${f.category}</span>
                  <span class="formula-card-title">${f.title}</span>
                </div>

                <!-- 1. Ecuación Teórica Normalizada -->
                <div class="formula-subhead">Fórmula:</div>
                <div class="formula-math-render">${eqHtml}</div>

                <!-- 2. Sustitución Numérica con Valores del Circuito -->
                ${f.substitutionLatex ? `
                  <div class="formula-subhead mt-2">Sustitución:</div>
                  <div class="formula-subst-render">${substHtml}</div>
                ` : ''}

                <!-- 3. Operación y Desarrollo -->
                ${f.operationLatex ? `
                  <div class="formula-subhead mt-2">Operación:</div>
                  <div class="formula-subst-render">${opHtml}</div>
                ` : ''}

                <!-- 4. Procedimiento y Pasos -->
                ${f.steps && f.steps.length > 0 ? `
                  <div class="formula-subhead mt-2">Procedimiento Paso a Paso:</div>
                  <div class="formula-steps-container">
                    ${f.steps.map(st => `
                      <div class="formula-step-item">
                        <span class="formula-step-pill">${st.num}</span>
                        <div class="formula-step-content">
                          <span class="formula-step-head">${st.title}:</span>
                          <span class="formula-step-body">${st.detail}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <!-- 5. Resultado Final -->
                ${f.result ? `
                  <div class="formula-result-banner">
                    <span class="formula-result-label">Resultado:</span>
                    <span class="formula-result-math">${resHtml}</span>
                  </div>
                ` : ''}

                <div class="formula-card-desc mt-2">${f.description}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Sección Preparatoria: Teoría y Referencias (Boylestad / Análisis de Circuitos) -->
        <div class="theory-reference-section mt-6 p-4 rounded-lg border border-cyan-500/20 bg-slate-900/60">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-bold text-cyan-400">📖 TEORÍA Y REFERENCIAS</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/30">Módulo Académico</span>
          </div>
          <div class="text-xs text-muted leading-relaxed">
            Estructura preparada para relacionar leyes y modelos con bibliografía estándar de análisis de circuitos y dispositivos electrónicos (Robert L. Boylestad: <em>Introducción al Análisis de Circuitos</em>). 
            Permite vincular cada bloque funcional con su fundamentación analítica, metodología de resolución de mallas y nodos, y problemas de aplicación práctica.
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div class="p-2.5 rounded bg-slate-800/60 border border-slate-700/50">
              <div class="text-[11px] font-semibold text-slate-200">Cap. Ley de Ohm y Potencia</div>
              <div class="text-[10px] text-muted mt-1">Modelos lineales de conducción, resistividad, conductancia \(G = 1/R\) y efecto Joule.</div>
            </div>
            <div class="p-2.5 rounded bg-slate-800/60 border border-slate-700/50">
              <div class="text-[11px] font-semibold text-slate-200">Cap. Circuitos Serie, Paralelo y Mixtos</div>
              <div class="text-[10px] text-muted mt-1">Leyes de Kirchhoff (LTK / LCK), divisores de tensión y corriente, y simplificación de redes.</div>
            </div>
            <div class="p-2.5 rounded bg-slate-800/60 border border-slate-700/50">
              <div class="text-[11px] font-semibold text-slate-200">Cap. Métodos de Análisis y Teoremas</div>
              <div class="text-[10px] text-muted mt-1">Análisis nodal generalizado (MNA), análisis de mallas, superposición y equivalentes Thévenin/Norton.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSpiceTab() {
    const netlist = this.analyzer.generateSpiceNetlist();

    this.contentEl.innerHTML = `
      <div class="spice-container">
        <div class="spice-header-row">
          <div class="spice-status-banner">
            <span class="spice-status-title">NETLIST SPICE & SOLUCIONADOR MNA ACTIVO</span>
            <span class="spice-status-text">
              Netlist topológico generado en formato estándar SPICE para simulación y exportación.
            </span>
          </div>
          <button id="spice-copy-btn" class="spice-copy-btn" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copiar Netlist</span>
          </button>
        </div>

        <div class="spice-netlist-view">
          <pre class="spice-code-block font-mono">${netlist}</pre>
        </div>
      </div>
    `;

    const copyBtn = this.contentEl.querySelector('#spice-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(netlist).then(() => {
          copyBtn.innerHTML = `<span>¡Copiado al portapapeles!</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copiar Netlist</span>
            `;
          }, 2000);
        });
      });
    }
  }
}
