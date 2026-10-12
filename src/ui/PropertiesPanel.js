/**
 * ElectroLab 2.0 - PropertiesPanel (Inspector de Propiedades)
 * Panel lateral derecho que permite inspeccionar y editar parámetros, designadores,
 * rotación, valores eléctricos y verificar a qué red está conectado cada pin.
 * Edición no-destructiva con soporte completo para selección total, decimales y persistencia.
 */

import { COMPONENT_CATALOG } from '../model/componentCatalog.js';
import { renderComponentSymbol } from './ComponentSymbols.js';
import { convertToOhms, getResistorColorBands, formatOhms, formatSiemens, resistanceToConductance } from '../utils/resistorColorCode.js';
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

export class PropertiesPanel {
  constructor(containerElement, model, canvasEditor) {
    this.container = containerElement;
    this.model = model;
    this.canvasEditor = canvasEditor;

    this.isEditingInput = false;

    this.initDOM();
    this.render();

    this.model.on('selection', () => this.render());
    this.model.on('change', () => {
      // No re-renderizar si el usuario tiene el foco activo en un input
      if (!this.isEditingInput) {
        this.render();
      }
    });
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="properties-panel" id="properties-panel">
        <div class="panel-header">
          <div class="panel-header-title">
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>PROPIEDADES</span>
          </div>
          <span class="panel-header-badge" id="prop-context-tag">Circuito</span>
        </div>

        <div class="properties-content" id="properties-content"></div>
      </div>
    `;

    this.contentEl = this.container.querySelector('#properties-content');
    this.contextTag = this.container.querySelector('#prop-context-tag');
  }

  render() {
    if (!this.contentEl) return;
    if (this.isEditingInput) return;

    const selId = Array.from(this.model.selectedIds)[0];

    if (selId && this.model.selectionType === 'component') {
      const comp = this.model.components.get(selId);
      if (comp) {
        this.contextTag.textContent = comp.name;
        this.renderComponentProperties(comp);
        return;
      }
    }

    if (selId && this.model.selectionType === 'wire') {
      const wire = this.model.wires.find(w => w.id === selId);
      if (wire) {
        this.contextTag.textContent = 'Conductor';
        this.renderWireProperties(wire);
        return;
      }
    }

    // Nada seleccionado -> Vista global del circuito
    this.contextTag.textContent = 'Circuito';
    this.renderCircuitOverview();
  }

  renderComponentProperties(comp) {
    const def = COMPONENT_CATALOG[comp.type];
    if (!def) return;

    const symbolSvg = renderComponentSymbol(comp.type, comp, true);
    const nets = this.model.calculateNets();

    // Buscar a qué red está conectado cada pin de este componente
    const pinNetMap = {};
    if (def.pins) {
      def.pins.forEach(pin => {
        const pinKey = `${comp.id}:${pin.id}`;
        const foundNet = nets.find(n => n.pins.includes(pinKey));
        pinNetMap[pin.id] = foundNet ? foundNet.name : 'Flotante (Sin cable)';
      });
    }

    let paramsHtml = '';
    if (def.params) {
      Object.keys(def.params).forEach(paramKey => {
        const schema = def.params[paramKey];
        const currVal = comp.params?.[paramKey] !== undefined ? comp.params[paramKey] : schema.value;

        if (schema.options) {
          // Selector desplegable
          paramsHtml += `
            <div class="prop-field">
              <label class="prop-label">${schema.label}</label>
              <select class="prop-select" data-param-key="${paramKey}">
                ${schema.options.map(opt => `<option value="${opt}" ${String(opt) === String(currVal) ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          `;
        } else {
          // Campo numérico flexible tipo texto para soportar borrado total, decimales y edición libre
          paramsHtml += `
            <div class="prop-field">
              <label class="prop-label">${schema.label}</label>
              <div class="prop-input-unit-group">
                <input type="text" inputmode="decimal" class="prop-input" data-param-key="${paramKey}" value="${currVal}" autocomplete="off" />
                <span class="prop-unit">${schema.unit || ''}</span>
              </div>
            </div>
          `;
        }
      });
    }

    // Fórmulas asociadas (renderizadas con KaTeX)
    let formulasHtml = '';
    if (def.formulas && def.formulas.length > 0) {
      formulasHtml = `
        <div class="prop-section">
          <div class="prop-section-title">FÓRMULAS ASOCIADAS</div>
          <div class="prop-formulas-list">
            ${def.formulas.map(f => `
              <div class="prop-formula-card">
                <div class="formula-name">${f.name}</div>
                <div class="formula-eq">${renderMath(f.eq, true)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.contentEl.innerHTML = `
      <div class="prop-comp-header">
        <div class="prop-symbol-preview" id="prop-symbol-box">
          <svg viewBox="0 0 ${comp.width} ${comp.height}" width="48" height="48">
            ${symbolSvg}
          </svg>
        </div>
        <div class="prop-comp-meta">
          <div class="prop-comp-type">${def.name}</div>
          <div class="prop-comp-desc">${def.description}</div>
        </div>
      </div>

      <!-- Identificación y orientación -->
      <div class="prop-section">
        <div class="prop-section-title">IDENTIFICACIÓN & POSICIÓN</div>
        <div class="prop-field">
          <label class="prop-label">Designador</label>
          <input type="text" id="prop-comp-name" class="prop-input font-mono" value="${comp.name}" autocomplete="off" />
        </div>
        <div class="prop-row-split">
          <div class="prop-field">
            <label class="prop-label">Rotación</label>
            <button id="prop-rotate-btn" class="prop-btn-secondary" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>${comp.rotation}° (Girar +90°)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Parámetros eléctricos -->
      ${paramsHtml ? `
        <div class="prop-section">
          <div class="prop-section-title">PARÁMETROS ELÉCTRICOS</div>
          ${paramsHtml}
        </div>
      ` : ''}

      <!-- Sección especial: Código de Colores para Resistencias -->
      ${comp.type === 'resistor' ? (() => {
        const resVal = comp.params?.resistance !== undefined ? comp.params.resistance : 10;
        const rUnit = comp.params?.resistanceUnit || comp.unit || 'kΩ';
        const numBands = parseInt(comp.params?.bandCount, 10) || 4;
        const tolerance = parseFloat(comp.params?.tolerance) || 5;

        const ohms = convertToOhms(resVal, rUnit);
        const bands = getResistorColorBands(ohms, numBands, tolerance);
        const cond = resistanceToConductance(ohms);
        const condStr = cond !== null ? formatSiemens(cond) : 'No calculable (R ≤ 0)';

        if (bands && bands.length > 0) {
          return `
            <div class="prop-section" id="resistor-bands-section">
              <div class="prop-section-title">CÓDIGO DE COLORES (IEC 60062)</div>
              <div class="resistor-bands-badge-strip" id="resistor-bands-strip">
                ${bands.map((b) => `
                  <div class="band-tag" style="background-color: ${b.color}; color: ${b.textColor}; border: 1px solid ${b.border}">
                    <span>${b.name}</span>
                  </div>
                `).join('')}
              </div>
              <div class="prop-read-value font-mono mt-1 text-xs" id="resistor-equiv-text">
                Valor Equivalente: ${formatOhms(ohms)} (±${tolerance}%)
              </div>
            </div>

            <!-- Conductancia Eléctrica Asociada (G = 1/R) -->
            <div class="prop-section" id="resistor-conductance-section">
              <div class="prop-section-title">CONDUCTANCIA ELÉCTRICA (G)</div>
              <div class="p-2.5 rounded bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-1">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-muted">Conductancia G = 1/R:</span>
                  <span class="font-mono font-bold text-cyan-300 text-sm" id="resistor-cond-val">${condStr}</span>
                </div>
                <div class="text-[11px] text-muted font-mono" id="resistor-cond-formula">
                  G = 1 / (${formatOhms(ohms)}) = ${condStr}
                </div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="prop-section" id="resistor-bands-section">
              <div class="prop-section-title">CÓDIGO DE COLORES (IEC 60062)</div>
              <div class="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300" id="resistor-bands-strip">
                Valor fuera de rango: ingresa un valor numérico mayor a 0 para generar las bandas.
              </div>
            </div>
          `;
        }
      })() : ''}

      <!-- Terminales y Redes -->
      <div class="prop-section">
        <div class="prop-section-title">TERMINALES Y CONEXIONES</div>
        <div class="prop-pins-table">
          ${(def.pins || []).map(p => `
            <div class="prop-pin-row">
              <span class="pin-badge">${p.label}</span>
              <span class="pin-net-name ${pinNetMap[p.id].includes('Flotante') ? 'pin-floating' : 'pin-connected'}">
                ${pinNetMap[p.id]}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fórmulas -->
      ${formulasHtml}

      <!-- Acciones de componente -->
      <div class="prop-section prop-actions">
        <button id="prop-duplicate-btn" class="prop-btn-secondary mb-2" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Duplicar Componente (Ctrl+D)</span>
        </button>
        <button id="prop-delete-btn" class="prop-btn-danger" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Eliminar Componente</span>
        </button>
      </div>
    `;

    // Asignar listeners
    const nameInput = this.contentEl.querySelector('#prop-comp-name');
    if (nameInput) {
      nameInput.addEventListener('focus', () => { this.isEditingInput = true; });
      const commitName = () => {
        this.isEditingInput = false;
        const val = nameInput.value.trim().toUpperCase();
        if (val && val !== comp.name) {
          this.model.pushHistory();
          this.model.updateComponent(comp.id, { name: val });
        }
      };
      nameInput.addEventListener('blur', commitName);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          nameInput.blur();
        }
      });
    }

    const rotateBtn = this.contentEl.querySelector('#prop-rotate-btn');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        this.model.rotateComponent(comp.id, 90);
      });
    }

    const duplicateBtn = this.contentEl.querySelector('#prop-duplicate-btn');
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => {
        this.model.duplicateSelected();
      });
    }

    const deleteBtn = this.contentEl.querySelector('#prop-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.model.removeComponent(comp.id);
      });
    }

    // Inputs de parámetros numéricos (Edición no-destructiva)
    this.contentEl.querySelectorAll('.prop-input[data-param-key]').forEach(input => {
      input.addEventListener('focus', () => {
        this.isEditingInput = true;
      });

      // Previsualización reactiva de bandas y símbolo durante la escritura sin alterar el foco
      input.addEventListener('input', (e) => {
        const key = input.getAttribute('data-param-key');
        const rawStr = e.target.value.trim().replace(',', '.');
        const numVal = parseFloat(rawStr);

        if (!isNaN(numVal) && numVal > 0) {
          comp.params[key] = numVal;
          if (key === 'resistance') comp.value = numVal;

          // Actualizar previsualización de bandas de color en vivo si es resistencia
          if (comp.type === 'resistor' && (key === 'resistance' || key === 'tolerance')) {
            this.updateLiveResistorBands(comp);
          }
          // Actualizar dibujo esquemático en lienzo
          this.canvasEditor.render();
        }
      });

      // Confirmación oficial en el modelo al desenfocar o pulsar Enter
      const commitParam = () => {
        this.isEditingInput = false;
        const key = input.getAttribute('data-param-key');
        const rawStr = input.value.trim().replace(',', '.');
        const numVal = parseFloat(rawStr);

        if (!isNaN(numVal) && numVal > 0) {
          this.model.pushHistory();
          const newParams = { ...comp.params, [key]: numVal };
          const updates = { params: newParams };
          if (key === 'resistance') updates.value = numVal;
          this.model.updateComponent(comp.id, updates);
        } else {
          // Si el usuario dejó el campo vacío o inválido, restablecer al valor anterior válido
          input.value = comp.params?.[key] !== undefined ? comp.params[key] : 10;
        }
      };

      input.addEventListener('blur', commitParam);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    });

    // Selectores desplegables (unidad, bandas, tolerancia)
    this.contentEl.querySelectorAll('.prop-select[data-param-key]').forEach(select => {
      select.addEventListener('change', (e) => {
        const key = select.getAttribute('data-param-key');
        let val = e.target.value;
        if (key === 'bandCount' || key === 'tolerance') val = parseFloat(val);

        this.model.pushHistory();
        const newParams = { ...comp.params, [key]: val };
        const updates = { params: newParams };
        if (key === 'resistanceUnit') updates.unit = val;

        this.model.updateComponent(comp.id, updates);
        this.render(); // Re-renderizar para actualizar badges y fórmulas
      });
    });
  }

  updateLiveResistorBands(comp) {
    const stripEl = this.contentEl.querySelector('#resistor-bands-strip');
    const equivTextEl = this.contentEl.querySelector('#resistor-equiv-text');
    const symbolBox = this.contentEl.querySelector('#prop-symbol-box');

    const resVal = comp.params?.resistance !== undefined ? comp.params.resistance : 10;
    const rUnit = comp.params?.resistanceUnit || comp.unit || 'kΩ';
    const numBands = parseInt(comp.params?.bandCount, 10) || 4;
    const tolerance = parseFloat(comp.params?.tolerance) || 5;

    const ohms = convertToOhms(resVal, rUnit);
    const bands = getResistorColorBands(ohms, numBands, tolerance);

    if (stripEl && bands && bands.length > 0) {
      stripEl.innerHTML = bands.map((b) => `
        <div class="band-tag" style="background-color: ${b.color}; color: ${b.textColor}; border: 1px solid ${b.border}">
          <span>${b.name}</span>
        </div>
      `).join('');

      if (equivTextEl) {
        equivTextEl.textContent = `Valor Equivalente: ${formatOhms(ohms)} (±${tolerance}%)`;
      }
    }

    const condValEl = this.contentEl.querySelector('#resistor-cond-val');
    const condFormulaEl = this.contentEl.querySelector('#resistor-cond-formula');
    if (condValEl) {
      const cond = resistanceToConductance(ohms);
      const condStr = cond !== null ? formatSiemens(cond) : 'No calculable';
      condValEl.textContent = condStr;
      if (condFormulaEl) {
        condFormulaEl.textContent = `G = 1 / (${formatOhms(ohms)}) = ${condStr}`;
      }
    }

    if (symbolBox) {
      symbolBox.innerHTML = `
        <svg viewBox="0 0 ${comp.width} ${comp.height}" width="48" height="48">
          ${renderComponentSymbol(comp.type, comp, true)}
        </svg>
      `;
    }
  }

  renderWireProperties(wire) {
    const compFrom = this.model.components.get(wire.fromCompId);
    const compTo = this.model.components.get(wire.toCompId);

    const fromLabel = compFrom ? `${compFrom.name} [${wire.fromPinId}]` : wire.fromCompId;
    const toLabel = compTo ? `${compTo.name} [${wire.toPinId}]` : wire.toCompId;

    this.contentEl.innerHTML = `
      <div class="prop-section">
        <div class="prop-section-title">CONDUCTOR (WIRE)</div>
        <div class="prop-field">
          <label class="prop-label">Terminal Origen</label>
          <div class="prop-read-value font-mono">${fromLabel}</div>
        </div>
        <div class="prop-field">
          <label class="prop-label">Terminal Destino</label>
          <div class="prop-read-value font-mono">${toLabel}</div>
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-title">CODIFICACIÓN DE COLOR</div>
        <div class="prop-color-picker">
          <button class="color-dot-btn ${wire.color === '#06B6D4' ? 'is-active' : ''}" style="background-color: #06B6D4;" data-color="#06B6D4" title="Estándar / Láser Cyan"></button>
          <button class="color-dot-btn ${wire.color === '#EF4444' ? 'is-active' : ''}" style="background-color: #EF4444;" data-color="#EF4444" title="VCC (+Alimentación)"></button>
          <button class="color-dot-btn ${wire.color === '#10B981' ? 'is-active' : ''}" style="background-color: #10B981;" data-color="#10B981" title="Tierra / Retorno GND"></button>
          <button class="color-dot-btn ${wire.color === '#F59E0B' ? 'is-active' : ''}" style="background-color: #F59E0B;" data-color="#F59E0B" title="Señal / Reloj"></button>
        </div>
      </div>

      <div class="prop-section prop-actions">
        <button id="prop-delete-wire-btn" class="prop-btn-danger" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Eliminar Conexión</span>
        </button>
      </div>
    `;

    this.contentEl.querySelectorAll('.color-dot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.model.pushHistory();
        wire.color = btn.getAttribute('data-color');
        this.model.emit('change', { action: 'wireColor' });
        this.render();
      });
    });

    const delBtn = this.contentEl.querySelector('#prop-delete-wire-btn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        this.model.removeWire(wire.id);
      });
    }
  }

  renderCircuitOverview() {
    const compCount = this.model.components.size;
    const wireCount = this.model.wires.length;
    const nets = this.model.calculateNets();
    const hasGnd = Array.from(this.model.components.values()).some(c => c.type === 'gnd');

    this.contentEl.innerHTML = `
      <div class="prop-section">
        <div class="prop-section-title">RESUMEN DEL CIRCUITO</div>
        <div class="prop-stats-grid">
          <div class="prop-stat-box">
            <div class="prop-stat-num">${compCount}</div>
            <div class="prop-stat-label">Componentes</div>
          </div>
          <div class="prop-stat-box">
            <div class="prop-stat-num">${wireCount}</div>
            <div class="prop-stat-label">Conexiones</div>
          </div>
          <div class="prop-stat-box">
            <div class="prop-stat-num">${nets.length}</div>
            <div class="prop-stat-label">Redes (Nets)</div>
          </div>
          <div class="prop-stat-box">
            <div class="prop-stat-num ${hasGnd ? 'text-emerald-500' : 'text-amber-500'}">
              ${hasGnd ? 'VÁLIDO' : 'SIN GND'}
            </div>
            <div class="prop-stat-label">Ref. Tierra</div>
          </div>
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-title">ACCIONES RÁPIDAS</div>
        <div class="prop-actions-stack">
          <button id="btn-quick-center" class="prop-btn-secondary" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>Centrar Vista en Circuito</span>
          </button>
          <button id="btn-quick-clear" class="prop-btn-secondary text-rose-400" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            </svg>
            <span>Limpiar Todo el Lienzo</span>
          </button>
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-title">GUÍA RÁPIDA DE ATAJOS</div>
        <div class="prop-shortcuts-list">
          <div class="shortcut-row"><span class="kbd">R</span> <span>Rotar 90°</span></div>
          <div class="shortcut-row"><span class="kbd">Ctrl + D</span> <span>Duplicar</span></div>
          <div class="shortcut-row"><span class="kbd">Ctrl + A</span> <span>Seleccionar todo</span></div>
          <div class="shortcut-row"><span class="kbd">Supr</span> <span>Eliminar</span></div>
          <div class="shortcut-row"><span class="kbd">Ctrl + Z</span> <span>Deshacer</span></div>
          <div class="shortcut-row"><span class="kbd">Ctrl + Y</span> <span>Rehacer</span></div>
        </div>
      </div>
    `;

    const centerBtn = this.contentEl.querySelector('#btn-quick-center');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => this.canvasEditor.centerView());
    }

    const clearBtn = this.contentEl.querySelector('#btn-quick-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const tbClear = document.getElementById('tb-clear') || document.getElementById('menu-new');
        if (tbClear) {
          tbClear.click();
        } else {
          this.model.clearCircuit();
          this.canvasEditor.centerView();
        }
      });
    }
  }
}
