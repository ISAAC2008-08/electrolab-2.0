/**
 * ElectroLab 2.0 - CanvasEditor (Editor Esquemático Central)
 * Renderiza el espacio de trabajo con cuadrícula de alta precisión, componentes,
 * terminales interactivos, trazado ortogonal de conductores (wires), zoom y paneo.
 */

import { COMPONENT_CATALOG } from '../model/componentCatalog.js';
import { renderComponentSymbol } from './ComponentSymbols.js';
import { ContextMenu } from './ContextMenu.js';

export class CanvasEditor {
  constructor(containerElement, model) {
    this.container = containerElement;
    this.model = model;
    this.toolbar = null;
    this.contextMenu = new ContextMenu(this, this.model, null);

    // Estado de interacción interna
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.isDraggingComponent = false;
    this.draggedCompId = null;
    this.dragOffset = { x: 0, y: 0 };
    this.hasMovedDuringDrag = false;

    // Estado del trazado de cable
    this.isWiring = false;
    this.wireStart = null; // { compId, pinId, x, y }
    this.wireCurrentPos = { x: 0, y: 0 };
    this.activePressedButtonId = null; // ID de pulsador momentáneo actualmente presionado

    this.initDOM();
    this.bindEvents();
    this.render();

    // Suscripción al modelo central
    this.model.on('change', () => this.render());
    this.model.on('selection', () => this.render());
    this.model.on('tool', () => this.updateCursor());
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="canvas-viewport" id="canvas-viewport" tabindex="0">
        <!-- Cuadrícula de fondo SVG -->
        <svg class="canvas-svg" id="canvas-svg" width="100%" height="100%">
          <defs>
            <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.2" class="grid-dot-fill" />
            </pattern>
            <pattern id="grid-lines" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" class="grid-line-stroke" stroke-width="0.8" />
            </pattern>
            <!-- Filtro para brillo de cables activos -->
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#06B6D4" flood-opacity="0.6"/>
            </filter>
          </defs>

          <!-- Fondo de cuadrícula transformable -->
          <rect id="grid-bg" width="100%" height="100%" fill="url(#grid-dots)" />

          <!-- Capa principal del circuito con matriz de zoom y paneo -->
          <g id="circuit-root">
            <!-- Capa de cables (wires) -->
            <g id="layer-wires"></g>
            <!-- Cable en construcción temporal -->
            <g id="layer-preview-wire"></g>
            <!-- Capa de componentes -->
            <g id="layer-components"></g>
            <!-- Capa de pines interactivos -->
            <g id="layer-pins"></g>
            <!-- Capa de cajas de selección -->
            <g id="layer-selection"></g>
          </g>
        </svg>

        <!-- Botón flotante para reabrir la biblioteca cuando está cerrada -->
        <button id="btn-reopen-library" class="library-reopen-pill" style="display: none;" title="Mostrar Biblioteca de Componentes (Ctrl+B)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span>BIBLIOTECA</span>
        </button>

        <!-- Indicador flotante HUD de coordenadas y zoom -->
        <div class="canvas-hud">
          <span id="hud-zoom">100%</span>
          <span class="hud-sep">·</span>
          <span id="hud-coords">X: 0 Y: 0</span>
          <span class="hud-sep">·</span>
          <span id="hud-snap">Snap: 20px</span>
        </div>
      </div>
    `;

    this.viewport = this.container.querySelector('#canvas-viewport');
    this.svg = this.container.querySelector('#canvas-svg');
    this.circuitRoot = this.container.querySelector('#circuit-root');
    this.gridBg = this.container.querySelector('#grid-bg');
    this.hudZoom = this.container.querySelector('#hud-zoom');
    this.hudCoords = this.container.querySelector('#hud-coords');

    const reopenBtn = this.container.querySelector('#btn-reopen-library');
    if (reopenBtn) {
      reopenBtn.addEventListener('click', () => {
        if (this.libraryPanel) {
          this.libraryPanel.toggle(true);
        } else if (window.ElectroLab?.catalog) {
          window.ElectroLab.catalog.toggle(true);
        }
      });
    }

    this.updateTransform();
  }

  // Convierte coordenadas de pantalla del ratón a coordenadas del lienzo (considerando zoom y paneo)
  clientToCanvas(clientX, clientY) {
    const rect = this.svg.getBoundingClientRect();
    const xScreen = clientX - rect.left;
    const yScreen = clientY - rect.top;
    return {
      x: (xScreen - this.model.view.x) / this.model.view.zoom,
      y: (yScreen - this.model.view.y) / this.model.view.zoom
    };
  }

  updateTransform() {
    this.circuitRoot.setAttribute(
      'transform',
      `translate(${this.model.view.x}, ${this.model.view.y}) scale(${this.model.view.zoom})`
    );

    // Desplazar el patrón de cuadrícula para que coincida con el paneo
    const patternId = this.model.grid.type === 'lines' ? 'grid-lines' : 'grid-dots';
    const pattern = this.svg.querySelector(`#${patternId}`);
    if (pattern) {
      pattern.setAttribute('x', (this.model.view.x % (this.model.grid.size * this.model.view.zoom)));
      pattern.setAttribute('y', (this.model.view.y % (this.model.grid.size * this.model.view.zoom)));
      pattern.setAttribute('width', this.model.grid.size * this.model.view.zoom);
      pattern.setAttribute('height', this.model.grid.size * this.model.view.zoom);
    }
    this.gridBg.setAttribute('fill', `url(#${patternId})`);
    this.hudZoom.textContent = `${Math.round(this.model.view.zoom * 100)}%`;
  }

