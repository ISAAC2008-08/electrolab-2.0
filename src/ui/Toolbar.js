/**
 * ElectroLab 2.0 - Toolbar & MenuBar
 * Menús desplegables superiores (Archivo, Editar, Ver, Herramientas, Análisis, Simular)
 * y barra de herramientas rápida con selector de temas (Oscuro/Claro).
 */

import { PREBUILT_CIRCUITS } from '../examples/prebuiltCircuits.js';

export class Toolbar {
  constructor(containerElement, model, canvasEditor, bottomPanel) {
    this.container = containerElement;
    this.model = model;
    this.canvasEditor = canvasEditor;
    this.bottomPanel = bottomPanel;

    this.activeMenu = null;
    this.currentTheme = localStorage.getItem('electrolab-theme') || 'dark';

    this.initDOM();
    this.bindEvents();
    this.applyTheme(this.currentTheme);

    this.model.on('history', (state) => this.updateHistoryButtons(state));
    this.model.on('tool', () => this.updateToolButtons());
  }

  initDOM() {
    this.container.innerHTML = `
      <header class="app-topbar">
        <!-- Zona 1: Marca y Menú de Escritorio -->
        <div class="topbar-left">
          <div class="brand-lockup">
            <svg class="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="2.2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            <span class="brand-title">ElectroLab <span class="brand-ver">2.0</span></span>
          </div>

          <!-- Barra de Menús Desplegables Clásica de CAD -->
          <nav class="desktop-menu-bar">
            <!-- Menú Archivo -->
            <div class="menu-item-wrapper" data-menu="archivo">
              <button class="menu-trigger-btn" type="button">Archivo</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-new">Nuevo Circuito <span class="menu-shortcut">Ctrl+N</span></button>
                <button class="menu-action" id="menu-save-json">Guardar Circuito (JSON)... <span class="menu-shortcut">Ctrl+S</span></button>
                <button class="menu-action" id="menu-open-json">Abrir Circuito (JSON)... <span class="menu-shortcut">Ctrl+O</span></button>
                <div class="menu-divider"></div>
                <div class="menu-submenu-title">Cargar Ejemplos:</div>
                ${PREBUILT_CIRCUITS.map(ex => `
                  <button class="menu-action menu-example-btn" data-example-id="${ex.id}">${ex.name}</button>
                `).join('')}
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-export-spice">Exportar Netlist SPICE (.cir)</button>
              </div>
            </div>

            <!-- Menú Editar -->
            <div class="menu-item-wrapper" data-menu="editar">
              <button class="menu-trigger-btn" type="button">Editar</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-undo">Deshacer <span class="menu-shortcut">Ctrl+Z</span></button>
                <button class="menu-action" id="menu-redo">Rehacer <span class="menu-shortcut">Ctrl+Y</span></button>
                <button class="menu-action" id="menu-duplicate">Duplicar Selección <span class="menu-shortcut">Ctrl+D</span></button>
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-rotate">Rotar 90° <span class="menu-shortcut">R</span></button>
                <button class="menu-action" id="menu-delete">Eliminar Seleccionado <span class="menu-shortcut">Supr</span></button>
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-select-all">Seleccionar Todos <span class="menu-shortcut">Ctrl+A</span></button>
                <button class="menu-action" id="menu-clear-sel">Deseleccionar <span class="menu-shortcut">Esc</span></button>
              </div>
            </div>

            <!-- Menú Ver -->
            <div class="menu-item-wrapper" data-menu="ver">
              <button class="menu-trigger-btn" type="button">Ver</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-toggle-library">Alternar Biblioteca <span class="menu-shortcut">Ctrl+B</span></button>
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-center">Centrar Vista</button>
                <button class="menu-action" id="menu-zoom-in">Acercar Zoom (+)</button>
                <button class="menu-action" id="menu-zoom-out">Alejar Zoom (-)</button>
                <button class="menu-action" id="menu-zoom-100">Restablecer 100%</button>
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-toggle-grid-type">Alternar Cuadrícula (Puntos / Líneas)</button>
                <button class="menu-action" id="menu-toggle-snap">Ajuste a Cuadrícula (Snap)</button>
              </div>
            </div>

            <!-- Menú Herramientas -->
            <div class="menu-item-wrapper" data-menu="herramientas">
              <button class="menu-trigger-btn" type="button">Herramientas</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-tool-select">Puntero de Selección</button>
                <button class="menu-action" id="menu-tool-wire">Trazar Conductor / Cable <span class="menu-shortcut">W</span></button>
                <button class="menu-action" id="menu-tool-node">Insertar Nodo de Conexión <span class="menu-shortcut">N</span></button>
                <button class="menu-action" id="menu-tool-delete">Modo Borrador</button>
              </div>
            </div>

            <!-- Menú Análisis -->
            <div class="menu-item-wrapper" data-menu="analisis">
              <button class="menu-trigger-btn" type="button">Análisis</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-show-formulas">Fórmulas & Leyes de Kirchhoff</button>
                <button class="menu-action" id="menu-show-topo">Topología de Redes y Nodos</button>
                <button class="menu-action" id="menu-show-erc">Comprobación de Reglas (ERC)</button>
              </div>
            </div>

            <!-- Menú Simular -->
            <div class="menu-item-wrapper" data-menu="simular">
              <button class="menu-trigger-btn" type="button">Simular</button>
              <div class="menu-dropdown">
                <button class="menu-action" id="menu-run-simulation">▶ Ejecutar Simulación DC (MNA)</button>
                <button class="menu-action" id="menu-show-reduction">Clasificación y Reducción Paso a Paso</button>
                <div class="menu-divider"></div>
                <button class="menu-action" id="menu-show-spice">Generar Netlist SPICE (.cir)</button>
              </div>
            </div>
          </nav>
        </div>

        <!-- Zona 2: Botones Rápidos de Acción en Barra -->
        <div class="topbar-actions">
          <!-- Alternar Biblioteca Lateral -->
          <div class="btn-group">
            <button id="tb-toggle-library" class="topbar-btn is-active" title="Mostrar/Ocultar Biblioteca de Componentes (Ctrl+B)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>

          <div class="topbar-divider"></div>

          <!-- Deshacer / Rehacer -->
          <div class="btn-group">
            <button id="tb-undo" class="topbar-btn" title="Deshacer (Ctrl+Z)" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
            </button>
            <button id="tb-redo" class="topbar-btn" title="Rehacer (Ctrl+Y)" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 14 20 9 15 4"></polyline>
                <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
              </svg>
            </button>
          </div>

          <div class="topbar-divider"></div>

          <!-- Modos de herramienta -->
          <div class="btn-group">
            <button id="tb-tool-select" class="topbar-btn is-active" title="Modo Selección">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3l7 18 3-7 7-3L3 3z"></path>
              </svg>
            </button>
            <button id="tb-tool-wire" class="topbar-btn" title="Trazar Cable (W)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="5" r="3"></circle>
                <circle cx="19" cy="19" r="3"></circle>
                <line x1="5" y1="8" x2="5" y2="15"></line>
                <line x1="5" y1="15" x2="19" y2="15"></line>
                <line x1="19" y1="15" x2="19" y2="16"></line>
              </svg>
            </button>
            <button id="tb-tool-node" class="topbar-btn" title="Insertar Nodo Eléctrico (N)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="6" fill="#06B6D4" stroke="#0F172A" stroke-width="1.8"></circle>
                <circle cx="12" cy="12" r="2.5" fill="#FFFFFF"></circle>
              </svg>
            </button>
            <button id="tb-tool-delete" class="topbar-btn" title="Modo Borrador">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
            <button id="tb-duplicate" class="topbar-btn" title="Duplicar Seleccionado (Ctrl+D)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button id="tb-rotate" class="topbar-btn" title="Rotar Seleccionado (R)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
            <button id="tb-select-all" class="topbar-btn" title="Seleccionar Todo (Ctrl+A)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button id="tb-delete" class="topbar-btn text-rose-400" title="Eliminar Selección (Supr)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button id="tb-clear" class="topbar-btn text-rose-400" title="Limpiar Lienzo Completo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"></path>
              </svg>
            </button>
          </div>

          <div class="topbar-divider"></div>

          <!-- Guardar y Abrir rápidos -->
          <div class="btn-group">
            <button id="tb-save" class="topbar-btn" title="Guardar Circuito (JSON)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </button>
            <button id="tb-open" class="topbar-btn" title="Abrir Circuito (JSON)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>

          <div class="topbar-divider"></div>

          <!-- Botón de Simulación DC MNA -->
          <button id="tb-simulate" class="topbar-btn topbar-btn-simulate" title="Ejecutar Simulación DC (MNA)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Simular DC</span>
          </button>

          <div class="topbar-divider"></div>

          <!-- Selector rápido de ejemplos -->
          <div class="examples-dropdown-wrapper">
            <select id="quick-examples-select" class="topbar-select">
              <option value="" disabled selected>📂 Cargar circuito de ejemplo...</option>
              ${PREBUILT_CIRCUITS.map(ex => `
                <option value="${ex.id}">${ex.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="topbar-divider"></div>

          <!-- Zoom y Centrado -->
          <div class="btn-group">
            <button id="tb-zoom-out" class="topbar-btn" title="Alejar Zoom">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button id="tb-center" class="topbar-btn" title="Centrar Vista">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
            <button id="tb-zoom-in" class="topbar-btn" title="Acercar Zoom">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
          </div>

          <div class="topbar-divider"></div>

          <!-- Selector de Tema Claro / Oscuro -->
          <button id="tb-theme-toggle" class="topbar-btn theme-toggle-btn" title="Cambiar Tema (Oscuro / Claro)">
            <svg id="theme-icon-dark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <svg id="theme-icon-light" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span id="theme-label-text">Tema Oscuro</span>
          </button>
        </div>

        <!-- Input de archivo oculto para importar JSON -->
        <input type="file" id="file-import-input" accept=".json,.electrolab" style="display: none;" />
      </header>
    `;

    this.btnUndo = this.container.querySelector('#tb-undo');
    this.btnRedo = this.container.querySelector('#tb-redo');
    this.btnToolSelect = this.container.querySelector('#tb-tool-select');
    this.btnToolWire = this.container.querySelector('#tb-tool-wire');
  }

  bindEvents() {
    // Manejo de dropdowns de menú
    const menuItems = this.container.querySelectorAll('.menu-item-wrapper');
    menuItems.forEach(item => {
      const btn = item.querySelector('.menu-trigger-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = item.classList.contains('is-open');
        this.closeAllMenus();
        if (!isOpen) {
          item.classList.add('is-open');
          this.activeMenu = item;
        }
      });
    });

    document.addEventListener('click', () => this.closeAllMenus());

    // Acciones de Menú Archivo
    this.container.querySelector('#menu-new').addEventListener('click', () => {
      this.promptClearCircuit();
    });

    const fileInput = this.container.querySelector('#file-import-input');
    const menuSaveJson = this.container.querySelector('#menu-save-json');
    if (menuSaveJson) menuSaveJson.addEventListener('click', () => this.exportJSON());

    const menuOpenJson = this.container.querySelector('#menu-open-json');
    if (menuOpenJson) menuOpenJson.addEventListener('click', () => fileInput.click());

    this.container.querySelectorAll('.menu-example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-example-id');
        this.loadExample(id);
      });
    });

    const quickSelect = this.container.querySelector('#quick-examples-select');
    quickSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadExample(e.target.value);
        quickSelect.selectedIndex = 0;
      }
    });

    fileInput.addEventListener('change', (e) => this.handleFileImport(e));

    this.container.querySelector('#menu-export-spice').addEventListener('click', () => {
      this.bottomPanel.activeTab = 'spice';
      this.bottomPanel.isExpanded = true;
      this.bottomPanel.updateExpandState();
      this.bottomPanel.render();
    });

    // Menú Editar
    this.container.querySelector('#menu-undo').addEventListener('click', () => this.model.undo());
    this.container.querySelector('#menu-redo').addEventListener('click', () => this.model.redo());

    const menuDuplicate = this.container.querySelector('#menu-duplicate');
    if (menuDuplicate) {
      menuDuplicate.addEventListener('click', () => this.model.duplicateSelected());
    }

    this.container.querySelector('#menu-rotate').addEventListener('click', () => {
      this.model.rotateSelected(90);
    });
    this.container.querySelector('#menu-delete').addEventListener('click', () => this.model.deleteSelected());
    this.container.querySelector('#menu-select-all').addEventListener('click', () => {
      this.model.selectAll();
    });
    this.container.querySelector('#menu-clear-sel').addEventListener('click', () => this.model.clearSelection());

    // Menú Ver
    const toggleLibrary = () => {
      if (this.libraryPanel) this.libraryPanel.toggle();
      else if (window.ElectroLab?.catalog) window.ElectroLab.catalog.toggle();
    };

    const tbToggleLib = this.container.querySelector('#tb-toggle-library');
    if (tbToggleLib) tbToggleLib.addEventListener('click', toggleLibrary);

    const menuToggleLib = this.container.querySelector('#menu-toggle-library');
    if (menuToggleLib) menuToggleLib.addEventListener('click', toggleLibrary);

    this.container.querySelector('#menu-center').addEventListener('click', () => this.canvasEditor.centerView());
    this.container.querySelector('#menu-zoom-in').addEventListener('click', () => this.canvasEditor.zoomIn());
    this.container.querySelector('#menu-zoom-out').addEventListener('click', () => this.canvasEditor.zoomOut());
    this.container.querySelector('#menu-zoom-100').addEventListener('click', () => this.canvasEditor.resetZoom());
    this.container.querySelector('#menu-toggle-grid-type').addEventListener('click', () => {
      this.model.grid.type = this.model.grid.type === 'dots' ? 'lines' : 'dots';
      this.canvasEditor.updateTransform();
    });
    this.container.querySelector('#menu-toggle-snap').addEventListener('click', () => {
      this.model.grid.snap = !this.model.grid.snap;
      const snapHud = document.getElementById('hud-snap');
      if (snapHud) snapHud.textContent = `Snap: ${this.model.grid.snap ? '20px' : 'Off'}`;
    });

    // Menú Herramientas
    this.container.querySelector('#menu-tool-select').addEventListener('click', () => {
      this.model.activeTool = 'select';
      this.model.emit('tool', 'select');
    });
    this.container.querySelector('#menu-tool-wire').addEventListener('click', () => {
      this.model.activeTool = 'wire';
      this.model.emit('tool', 'wire');
    });
    const menuToolNode = this.container.querySelector('#menu-tool-node');
    if (menuToolNode) {
      menuToolNode.addEventListener('click', () => {
        this.model.activeTool = 'node';
        this.model.emit('tool', 'node');
      });
    }
    this.container.querySelector('#menu-tool-delete').addEventListener('click', () => {
      this.model.activeTool = 'delete';
      this.model.emit('tool', 'delete');
    });

    // Menú Análisis
    this.container.querySelector('#menu-show-formulas').addEventListener('click', () => {
      this.bottomPanel.activeTab = 'formulas';
      this.bottomPanel.isExpanded = true;
      this.bottomPanel.updateExpandState();
      this.bottomPanel.render();
    });
    this.container.querySelector('#menu-show-topo').addEventListener('click', () => {
      this.bottomPanel.activeTab = 'topology';
      this.bottomPanel.isExpanded = true;
      this.bottomPanel.updateExpandState();
      this.bottomPanel.render();
    });
    this.container.querySelector('#menu-show-erc').addEventListener('click', () => {
      this.bottomPanel.activeTab = 'erc';
      this.bottomPanel.isExpanded = true;
      this.bottomPanel.updateExpandState();
      this.bottomPanel.render();
    });

    // Menú Simular & Botón Rápido
    const runSim = () => {
      this.bottomPanel.runSimulation();
    };

    const menuRunSim = this.container.querySelector('#menu-run-simulation');
    if (menuRunSim) menuRunSim.addEventListener('click', runSim);

    const menuReduction = this.container.querySelector('#menu-show-reduction');
    if (menuReduction) {
      menuReduction.addEventListener('click', () => {
        this.bottomPanel.activeTab = 'reduction';
        this.bottomPanel.isExpanded = true;
        this.bottomPanel.updateExpandState();
        this.bottomPanel.render();
      });
    }

    const tbSimulate = this.container.querySelector('#tb-simulate');
    if (tbSimulate) tbSimulate.addEventListener('click', runSim);

    const menuSpice = this.container.querySelector('#menu-show-spice');
    if (menuSpice) {
      menuSpice.addEventListener('click', () => {
        this.bottomPanel.activeTab = 'spice';
        this.bottomPanel.isExpanded = true;
        this.bottomPanel.updateExpandState();
        this.bottomPanel.render();
      });
    }

    // Botones rápidos
    this.btnUndo.addEventListener('click', () => this.model.undo());
    this.btnRedo.addEventListener('click', () => this.model.redo());

    this.btnToolSelect.addEventListener('click', () => {
      this.model.activeTool = 'select';
      this.model.emit('tool', 'select');
    });

    this.btnToolWire.addEventListener('click', () => {
      this.model.activeTool = 'wire';
      this.model.emit('tool', 'wire');
    });

    const tbToolNode = this.container.querySelector('#tb-tool-node');
    if (tbToolNode) {
      tbToolNode.addEventListener('click', () => {
        this.model.activeTool = this.model.activeTool === 'node' ? 'select' : 'node';
        this.model.emit('tool', this.model.activeTool);
      });
    }

    const tbToolDelete = this.container.querySelector('#tb-tool-delete');
    if (tbToolDelete) {
      tbToolDelete.addEventListener('click', () => {
        this.model.activeTool = this.model.activeTool === 'delete' ? 'select' : 'delete';
        this.model.emit('tool', this.model.activeTool);
      });
    }

    const tbDuplicate = this.container.querySelector('#tb-duplicate');
    if (tbDuplicate) {
      tbDuplicate.addEventListener('click', () => {
        this.model.duplicateSelected();
      });
    }

    const tbSave = this.container.querySelector('#tb-save');
    if (tbSave) {
      tbSave.addEventListener('click', () => this.exportJSON());
    }

    const tbOpen = this.container.querySelector('#tb-open');
    if (tbOpen) {
      tbOpen.addEventListener('click', () => fileInput.click());
    }

    this.container.querySelector('#tb-rotate').addEventListener('click', () => {
      this.model.rotateSelected(90);
    });

    const tbSelectAll = this.container.querySelector('#tb-select-all');
    if (tbSelectAll) {
      tbSelectAll.addEventListener('click', () => this.model.selectAll());
    }

    this.container.querySelector('#tb-delete').addEventListener('click', () => this.model.deleteSelected());

    const tbClear = this.container.querySelector('#tb-clear');
    if (tbClear) {
      tbClear.addEventListener('click', () => this.promptClearCircuit());
    }

    this.container.querySelector('#tb-zoom-in').addEventListener('click', () => this.canvasEditor.zoomIn());
    this.container.querySelector('#tb-zoom-out').addEventListener('click', () => this.canvasEditor.zoomOut());
    this.container.querySelector('#tb-center').addEventListener('click', () => this.canvasEditor.centerView());

    // Botón de alternancia de tema
    this.container.querySelector('#tb-theme-toggle').addEventListener('click', () => {
      const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
    });
  }

  setLibraryPanel(libraryPanel) {
    this.libraryPanel = libraryPanel;
  }

  showConfirm({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar' }) {
    return new Promise((resolve) => {
      let modal = document.getElementById('electrolab-confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'electrolab-confirm-modal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog">
            <div class="modal-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 class="modal-title" id="confirm-modal-title">Confirmar</h3>
            </div>
            <div class="modal-body" id="confirm-modal-body"></div>
            <div class="modal-footer">
              <button type="button" class="prop-btn-secondary" id="confirm-modal-cancel">Cancelar</button>
              <button type="button" class="prop-btn-danger" id="confirm-modal-ok">Aceptar</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const titleEl = modal.querySelector('#confirm-modal-title');
      const bodyEl = modal.querySelector('#confirm-modal-body');
      const btnCancel = modal.querySelector('#confirm-modal-cancel');
      const btnOk = modal.querySelector('#confirm-modal-ok');

      titleEl.textContent = title;
      bodyEl.textContent = message;
      btnOk.textContent = confirmText;
      btnCancel.textContent = cancelText;

      const cleanup = (result) => {
        modal.classList.remove('is-active');
        btnCancel.removeEventListener('click', onCancel);
        btnOk.removeEventListener('click', onOk);
        resolve(result);
      };

      const onCancel = () => cleanup(false);
      const onOk = () => cleanup(true);

      btnCancel.addEventListener('click', onCancel);
      btnOk.addEventListener('click', onOk);

      modal.classList.add('is-active');
    });
  }

  async promptClearCircuit() {
    if (this.model.hasContent()) {
      const confirmed = await this.showConfirm({
        title: 'Limpiar Lienzo del Circuito',
        message: '¿Deseas vaciar el lienzo del circuito? Esta acción eliminará componentes, cables, selección y resultados de análisis actuales. (Podrás deshacer con Ctrl+Z si fue por error).',
        confirmText: 'Limpiar Lienzo',
        cancelText: 'Cancelar'
      });
      if (!confirmed) return;
    }
    this.model.clearCircuit();
    this.canvasEditor.centerView();
  }

  closeAllMenus() {
    this.container.querySelectorAll('.menu-item-wrapper').forEach(item => {
      item.classList.remove('is-open');
    });
    this.activeMenu = null;
  }

  updateHistoryButtons(state) {
    if (this.btnUndo) this.btnUndo.disabled = !state.canUndo;
    if (this.btnRedo) this.btnRedo.disabled = !state.canRedo;
  }

  updateToolButtons() {
    const tbToolDelete = this.container.querySelector('#tb-tool-delete');
    const tbToolNode = this.container.querySelector('#tb-tool-node');
    this.btnToolSelect.classList.remove('is-active');
    this.btnToolWire.classList.remove('is-active');
    if (tbToolNode) tbToolNode.classList.remove('is-active');
    if (tbToolDelete) tbToolDelete.classList.remove('is-active');

    if (this.model.activeTool === 'select') {
      this.btnToolSelect.classList.add('is-active');
    } else if (this.model.activeTool === 'wire') {
      this.btnToolWire.classList.add('is-active');
    } else if (this.model.activeTool === 'node') {
      if (tbToolNode) tbToolNode.classList.add('is-active');
    } else if (this.model.activeTool === 'delete') {
      if (tbToolDelete) tbToolDelete.classList.add('is-active');
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('electrolab-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const darkIcon = this.container.querySelector('#theme-icon-dark');
    const lightIcon = this.container.querySelector('#theme-icon-light');
    const textLabel = this.container.querySelector('#theme-label-text');

    if (theme === 'dark') {
      darkIcon.style.display = 'block';
      lightIcon.style.display = 'none';
      textLabel.textContent = 'Tema Oscuro';
    } else {
      darkIcon.style.display = 'none';
      lightIcon.style.display = 'block';
      textLabel.textContent = 'Tema Claro';
    }
  }

  loadExample(exampleId) {
    const ex = PREBUILT_CIRCUITS.find(c => c.id === exampleId);
    if (ex) {
      this.model.loadCircuit(ex.circuit);
      setTimeout(() => this.canvasEditor.centerView(), 50);
    }
  }

  exportJSON() {
    const data = this.model.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuito_electrolab_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.components) {
          this.model.loadCircuit(json);
          setTimeout(() => this.canvasEditor.centerView(), 50);
        } else {
          alert('El archivo seleccionado no tiene el formato válido de ElectroLab.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
}
