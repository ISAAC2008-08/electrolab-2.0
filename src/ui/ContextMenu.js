/**
 * ElectroLab 2.0 - Menú Contextual Propio del Lienzo
 * Sustituye el menú nativo del navegador al hacer clic derecho dentro del editor de circuitos.
 * Muestra acciones reales para Componentes, Cables y Espacio Libre del Lienzo,
 * con posicionamiento automático delimitado dentro de los bordes visibles de la pantalla.
 */

export class ContextMenu {
  constructor(canvasEditor, model, toolbar) {
    this.canvasEditor = canvasEditor;
    this.model = model;
    this.toolbar = toolbar;

    this.domElement = null;
    this.isOpen = false;

    this.initDOM();
    this.bindGlobalEvents();
  }

  initDOM() {
    this.domElement = document.createElement('div');
    this.domElement.id = 'circuit-context-menu';
    this.domElement.className = 'context-menu';
    this.domElement.style.display = 'none';
    document.body.appendChild(this.domElement);
  }

  bindGlobalEvents() {
    // Cerrar al hacer clic izquierdo fuera del menú
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.domElement.contains(e.target)) {
        this.hide();
      }
    });

    // Cerrar al presionar Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });

    // Cerrar si la ventana cambia de tamaño
    window.addEventListener('resize', () => {
      if (this.isOpen) this.hide();
    });
  }

  /**
   * Abre el menú contextual en la posición dada.
   * @param {number} clientX - Coordenada X del ratón
   * @param {number} clientY - Coordenada Y del ratón
   * @param {Object} targetInfo - { type: 'component'|'wire'|'canvas', id: string|null }
   */
  show(clientX, clientY, targetInfo) {
    this.lastClickPos = { clientX, clientY };
    let itemsHtml = '';

    if (targetInfo.type === 'component') {
      const comp = this.model.components.get(targetInfo.id);
      const name = comp ? comp.name : 'Componente';
      const isNode = comp && comp.type === 'junction_node';

      itemsHtml = `
        <div class="context-menu-header">
          <span class="context-menu-title font-mono">${name}</span>
          <span class="context-menu-sub">${isNode ? 'Nodo de Conexión Eléctrica' : (comp ? comp.type : '')}</span>
        </div>
        <button class="context-menu-item" data-action="select-comp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7 18 3-7 7-3L3 3z"></path></svg>
          <span>Seleccionar & Propiedades</span>
        </button>
        ${isNode ? `
        <button class="context-menu-item" data-action="wire-from-node">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="5" r="3"></circle><circle cx="19" cy="19" r="3"></circle><line x1="5" y1="8" x2="19" y2="19"></line></svg>
          <span>Trazar Cable desde este Nodo</span>
        </button>
        ` : ''}
        <button class="context-menu-item" data-action="rotate-comp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Girar 90° (R)</span>
        </button>
        <button class="context-menu-item" data-action="duplicate-comp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Duplicar (Ctrl+D)</span>
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item item-danger" data-action="delete-comp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Eliminar Componente (Supr)</span>
        </button>
      `;
    } else if (targetInfo.type === 'wire') {
      const wire = this.model.wires.find(w => w.id === targetInfo.id);
      itemsHtml = `
        <div class="context-menu-header">
          <span class="context-menu-title font-mono">Conductor Eléctrico</span>
          <span class="context-menu-sub">${wire ? wire.id : ''}</span>
        </div>
        <button class="context-menu-item" data-action="select-wire">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7 18 3-7 7-3L3 3z"></path></svg>
          <span>Seleccionar Cable</span>
        </button>
        <button class="context-menu-item" data-action="split-wire-node">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" fill="#06B6D4" stroke="#0F172A" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          <span>Insertar Nodo de Conexión Aquí</span>
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item item-danger" data-action="delete-wire">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Eliminar Cable (Supr)</span>
        </button>
      `;
    } else {
      // Zona vacía del lienzo
      itemsHtml = `
        <div class="context-menu-header">
          <span class="context-menu-title">Lienzo Esquemático</span>
          <span class="context-menu-sub">ElectroLab 2.0</span>
        </div>
        <button class="context-menu-item" data-action="tool-wire">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="5" r="3"></circle><circle cx="19" cy="19" r="3"></circle><line x1="5" y1="8" x2="5" y2="15"></line><line x1="5" y1="15" x2="19" y2="15"></line></svg>
          <span>Trazar Conductor (Cable)</span>
        </button>
        <button class="context-menu-item" data-action="select-all">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Seleccionar Todos (Ctrl+A)</span>
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item" data-action="center-view">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          <span>Centrar Vista en Circuito</span>
        </button>
        <button class="context-menu-item" data-action="reset-zoom">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Restablecer Zoom (100%)</span>
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item item-danger" data-action="clear-circuit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"></path></svg>
          <span>Limpiar Lienzo...</span>
        </button>
      `;
    }

    this.domElement.innerHTML = itemsHtml;
    this.domElement.style.display = 'block';
    this.isOpen = true;

    // Calcular dimensiones reales del menú para delimitar bordes visibles
    const menuWidth = this.domElement.offsetWidth || 210;
    const menuHeight = this.domElement.offsetHeight || 220;

    const pad = 12;
    let posX = clientX;
    let posY = clientY;

    if (posX + menuWidth > window.innerWidth - pad) {
      posX = window.innerWidth - menuWidth - pad;
    }
    if (posY + menuHeight > window.innerHeight - pad) {
      posY = window.innerHeight - menuHeight - pad;
    }
    if (posX < pad) posX = pad;
    if (posY < pad) posY = pad;

    this.domElement.style.left = `${posX}px`;
    this.domElement.style.top = `${posY}px`;

    // Vincular eventos de cada botón de acción
    this.domElement.querySelectorAll('.context-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        this.executeAction(action, targetInfo);
        this.hide();
      });
    });
  }

  executeAction(action, targetInfo) {
    switch (action) {
      case 'select-comp':
        if (targetInfo.id) this.model.selectComponent(targetInfo.id);
        break;
      case 'rotate-comp':
        if (targetInfo.id) this.model.rotateComponent(targetInfo.id, 90);
        break;
      case 'duplicate-comp':
        if (targetInfo.id) {
          this.model.selectComponent(targetInfo.id);
          this.model.duplicateSelected();
        }
        break;
      case 'delete-comp':
        if (targetInfo.id) this.model.removeComponent(targetInfo.id);
        break;
      case 'select-wire':
        if (targetInfo.id) this.model.selectWire(targetInfo.id);
        break;
      case 'split-wire-node': {
        if (targetInfo.id && this.lastClickPos) {
          const canvasCoords = this.canvasEditor.clientToCanvas(this.lastClickPos.clientX, this.lastClickPos.clientY);
          const nearWire = this.canvasEditor.findNearestWire(canvasCoords.x, canvasCoords.y, 25);
          if (nearWire && nearWire.wire.id === targetInfo.id) {
            this.model.splitWireWithNode(targetInfo.id, nearWire.point.x, nearWire.point.y);
          } else {
            const snapX = this.model.grid.snap ? Math.round(canvasCoords.x / this.model.grid.size) * this.model.grid.size : canvasCoords.x;
            const snapY = this.model.grid.snap ? Math.round(canvasCoords.y / this.model.grid.size) * this.model.grid.size : canvasCoords.y;
            this.model.splitWireWithNode(targetInfo.id, snapX, snapY);
          }
        }
        break;
      }
      case 'wire-from-node': {
        if (targetInfo.id) {
          const pinPos = this.model.getPinPosition(targetInfo.id, 'p_node');
          if (pinPos) {
            this.canvasEditor.isWiring = true;
            this.canvasEditor.wireStart = pinPos;
            this.canvasEditor.wireCurrentPos = { x: pinPos.x, y: pinPos.y };
            this.canvasEditor.updateCursor();
            this.canvasEditor.renderPreviewWire();
          }
        }
        break;
      }
      case 'delete-wire':
        if (targetInfo.id) this.model.removeWire(targetInfo.id);
        break;
      case 'tool-wire':
        this.model.activeTool = 'wire';
        this.model.emit('tool', 'wire');
        break;
      case 'select-all':
        this.model.selectAll();
        break;
      case 'center-view':
        this.canvasEditor.centerView();
        break;
      case 'reset-zoom':
        this.canvasEditor.resetZoom();
        break;
      case 'clear-circuit':
        if (this.toolbar) {
          this.toolbar.promptClearCircuit();
        } else {
          this.model.clearCircuit();
        }
        break;
    }
  }

  hide() {
    if (this.domElement) {
      this.domElement.style.display = 'none';
    }
    this.isOpen = false;
  }
}