  bindEvents() {
    // Zoom con la rueda del ratón centrado en el puntero
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);

      const oldZoom = this.model.view.zoom;
      let newZoom = Math.max(0.35, Math.min(3.5, oldZoom * zoomFactor));

      // Ajustar posición para zoom centrado en puntero
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.model.view.x = mouseX - mouseCanvas.x * newZoom;
      this.model.view.y = mouseY - mouseCanvas.y * newZoom;
      this.model.view.zoom = newZoom;

      this.updateTransform();
      this.model.emit('view', this.model.view);
    }, { passive: false });

    // Puntero / Ratón abajo
    this.viewport.addEventListener('mousedown', (e) => {
      const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);

      // Si la herramienta activa es insertar nodo, colocar nodo o ramificar cable
      if (e.button === 0 && this.model.activeTool === 'node') {
        const nearWire = this.findNearestWire(mouseCanvas.x, mouseCanvas.y, 16);
        if (nearWire) {
          this.model.splitWireWithNode(nearWire.wire.id, nearWire.point.x, nearWire.point.y);
        } else {
          const snapX = this.model.grid.snap ? Math.round(mouseCanvas.x / this.model.grid.size) * this.model.grid.size : mouseCanvas.x;
          const snapY = this.model.grid.snap ? Math.round(mouseCanvas.y / this.model.grid.size) * this.model.grid.size : mouseCanvas.y;
          this.model.addComponent('junction_node', snapX - 12, snapY - 12);
        }
        this.model.activeTool = 'select';
        this.model.emit('tool', 'select');
        return;
      }

      // Paneo con botón central o manteniendo tecla Espacio o clic en fondo
      if (e.button === 1 || e.spaceKey || (e.button === 0 && e.target === this.gridBg)) {
        if (!this.isWiring) {
          this.isPanning = true;
          this.panStart = { x: e.clientX - this.model.view.x, y: e.clientY - this.model.view.y };
          this.viewport.style.cursor = 'grabbing';
          if (e.button === 0 && e.target === this.gridBg) {
            this.model.clearSelection();
          }
          return;
        }
      }

      // Si estamos en modo cablear y se hace clic en fondo vacío, cancelar
      if (e.button === 2) { // Clic derecho
        e.preventDefault();
        this.cancelWiring();
      }
    });

    window.addEventListener('mousemove', (e) => {
      const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);
      this.hudCoords.textContent = `X: ${Math.round(mouseCanvas.x)} Y: ${Math.round(mouseCanvas.y)}`;

      // Paneo activo
      if (this.isPanning) {
        this.model.view.x = e.clientX - this.panStart.x;
        this.model.view.y = e.clientY - this.panStart.y;
        this.updateTransform();
        return;
      }

      // Arrastre de componente (soporta arrastre individual o de grupo seleccionado)
      if (this.isDraggingComponent && this.draggedCompId) {
        if (!this.hasMovedDuringDrag) {
          // Capturar historial ANTES del primer desplazamiento
          this.model.pushHistory();
          this.hasMovedDuringDrag = true;
        }

        let dx = mouseCanvas.x - this.dragStartMouse.x;
        let dy = mouseCanvas.y - this.dragStartMouse.y;

        if (this.model.grid.snap) {
          dx = Math.round(dx / this.model.grid.size) * this.model.grid.size;
          dy = Math.round(dy / this.model.grid.size) * this.model.grid.size;
        }

        let changed = false;
        if (this.dragInitialPositions && this.dragInitialPositions.size > 0) {
          this.dragInitialPositions.forEach((initPos, id) => {
            const comp = this.model.components.get(id);
            if (comp) {
              let tx = initPos.x + dx;
              let ty = initPos.y + dy;

              // Para junction_node: detección magnética de cables cercanos al arrastrar
              if (comp.type === 'junction_node' && this.dragInitialPositions.size === 1) {
                const nearWire = this.findNearestWire(tx + 12, ty + 12, 14, comp.id);
                if (nearWire) {
                  tx = nearWire.point.x - 12;
                  ty = nearWire.point.y - 12;
                }
              }

              if (comp.x !== tx || comp.y !== ty) {
                comp.x = tx;
                comp.y = ty;
                changed = true;
              }
            }
          });
        }

        if (changed) {
          this.render();
        }
        return;
      }

      // Actualizar cable dinámico en construcción
      if (this.isWiring && this.wireStart) {
        this.wireCurrentPos = mouseCanvas;
        this.renderPreviewWire();
      }
    });

    window.addEventListener('mouseup', (e) => {
      // 1. Liberar pulsador momentáneo si estaba presionado
      if (this.activePressedButtonId) {
        const btnComp = this.model.components.get(this.activePressedButtonId);
        if (btnComp && (btnComp.type === 'push_button' || btnComp.type === 'push_button_nc')) {
          this.model.updateComponent(this.activePressedButtonId, {
            params: { ...btnComp.params, state: 'released' }
          });
        }
        this.activePressedButtonId = null;
      }

      if (this.isPanning) {
        this.isPanning = false;
        this.updateCursor();
      }

      if (this.isDraggingComponent) {
        // Si el usuario hizo clic SIN arrastrar, evaluar alternancia directa de interruptores
        if (!this.hasMovedDuringDrag && this.draggedCompId) {
          const clickedComp = this.model.components.get(this.draggedCompId);
          if (clickedComp) {
            if (clickedComp.type === 'switch_spst') {
              const newState = clickedComp.params?.state === 'closed' ? 'open' : 'closed';
              this.model.updateComponent(clickedComp.id, {
                params: { ...clickedComp.params, state: newState }
              });
            } else if (clickedComp.type === 'switch_spdt') {
              const newPos = clickedComp.params?.position === '2' ? '1' : '2';
              this.model.updateComponent(clickedComp.id, {
                params: { ...clickedComp.params, position: newPos }
              });
            }
          }
        } else if (this.hasMovedDuringDrag && this.draggedCompId) {
          const draggedComp = this.model.components.get(this.draggedCompId);
          if (draggedComp && draggedComp.type === 'junction_node') {
            // Detectar si el nodo se soltó sobre o cerca de un cable existente (que no esté ya conectado a él)
            const nodeCenterX = draggedComp.x + 12;
            const nodeCenterY = draggedComp.y + 12;
            const nearWire = this.findNearestWire(nodeCenterX, nodeCenterY, 16, draggedComp.id);
            if (nearWire) {
              draggedComp.x = nearWire.point.x - 12;
              draggedComp.y = nearWire.point.y - 12;
              this.model.attachNodeToWire(draggedComp.id, nearWire.wire.id);
            }
          }
          this.model.emit('change', { action: 'moveComponent', compId: this.draggedCompId });
        }

        this.isDraggingComponent = false;
        this.draggedCompId = null;
        this.hasMovedDuringDrag = false;
        this.dragInitialPositions = null;
      }
    });

    // Seguridad: si la ventana pierde el foco, liberar cualquier pulsador presionado
    window.addEventListener('blur', () => {
      if (this.activePressedButtonId) {
        const btnComp = this.model.components.get(this.activePressedButtonId);
        if (btnComp) {
          this.model.updateComponent(this.activePressedButtonId, {
            params: { ...btnComp.params, state: 'released' }
          });
        }
        this.activePressedButtonId = null;
      }
    });

    // Teclado global para la aplicación
    window.addEventListener('keydown', (e) => {
      // Ignorar atajos si el usuario está editando un campo de texto o selección
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.model.deleteSelected();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.model.rotateSelected(90);
      } else if (e.key === 'Escape') {
        this.cancelWiring();
        this.model.clearSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.model.redo();
        } else {
          this.model.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.model.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.model.duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.model.selectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        document.getElementById('tb-save')?.click() || document.getElementById('menu-save-json')?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        document.getElementById('tb-open')?.click() || document.getElementById('file-import-input')?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (this.libraryPanel) {
          this.libraryPanel.toggle();
        } else if (window.ElectroLab?.catalog) {
          window.ElectroLab.catalog.toggle();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.model.activeTool = this.model.activeTool === 'node' ? 'select' : 'node';
        this.model.emit('tool', this.model.activeTool);
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.model.activeTool = this.model.activeTool === 'wire' ? 'select' : 'wire';
        this.model.emit('tool', this.model.activeTool);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this.zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        this.zoomOut();
      }
    });

    // Drag and drop desde la biblioteca izquierda
    this.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      const compType = e.dataTransfer.getData('application/electrolab-component');
      if (compType) {
        const coords = this.clientToCanvas(e.clientX, e.clientY);
        if (compType === 'junction_node') {
          const snapX = this.model.grid.snap ? Math.round(coords.x / this.model.grid.size) * this.model.grid.size : coords.x;
          const snapY = this.model.grid.snap ? Math.round(coords.y / this.model.grid.size) * this.model.grid.size : coords.y;
          const nearWire = this.findNearestWire(snapX, snapY, 18);
          if (nearWire) {
            this.model.splitWireWithNode(nearWire.wire.id, nearWire.point.x, nearWire.point.y);
          } else {
            this.model.addComponent('junction_node', snapX - 12, snapY - 12);
          }
        } else {
          this.model.addComponent(compType, coords.x - 30, coords.y - 30);
        }
      }
    });

    // Menú contextual propio de ElectroLab 2.0 (reemplaza el menú nativo del navegador en el lienzo)
    this.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Evita el menú contextual nativo del navegador dentro del lienzo

      if (this.isWiring) {
        this.cancelWiring();
        return;
      }

      // Detectar objetivo bajo el cursor
      const compEl = e.target.closest('.component-group');
      if (compEl) {
        const compId = compEl.getAttribute('data-comp-id');
        this.contextMenu.show(e.clientX, e.clientY, { type: 'component', id: compId });
        return;
      }

      const wireEl = e.target.closest('.wire-group');
      if (wireEl) {
        const wireId = wireEl.getAttribute('data-wire-id');
        this.contextMenu.show(e.clientX, e.clientY, { type: 'wire', id: wireId });
        return;
      }

      // Clic derecho en zona vacía del lienzo
      this.contextMenu.show(e.clientX, e.clientY, { type: 'canvas', id: null });
    });
  }

  setToolbar(toolbar) {
    this.toolbar = toolbar;
    if (this.contextMenu) {
      this.contextMenu.toolbar = toolbar;
    }
  }

  setLibraryPanel(libraryPanel) {
    this.libraryPanel = libraryPanel;
  }

  resize() {
    this.updateTransform();
    this.render();
  }

  cancelWiring() {
    this.isWiring = false;
    this.wireStart = null;
    const previewLayer = this.svg.querySelector('#layer-preview-wire');
    if (previewLayer) previewLayer.innerHTML = '';
    this.updateCursor();
  }

  updateCursor() {
    if (this.isWiring) {
      this.viewport.style.cursor = 'crosshair';
    } else if (this.model.activeTool === 'wire') {
      this.viewport.style.cursor = 'crosshair';
    } else if (this.model.activeTool === 'node') {
      this.viewport.style.cursor = 'cell';
    } else if (this.model.activeTool === 'delete') {
      this.viewport.style.cursor = 'not-allowed';
    } else {
      this.viewport.style.cursor = 'default';
    }
  }

  /**
   * Encuentra el cable ortogonal más cercano a las coordenadas dadas dentro de una tolerancia.
   * Proyecta el punto sobre el segmento de línea y lo alinea a la cuadrícula.
   */
  findNearestWire(canvasX, canvasY, tolerance = 16, excludeNodeId = null) {
    let closest = null;
    let minDistance = tolerance;

    for (const wire of this.model.wires) {
      if (excludeNodeId && (wire.fromCompId === excludeNodeId || wire.toCompId === excludeNodeId)) {
        continue;
      }

      const p1 = this.model.getPinPosition(wire.fromCompId, wire.fromPinId);
      const p2 = this.model.getPinPosition(wire.toCompId, wire.toPinId);
      if (!p1 || !p2) continue;

      const pts = this.computeOrthogonalPoints(p1, p2);
      if (!pts || pts.length < 2) continue;

      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const isH = Math.abs(a.y - b.y) <= 1;
        const isV = Math.abs(a.x - b.x) <= 1;

        if (isH) {
          const segY = a.y;
          const minX = Math.min(a.x, b.x);
          const maxX = Math.max(a.x, b.x);
          if (canvasX >= minX - tolerance && canvasX <= maxX + tolerance) {
            const projX = Math.max(minX, Math.min(maxX, canvasX));
            const dist = Math.hypot(canvasX - projX, canvasY - segY);
            if (dist < minDistance) {
              let snapX = projX;
              if (this.model.grid.snap) {
                snapX = Math.round(projX / this.model.grid.size) * this.model.grid.size;
                snapX = Math.max(minX, Math.min(maxX, snapX));
              }
              const nearP1 = Math.hypot(snapX - p1.x, segY - p1.y) <= 8;
              const nearP2 = Math.hypot(snapX - p2.x, segY - p2.y) <= 8;
              if (!nearP1 && !nearP2) {
                minDistance = dist;
                closest = {
                  wire,
                  dist,
                  point: { x: snapX, y: segY }
                };
              }
            }
          }
        } else if (isV) {
          const segX = a.x;
          const minY = Math.min(a.y, b.y);
          const maxY = Math.max(a.y, b.y);
          if (canvasY >= minY - tolerance && canvasY <= maxY + tolerance) {
            const projY = Math.max(minY, Math.min(maxY, canvasY));
            const dist = Math.hypot(canvasX - segX, canvasY - projY);
            if (dist < minDistance) {
              let snapY = projY;
              if (this.model.grid.snap) {
                snapY = Math.round(projY / this.model.grid.size) * this.model.grid.size;
                snapY = Math.max(minY, Math.min(maxY, snapY));
              }
              const nearP1 = Math.hypot(segX - p1.x, snapY - p1.y) <= 8;
              const nearP2 = Math.hypot(segX - p2.x, snapY - p2.y) <= 8;
              if (!nearP1 && !nearP2) {
                minDistance = dist;
                closest = {
                  wire,
                  dist,
                  point: { x: segX, y: snapY }
                };
              }
            }
          }
        }
      }
    }

    return closest;
  }

  // ==================== RENDERIZADO ====================
  render() {
    this.renderWires();
    this.renderComponents();
    this.renderPins();
    this.renderSelection();
    if (this.isWiring) {
      this.renderPreviewWire();
    }
  }

  computeOrthogonalPoints(p1, p2) {
    const x1 = Math.round(p1.x);
    const y1 = Math.round(p1.y);
    const x2 = Math.round(p2.x);
    const y2 = Math.round(p2.y);

    const dx = x2 - x1;
    const dy = y2 - y1;

    // Segmento recto si coinciden
    if (Math.abs(dx) <= 2) {
      return [{ x: x1, y: y1 }, { x: x1, y: y2 }];
    }
    if (Math.abs(dy) <= 2) {
      return [{ x: x1, y: y1 }, { x: x2, y: y1 }];
    }

    const dir1 = p1.direction || 'left';
    const dir2 = p2.direction || 'right';

    const isV1 = (dir1 === 'top' || dir1 === 'bottom');
    const isH1 = (dir1 === 'left' || dir1 === 'right');
    const isV2 = (dir2 === 'top' || dir2 === 'bottom');
    const isH2 = (dir2 === 'left' || dir2 === 'right');

    // 1. Salida vertical en p1 y llegada horizontal en p2 (L limpio)
    if (isV1 && isH2) {
      const signV1 = dir1 === 'top' ? -1 : 1;
      if (Math.sign(dy) === signV1 || Math.abs(dy) > 20) {
        return [{ x: x1, y: y1 }, { x: x1, y: y2 }, { x: x2, y: y2 }];
      }
    }

    // 2. Salida horizontal en p1 y llegada vertical en p2 (L limpio)
    if (isH1 && isV2) {
      const signH1 = dir1 === 'left' ? -1 : 1;
      if (Math.sign(dx) === signH1 || Math.abs(dx) > 20) {
        return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }];
      }
    }

    // 3. Ambos verticales
    if (isV1 && isV2) {
      if (dir1 === 'top' && dir2 === 'top') {
        const minY = Math.min(y1, y2) - 30;
        return [{ x: x1, y: y1 }, { x: x1, y: minY }, { x: x2, y: minY }, { x: x2, y: y2 }];
      }
      if (dir1 === 'bottom' && dir2 === 'bottom') {
        const maxY = Math.max(y1, y2) + 30;
        return [{ x: x1, y: y1 }, { x: x1, y: maxY }, { x: x2, y: maxY }, { x: x2, y: y2 }];
      }
      if (p2.pinId === 'p_gnd' || (p2.compId && p2.compId.startsWith('gnd'))) {
        return [{ x: x1, y: y1 }, { x: x1, y: y2 }, { x: x2, y: y2 }];
      }
      if (p1.pinId === 'p_gnd' || (p1.compId && p1.compId.startsWith('gnd'))) {
        return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }];
      }
      const midY = Math.round((y1 + y2) / 2);
      return [{ x: x1, y: y1 }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 }];
    }

    // 4. Ambos horizontales
    if (isH1 && isH2) {
      if (dir1 === 'left' && dir2 === 'left') {
        const minX = Math.min(x1, x2) - 30;
        return [{ x: x1, y: y1 }, { x: minX, y: y1 }, { x: minX, y: y2 }, { x: x2, y: y2 }];
      }
      if (dir1 === 'right' && dir2 === 'right') {
        const maxX = Math.max(x1, x2) + 30;
        return [{ x: x1, y: y1 }, { x: maxX, y: y1 }, { x: maxX, y: y2 }, { x: x2, y: y2 }];
      }
      const midX = Math.round((x1 + x2) / 2);
      return [{ x: x1, y: y1 }, { x: midX, y: y1 }, { x: midX, y: y2 }, { x: x2, y: y2 }];
    }

    // Predeterminado según orientación de p1
    if (isV1) {
      const midY = Math.round((y1 + y2) / 2);
      return [{ x: x1, y: y1 }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 }];
    }
    const midX = Math.round((x1 + x2) / 2);
    return [{ x: x1, y: y1 }, { x: midX, y: y1 }, { x: midX, y: y2 }, { x: x2, y: y2 }];
  }

  computeOrthogonalPath(p1, p2) {
    const pts = this.computeOrthogonalPoints(p1, p2);
    if (!pts || pts.length === 0) return '';
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }

  renderWires() {
    const layer = this.svg.querySelector('#layer-wires');
    if (!layer) return;

    let html = '';

    // Detección de puntos de unión donde confluyen 2 o más cables
    const endpointCounts = new Map();
    const endpointCoords = new Map();
    const allEndpoints = [];

    // Colección de cables procesados con sus segmentos para detección de cruces
    const wireSegmentsList = [];

    this.model.wires.forEach(wire => {
      const p1 = this.model.getPinPosition(wire.fromCompId, wire.fromPinId);
      const p2 = this.model.getPinPosition(wire.toCompId, wire.toPinId);
      if (!p1 || !p2) return;

      const k1 = `${p1.x},${p1.y}`;
      const k2 = `${p2.x},${p2.y}`;
      endpointCounts.set(k1, (endpointCounts.get(k1) || 0) + 1);
      endpointCounts.set(k2, (endpointCounts.get(k2) || 0) + 1);
      endpointCoords.set(k1, { x: p1.x, y: p1.y });
      endpointCoords.set(k2, { x: p2.x, y: p2.y });
      allEndpoints.push({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });

      const isSelected = this.model.selectedIds.has(wire.id);
      const strokeColor = isSelected ? '#F59E0B' : (wire.color || '#06B6D4');
      const strokeWidth = isSelected ? 3.5 : 2;

      // Calcular puntos del trayecto ortogonal
      const pts = this.computeOrthogonalPoints(p1, p2);
      const pathData = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

      // Guardar segmentos de este cable
      const segments = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const isH = Math.abs(a.y - b.y) <= 1;
        const isV = Math.abs(a.x - b.x) <= 1;
        segments.push({
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          isH, isV,
          minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
          minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y)
        });
      }

      wireSegmentsList.push({
        wireId: wire.id,
        segments,
        strokeColor,
        strokeWidth,
        isSelected
      });

      html += `
        <g class="wire-group" data-wire-id="${wire.id}">
          <!-- Trazo invisible más grueso para facilitar el clic -->
          <path d="${pathData}" fill="none" stroke="transparent" stroke-width="14" class="wire-hitbox" />
          <!-- Cable visible con estilo CAD -->
          <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="wire-path ${isSelected ? 'wire-selected' : ''}" />
          <!-- Terminales extremos del cable -->
          <circle cx="${p1.x}" cy="${p1.y}" r="2" fill="${strokeColor}" />
          <circle cx="${p2.x}" cy="${p2.y}" r="2" fill="${strokeColor}" />
        </g>
      `;
    });

    // Detectar cruces ortogonales (sin conexión eléctrica) entre cables diferentes
    const crossings = [];
    const isNearEndpoint = (x, y) => {
      return allEndpoints.some(ep => Math.hypot(ep.x - x, ep.y - y) <= 8);
    };

    for (let i = 0; i < wireSegmentsList.length; i++) {
      for (let j = i + 1; j < wireSegmentsList.length; j++) {
        const wA = wireSegmentsList[i];
        const wB = wireSegmentsList[j];

        wA.segments.forEach(sA => {
          wB.segments.forEach(sB => {
            // Un segmento horizontal y uno vertical
            if (sA.isH && sB.isV) {
              const ix = sB.x1;
              const iy = sA.y1;
              if (ix >= sA.minX + 6 && ix <= sA.maxX - 6 && iy >= sB.minY + 6 && iy <= sB.maxY - 6) {
                if (!isNearEndpoint(ix, iy)) {
                  crossings.push({
                    x: ix,
                    y: iy,
                    isHorizontal: true,
                    strokeColor: wA.isSelected ? '#F59E0B' : '#38BDF8',
                    strokeWidth: wA.isSelected ? 3.5 : 2.5
                  });
                }
              }
            } else if (sA.isV && sB.isH) {
              const ix = sA.x1;
              const iy = sB.y1;
              if (ix >= sB.minX + 6 && ix <= sB.maxX - 6 && iy >= sA.minY + 6 && iy <= sA.maxY - 6) {
                if (!isNearEndpoint(ix, iy)) {
                  crossings.push({
                    x: ix,
                    y: iy,
                    isHorizontal: true,
                    strokeColor: wB.isSelected ? '#F59E0B' : '#38BDF8',
                    strokeWidth: wB.isSelected ? 3.5 : 2.5
                  });
                }
              }
            }
          });
        });
      }
    }

    // Renderizar arcos de cruce ("jump bridge" / "salto de conductor")
    crossings.forEach(cr => {
      html += `
        <g class="wire-crossing-group" pointer-events="none">
          <title>Cruce ortogonal sin conexión eléctrica</title>
          <!-- Brecha en el fondo para separar limpiamente el conductor que pasa debajo -->
          <line x1="${cr.x - 7}" y1="${cr.y}" x2="${cr.x + 7}" y2="${cr.y}" stroke="var(--bg-app, #0F172A)" stroke-width="6" stroke-linecap="butt" />
          <!-- Arco de salto / Jumper bridge en el conductor superior -->
          <path d="M ${cr.x - 7} ${cr.y} A 7 7 0 0 1 ${cr.x + 7} ${cr.y}" fill="none" stroke="${cr.strokeColor}" stroke-width="${cr.strokeWidth}" stroke-linecap="round" class="wire-crossing-bridge" />
        </g>
      `;
    });

    // Puntos de unión estándar (Junction Dots) para nodos eléctricos compartidos por múltiples cables
    endpointCounts.forEach((count, key) => {
      if (count >= 2) {
        const pt = endpointCoords.get(key);
        if (pt) {
          html += `
            <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#06B6D4" stroke="#0F172A" stroke-width="1.5" class="junction-dot" pointer-events="none">
              <title>Nodo de conexión eléctrica (${count} ramas)</title>
            </circle>
          `;
        }
      }
    });

    layer.innerHTML = html;

    // Asignar listeners a cables (selección, eliminación y ramificación de nodos)
    layer.querySelectorAll('.wire-group').forEach(el => {
      const wireId = el.getAttribute('data-wire-id');
      el.addEventListener('click', (e) => {
        e.stopPropagation();

        if (this.model.activeTool === 'delete') {
          this.model.removeWire(wireId);
          return;
        }

        // Si estamos en proceso de cableado (isWiring) y hacemos clic sobre un cable existente,
        // ramificar automáticamente insertando un nodo eléctrico de unión
        if (this.isWiring && this.wireStart) {
          const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);
          const snapX = this.model.grid.snap ? Math.round(mouseCanvas.x / this.model.grid.size) * this.model.grid.size : mouseCanvas.x;
          const snapY = this.model.grid.snap ? Math.round(mouseCanvas.y / this.model.grid.size) * this.model.grid.size : mouseCanvas.y;
          const nodeComp = this.model.splitWireWithNode(wireId, snapX, snapY);
          if (nodeComp && this.wireStart.compId !== nodeComp.id) {
            this.model.addWire(this.wireStart.compId, this.wireStart.pinId, nodeComp.id, 'p_node');
          }
          this.cancelWiring();
          return;
        }

        this.model.selectWire(wireId);
      });

      // Doble clic sobre un cable para insertar un nodo de unión y ramificar en ese punto
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);
        const nearWire = this.findNearestWire(mouseCanvas.x, mouseCanvas.y, 20);
        if (nearWire && nearWire.wire.id === wireId) {
          this.model.splitWireWithNode(wireId, nearWire.point.x, nearWire.point.y);
        }
      });
    });
  }

  renderPreviewWire() {
    const layer = this.svg.querySelector('#layer-preview-wire');
    if (!layer || !this.wireStart) {
      if (layer) layer.innerHTML = '';
      return;
    }

    const p1 = this.wireStart;
    const p2 = this.wireCurrentPos;

    const pathData = this.computeOrthogonalPath(p1, p2);

    layer.innerHTML = `
      <path d="${pathData}" fill="none" stroke="#06B6D4" stroke-width="2" stroke-dasharray="4,4" class="preview-wire" />
      <circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#06B6D4" />
      <circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#06B6D4" />
    `;
  }

  renderComponents() {
    const layer = this.svg.querySelector('#layer-components');
    if (!layer) return;

    let html = '';
    this.model.components.forEach(comp => {
      const def = COMPONENT_CATALOG[comp.type];
      if (!def) return;

      const isSelected = this.model.selectedIds.has(comp.id);
      comp._isSelected = isSelected;
      const symbolSvg = renderComponentSymbol(comp.type, comp, false);

      // Centro del componente para rotación
      const cx = comp.width / 2;
      const cy = comp.height / 2;

      // Posicionamiento inteligente de etiquetas para evitar solapamiento con rotación o bandas
      let labelYName = -8;
      let labelYVal = comp.height + 16;
      if (comp.rotation === 90 || comp.rotation === 270) {
        const halfSpan = comp.width / 2;
        labelYName = cy - halfSpan - 8;
        labelYVal = cy + halfSpan + 16;
      }

      // Etiqueta de valor legible
      let displayValue = '';
      if (comp.type === 'resistor') {
        const rVal = comp.params?.resistance !== undefined ? comp.params.resistance : 10;
        const rUnit = comp.params?.resistanceUnit || comp.unit || 'kΩ';
        displayValue = `${rVal} ${rUnit}`;
      } else if (comp.type === 'potentiometer') {
        displayValue = `${comp.params?.resistance || 10} kΩ`;
      } else if (comp.type === 'cap_ceramic' || comp.type === 'cap_electrolytic') {
        displayValue = `${comp.params?.capacitance || 100} ${comp.unit || 'nF'}`;
      } else if (comp.type === 'dc_source' || comp.type === 'battery') {
        displayValue = `${comp.params?.voltage || comp.value || 5} V`;
      } else if (comp.type === 'led') {
        displayValue = `${comp.params?.color || 'Rojo'}`;
      } else if (comp.type === 'switch_spst') {
        displayValue = comp.params?.state === 'closed' ? 'CERRADO' : 'ABIERTO';
      } else if (comp.type === 'switch_spdt') {
        displayValue = `TIRO ${comp.params?.position || '1'}`;
      } else if (comp.type === 'push_button' || comp.type === 'push_button_nc') {
        const isNC = (comp.type === 'push_button_nc' || comp.params?.buttonType === 'NC');
        const isPressed = comp.params?.state === 'pressed';
        if (isNC) {
          displayValue = isPressed ? 'NC (PRESIONADO)' : 'NC (REPOSO)';
        } else {
          displayValue = isPressed ? 'NA (PRESIONADO)' : 'NA (REPOSO)';
        }
      }

      const isInteractive = ['switch_spst', 'switch_spdt', 'push_button', 'push_button_nc'].includes(comp.type);
      const isNode = comp.type === 'junction_node';

      html += `
        <g class="component-group ${isSelected ? 'comp-selected' : ''} ${isInteractive ? 'comp-interactive' : ''} ${isNode ? 'comp-node-group' : ''}" data-comp-id="${comp.id}" transform="translate(${comp.x}, ${comp.y})">
          <!-- Grupo rotado alrededor de su centro -->
          <g transform="rotate(${comp.rotation}, ${cx}, ${cy})">
            <!-- Rectángulo de detección de clic amplio -->
            <rect x="0" y="0" width="${comp.width}" height="${comp.height}" fill="transparent" class="comp-hitbox" style="${isInteractive ? 'cursor: pointer;' : (isNode ? 'cursor: move;' : '')}" />
            <!-- Gráfico vectorial esquemático -->
            <g class="comp-symbol-vector">
              ${symbolSvg}
            </g>
          </g>

          <!-- Etiquetas de texto fijas (no giran para mantener legibilidad ortogonal) -->
          <g class="comp-labels" pointer-events="none">
            <text x="${comp.width / 2}" y="${isNode ? -6 : labelYName}" text-anchor="middle" class="comp-label-name" style="${isNode ? 'font-size: 10px; fill: var(--accent-cyan);' : ''}">${comp.name}</text>
            ${displayValue ? `<text x="${comp.width / 2}" y="${labelYVal}" text-anchor="middle" class="comp-label-val">${displayValue}</text>` : ''}
          </g>
        </g>
      `;
    });

    layer.innerHTML = html;

    // Vincular eventos de selección, interacción y arrastre
    layer.querySelectorAll('.component-group').forEach(el => {
      const compId = el.getAttribute('data-comp-id');

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Solo clic izquierdo
        e.stopPropagation();

        if (this.model.activeTool === 'delete') {
          this.model.removeComponent(compId);
          return;
        }

        if (!this.model.selectedIds.has(compId) || this.model.selectionType !== 'component') {
          this.model.selectComponent(compId);
        }

        const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);
        const comp = this.model.components.get(compId);

        if (comp) {
          // Si es un pulsador momentáneo, activarlo inmediatamente al mantener presionado
          if (comp.type === 'push_button' || comp.type === 'push_button_nc') {
            this.activePressedButtonId = compId;
            this.model.updateComponent(compId, {
              params: { ...comp.params, state: 'pressed' }
            });
          }

          this.isDraggingComponent = true;
          this.draggedCompId = compId;
          this.hasMovedDuringDrag = false;
          this.dragStartMouse = mouseCanvas;
          this.dragInitialPositions = new Map();
          this.model.selectedIds.forEach(id => {
            const c = this.model.components.get(id);
            if (c) this.dragInitialPositions.set(id, { x: c.x, y: c.y });
          });
        }
      });
    });
  }

  renderPins() {
    const layer = this.svg.querySelector('#layer-pins');
    if (!layer) return;

    let html = '';
    const allPins = this.model.getAllPins();

    allPins.forEach(pin => {
      const isNodePin = pin.pinId === 'p_node';
      html += `
        <g class="pin-group ${isNodePin ? 'pin-node-group' : ''}" data-comp-id="${pin.compId}" data-pin-id="${pin.pinId}" transform="translate(${pin.x}, ${pin.y})">
          <!-- Círculo invisible amplio para capturar hover/clic con tolerancia -->
          <circle cx="0" cy="0" r="${isNodePin ? 8 : 9}" fill="transparent" class="pin-hitbox" style="${isNodePin ? 'cursor: move;' : ''}" />
          <!-- Pin visible de cobre/estaño con centro magnético -->
          <circle cx="0" cy="0" r="${isNodePin ? 3 : 3.5}" class="pin-point" />
          <title>${pin.label} (${pin.compId})</title>
        </g>
      `;
    });

    layer.innerHTML = html;

    // Eventos de conexión de terminales
    layer.querySelectorAll('.pin-group').forEach(el => {
      const compId = el.getAttribute('data-comp-id');
      const pinId = el.getAttribute('data-pin-id');

      el.addEventListener('mouseenter', () => {
        el.querySelector('.pin-point').classList.add('pin-hover');
      });

      el.addEventListener('mouseleave', () => {
        el.querySelector('.pin-point').classList.remove('pin-hover');
      });

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const pinPos = this.model.getPinPosition(compId, pinId);
        if (!pinPos) return;

        const comp = this.model.components.get(compId);

        // Si es un junction_node (nodo eléctrico)
        if (comp && comp.type === 'junction_node') {
          if (this.isWiring) {
            // Finalizar cable conectándolo a este nodo
            if (this.wireStart.compId !== compId || this.wireStart.pinId !== pinId) {
              this.model.addWire(this.wireStart.compId, this.wireStart.pinId, compId, pinId);
            }
            this.cancelWiring();
            return;
          }

          if (this.model.activeTool === 'wire') {
            // Modo cablear: iniciar cable desde este nodo
            this.isWiring = true;
            this.wireStart = pinPos;
            this.wireCurrentPos = { x: pinPos.x, y: pinPos.y };
            this.updateCursor();
            this.renderPreviewWire();
            return;
          }

          if (this.model.activeTool === 'delete') {
            this.model.removeComponent(compId);
            return;
          }

          // Modo selección: Seleccionar el nodo y permitir moverlo libremente con el ratón
          this.model.selectComponent(compId);
          const mouseCanvas = this.clientToCanvas(e.clientX, e.clientY);
          this.isDraggingComponent = true;
          this.draggedCompId = compId;
          this.hasMovedDuringDrag = false;
          this.dragStartMouse = mouseCanvas;
          this.dragInitialPositions = new Map();
          this.model.selectedIds.forEach(id => {
            const c = this.model.components.get(id);
            if (c) this.dragInitialPositions.set(id, { x: c.x, y: c.y });
          });
          return;
        }

        // Para componentes estándar
        if (!this.isWiring) {
          // Iniciar trazado de cable desde este pin
          this.isWiring = true;
          this.wireStart = pinPos;
          this.wireCurrentPos = { x: pinPos.x, y: pinPos.y };
          this.updateCursor();
          this.renderPreviewWire();
        } else {
          // Finalizar trazado conectando a este pin
          if (this.wireStart.compId !== compId || this.wireStart.pinId !== pinId) {
            this.model.addWire(this.wireStart.compId, this.wireStart.pinId, compId, pinId);
          }
          this.cancelWiring();
        }
      });
    });
  }

  renderSelection() {
    const layer = this.svg.querySelector('#layer-selection');
    if (!layer) return;

    if (this.model.selectedIds.size === 0 || this.model.selectionType !== 'component') {
      layer.innerHTML = '';
      return;
    }

    let html = '';
    this.model.selectedIds.forEach(id => {
      const comp = this.model.components.get(id);
      if (!comp) return;

      if (comp.type === 'junction_node') {
        // Resaltado visual circular prominente en color ámbar para el nodo seleccionado
        html += `
          <g class="selection-box selection-node" transform="translate(${comp.x + 12}, ${comp.y + 12})" pointer-events="none">
            <circle cx="0" cy="0" r="14" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" stroke-width="2" stroke-dasharray="3,3" />
            <circle cx="0" cy="0" r="18" fill="none" stroke="#F59E0B" stroke-width="0.8" opacity="0.6" />
          </g>
        `;
      } else {
        const pad = 6;
        html += `
          <g class="selection-box" transform="translate(${comp.x - pad}, ${comp.y - pad})" pointer-events="none">
            <rect x="0" y="0" width="${comp.width + pad * 2}" height="${comp.height + pad * 2}"
                  fill="none" stroke="#06B6D4" stroke-width="1.2" stroke-dasharray="3,3" rx="3" />
          </g>
        `;
      }
    });

    layer.innerHTML = html;
  }

  // Métodos de control de vista
  zoomIn() {
    this.model.view.zoom = Math.min(3.5, this.model.view.zoom * 1.2);
    this.updateTransform();
    this.model.emit('view', this.model.view);
  }

  zoomOut() {
    this.model.view.zoom = Math.max(0.35, this.model.view.zoom / 1.2);
    this.updateTransform();
    this.model.emit('view', this.model.view);
  }

  resetZoom() {
    this.model.view.zoom = 1.0;
    this.model.view.x = 80;
    this.model.view.y = 60;
    this.updateTransform();
    this.model.emit('view', this.model.view);
  }

  centerView() {
    const comps = Array.from(this.model.components.values());
    if (comps.length === 0) {
      this.resetZoom();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    comps.forEach(c => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    });

    const rect = this.svg.getBoundingClientRect();
    const circuitW = maxX - minX;
    const circuitH = maxY - minY;

    const scaleX = (rect.width - 160) / Math.max(100, circuitW);
    const scaleY = (rect.height - 160) / Math.max(100, circuitH);
    const zoom = Math.max(0.5, Math.min(1.5, Math.min(scaleX, scaleY)));

    this.model.view.zoom = zoom;
    this.model.view.x = (rect.width - circuitW * zoom) / 2 - minX * zoom;
    this.model.view.y = (rect.height - circuitH * zoom) / 2 - minY * zoom;

    this.updateTransform();
    this.model.emit('view', this.model.view);
  }
}
