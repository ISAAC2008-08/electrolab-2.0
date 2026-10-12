/**
 * ElectroLab 2.0 - CircuitModel
 * Modelo Único y Centralizado del Circuito.
 * Administra componentes, conexiones (wires), selección, historial (undo/redo),
 * transformaciones de vista y emite eventos de actualización para todos los módulos.
 */

import { COMPONENT_CATALOG } from './componentCatalog.js';

export class CircuitModel {
  constructor() {
    this.components = new Map();
    this.wires = [];
    this.selectedIds = new Set();
    this.selectionType = null; // 'component' | 'wire' | null

    this.activeTool = 'select'; // 'select' | 'wire' | 'delete'
    this.view = { x: 80, y: 60, zoom: 1.0 };
    this.grid = { size: 20, snap: true, show: true, type: 'dots' }; // 'dots' | 'lines'

    // Contadores para designadores automáticos (R1, R2, C1, etc.)
    this.prefixCounters = {};

    // Historial para Deshacer / Rehacer
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;

    // Sistema de eventos Pub/Sub
    this.listeners = new Map();
  }

  // ==================== EVENTOS ====================
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(payload); } catch (e) { console.error(`Error in listener for ${event}:`, e); }
      });
    }
  }

  // ==================== HISTORIAL ====================
  snapshot() {
    return JSON.stringify({
      components: Array.from(this.components.values()),
      wires: this.wires,
      prefixCounters: this.prefixCounters
    });
  }

  pushHistory() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.emit('history', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    this.redoStack.push(this.snapshot());
    const prevState = this.undoStack.pop();
    this.restoreSnapshot(prevState);
    this.emit('history', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    this.emit('change', { source: 'undo' });
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.undoStack.push(this.snapshot());
    const nextState = this.redoStack.pop();
    this.restoreSnapshot(nextState);
    this.emit('history', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    this.emit('change', { source: 'redo' });
    return true;
  }

  restoreSnapshot(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.components.clear();
      data.components.forEach(c => this.components.set(c.id, c));
      this.wires = data.wires || [];
      this.prefixCounters = data.prefixCounters || {};
      this.selectedIds.clear();
      this.selectionType = null;
      this.emit('selection', { selected: null });
    } catch (err) {
      console.error('Error restoring snapshot:', err);
    }
  }

  // ==================== GESTIÓN DE COMPONENTES ====================
  generateDesignator(prefix) {
    const nextNum = (this.prefixCounters[prefix] || 0) + 1;
    this.prefixCounters[prefix] = nextNum;
    return `${prefix}${nextNum}`;
  }

  addComponent(type, rawX, rawY, customProps = {}) {
    const def = COMPONENT_CATALOG[type];
    if (!def) {
      console.warn(`Component definition not found for: ${type}`);
      return null;
    }

    this.pushHistory();

    let x, y;
    if (type === 'junction_node') {
      // Para junction_node, el centro/pin (12, 12) se alinea exactamente a la cuadrícula
      const snapCenterX = this.grid.snap ? Math.round((rawX + 12) / this.grid.size) * this.grid.size : (rawX + 12);
      const snapCenterY = this.grid.snap ? Math.round((rawY + 12) / this.grid.size) * this.grid.size : (rawY + 12);
      x = snapCenterX - 12;
      y = snapCenterY - 12;
    } else {
      x = this.grid.snap ? Math.round(rawX / this.grid.size) * this.grid.size : rawX;
      y = this.grid.snap ? Math.round(rawY / this.grid.size) * this.grid.size : rawY;
    }

    const id = 'comp_' + Math.random().toString(36).substring(2, 9);
    const designator = customProps.name || this.generateDesignator(def.prefix);

    // Clonar parámetros por defecto
    const initialParams = {};
    if (def.params) {
      Object.keys(def.params).forEach(k => {
        initialParams[k] = def.params[k].value;
      });
    }

    const component = {
      id,
      type,
      name: designator,
      x,
      y,
      rotation: customProps.rotation || 0, // 0, 90, 180, 270
      width: def.width,
      height: def.height,
      params: { ...initialParams, ...(customProps.params || {}) },
      value: customProps.value !== undefined ? customProps.value : def.defaultValue,
      unit: customProps.unit || def.unit,
      labelVisible: true
    };

    this.components.set(id, component);
    this.selectComponent(id);

    this.emit('change', { action: 'addComponent', component });
    return component;
  }

  updateComponent(id, updates) {
    const comp = this.components.get(id);
    if (!comp) return;

    this.pushHistory();
    Object.assign(comp, updates);
    this.emit('change', { action: 'updateComponent', component: comp });
    this.emit('selection', { selected: comp, type: 'component' });
  }

  removeComponent(id) {
    const comp = this.components.get(id);
    if (!comp) return;

    this.pushHistory();

    // Eliminar también todos los cables conectados a este componente
    this.wires = this.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
    this.components.delete(id);

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.selectionType = null;
      this.emit('selection', { selected: null });
    }

    this.emit('change', { action: 'removeComponent', id });
  }

  rotateComponent(id, delta = 90) {
    const comp = this.components.get(id);
    if (!comp) return;

    this.pushHistory();
    comp.rotation = (comp.rotation + delta + 360) % 360;
    this.emit('change', { action: 'rotateComponent', component: comp });
  }

  // ==================== CABLES Y CONEXIONES ====================
  addWire(fromCompId, fromPinId, toCompId, toPinId) {
    // Evitar conectar un pin consigo mismo
    if (fromCompId === toCompId && fromPinId === toPinId) return null;

    // Verificar si ya existe este cable
    const exists = this.wires.some(w =>
      (w.fromCompId === fromCompId && w.fromPinId === fromPinId && w.toCompId === toCompId && w.toPinId === toPinId) ||
      (w.fromCompId === toCompId && w.fromPinId === toPinId && w.toCompId === fromCompId && w.toPinId === fromPinId)
    );
    if (exists) return null;

    this.pushHistory();

    const wire = {
      id: 'wire_' + Math.random().toString(36).substring(2, 9),
      fromCompId,
      fromPinId,
      toCompId,
      toPinId,
      color: '#06B6D4' // default cyan laser accent
    };

    this.wires.push(wire);
    this.emit('change', { action: 'addWire', wire });
    return wire;
  }

  removeWire(id) {
    const idx = this.wires.findIndex(w => w.id === id);
    if (idx === -1) return;

    this.pushHistory();
    const removed = this.wires.splice(idx, 1)[0];

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.selectionType = null;
      this.emit('selection', { selected: null });
    }

    this.emit('change', { action: 'removeWire', wire: removed });
  }

  /**
   * Crea una ramificación sobre un cable existente insertando un junction_node explícito
   * en las coordenadas (x, y), dividiendo el cable original en dos tramos conectados al mismo nodo.
   * Evita duplicar nodos si ya existe uno en esa posición.
   */
  splitWireWithNode(wireId, x, y) {
    const wireIndex = this.wires.findIndex(w => w.id === wireId);
    if (wireIndex === -1) return null;

    // No modificar el circuito si el llamador entrega coordenadas inválidas.
    // La validación de que el punto esté sobre la ruta visual corresponde al editor,
    // que es quien conoce la geometría ortogonal dibujada del cable.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (!Number.isFinite(this.grid.size) || this.grid.size <= 0) return null;

    const wire = this.wires[wireIndex];

    // Alinear coordenadas del nodo a la cuadrícula
    const snapX = this.grid.snap ? Math.round(x / this.grid.size) * this.grid.size : x;
    const snapY = this.grid.snap ? Math.round(y / this.grid.size) * this.grid.size : y;

    // Verificar si ya existe un junction_node en esa misma posición (evita nodos duplicados)
    const existingNode = Array.from(this.components.values()).find(c =>
      c.type === 'junction_node' && Math.hypot((c.x + 12) - snapX, (c.y + 12) - snapY) <= 10
    );
    if (existingNode) {
      // Solo informar éxito si la operación de conexión se realizó o si el nodo
      // ya era un extremo de ese cable (en cuyo caso no hace falta dividirlo).
      const attached = this.attachNodeToWire(existingNode.id, wireId);
      const currentWire = this.wires.find(w => w.id === wireId);
      const alreadyEndpoint = currentWire &&
        (currentWire.fromCompId === existingNode.id || currentWire.toCompId === existingNode.id);
      return attached || alreadyEndpoint ? existingNode : null;
    }

    this.pushHistory();

    // 1. Eliminar el cable original por su índice ya verificado.
    this.wires.splice(wireIndex, 1);

    // 2. Crear componente de tipo junction_node con centro exacto en (snapX, snapY)
    const id = 'comp_' + Math.random().toString(36).substring(2, 9);
    const def = COMPONENT_CATALOG['junction_node'];
    const designator = this.generateDesignator(def ? def.prefix : 'N');

    const nodeComp = {
      id,
      type: 'junction_node',
      name: designator,
      x: snapX - 12,
      y: snapY - 12,
      rotation: 0,
      width: def ? def.width : 24,
      height: def ? def.height : 24,
      params: {},
      value: 0,
      unit: '',
      labelVisible: true
    };

    this.components.set(id, nodeComp);
    this.selectComponent(id);

    // 3. Crear dos nuevos cables que conectan los extremos originales al nuevo nodo
    const w1 = {
      id: 'wire_' + Math.random().toString(36).substring(2, 9),
      fromCompId: wire.fromCompId,
      fromPinId: wire.fromPinId,
      toCompId: nodeComp.id,
      toPinId: 'p_node',
      color: wire.color || '#06B6D4'
    };

    const w2 = {
      id: 'wire_' + Math.random().toString(36).substring(2, 9),
      fromCompId: nodeComp.id,
      fromPinId: 'p_node',
      toCompId: wire.toCompId,
      toPinId: wire.toPinId,
      color: wire.color || '#06B6D4'
    };

    this.wires.push(w1, w2);

    this.emit('change', { action: 'splitWire', node: nodeComp, wires: [w1, w2] });
    return nodeComp;
  }

  /**
   * Conecta un junction_node existente a un cable, dividiendo el cable en dos tramos
   * que pasan por dicho nodo, compartiendo la misma unión eléctrica.
   */
  attachNodeToWire(nodeId, wireId) {
    const nodeComp = this.components.get(nodeId);
    const wire = this.wires.find(w => w.id === wireId);
    if (!nodeComp || !wire || nodeComp.type !== 'junction_node') return false;
    if (!this.components.has(wire.fromCompId) || !this.components.has(wire.toCompId)) return false;
    if (typeof wire.fromPinId !== 'string' || typeof wire.toPinId !== 'string') return false;

    // Si el nodo ya es uno de los extremos del cable, no hacer nada
    if (wire.fromCompId === nodeId || wire.toCompId === nodeId) return false;

    // Evitar cables duplicados
    const wouldDuplicate1 = this.wires.some(w =>
      (w.fromCompId === wire.fromCompId && w.fromPinId === wire.fromPinId && w.toCompId === nodeId && w.toPinId === 'p_node') ||
      (w.toCompId === wire.fromCompId && w.toPinId === wire.fromPinId && w.fromCompId === nodeId && w.fromPinId === 'p_node')
    );
    const wouldDuplicate2 = this.wires.some(w =>
      (w.fromCompId === nodeId && w.fromPinId === 'p_node' && w.toCompId === wire.toCompId && w.toPinId === wire.toPinId) ||
      (w.toCompId === nodeId && w.toPinId === 'p_node' && w.fromCompId === wire.toCompId && w.fromPinId === wire.toPinId)
    );

    this.pushHistory();

    // Eliminar cable original
    const idx = this.wires.findIndex(w => w.id === wireId);
    this.wires.splice(idx, 1);

    const newWires = [];
    // Crear dos tramos que conectan al nodo sin duplicados
    if (!wouldDuplicate1) {
      const w1 = {
        id: 'wire_' + Math.random().toString(36).substring(2, 9),
        fromCompId: wire.fromCompId,
        fromPinId: wire.fromPinId,
        toCompId: nodeId,
        toPinId: 'p_node',
        color: wire.color || '#06B6D4'
      };
      this.wires.push(w1);
      newWires.push(w1);
    }

    if (!wouldDuplicate2) {
      const w2 = {
        id: 'wire_' + Math.random().toString(36).substring(2, 9),
        fromCompId: nodeId,
        fromPinId: 'p_node',
        toCompId: wire.toCompId,
        toPinId: wire.toPinId,
        color: wire.color || '#06B6D4'
      };
      this.wires.push(w2);
      newWires.push(w2);
    }

    this.emit('change', { action: 'attachNodeToWire', node: nodeComp, wires: newWires });
    return true;
  }

  // ==================== SELECCIÓN ====================
  selectComponent(id, multi = false) {
    if (!multi) this.selectedIds.clear();
    if (id) {
      this.selectedIds.add(id);
      this.selectionType = 'component';
      const comp = this.components.get(id);
      this.emit('selection', { selected: comp, type: 'component' });
    } else {
      this.selectionType = null;
      this.emit('selection', { selected: null });
    }
  }

  selectWire(id) {
    this.selectedIds.clear();
    if (id) {
      this.selectedIds.add(id);
      this.selectionType = 'wire';
      const wire = this.wires.find(w => w.id === id);
      this.emit('selection', { selected: wire, type: 'wire' });
    } else {
      this.selectionType = null;
      this.emit('selection', { selected: null });
    }
  }

  clearSelection() {
    this.selectedIds.clear();
    this.selectionType = null;
    this.emit('selection', { selected: null });
  }

  deleteSelected() {
    if (this.selectedIds.size === 0) return;
    const idsToDelete = Array.from(this.selectedIds);
    this.pushHistory();

    idsToDelete.forEach(id => {
      if (this.components.has(id)) {
        this.wires = this.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
        this.components.delete(id);
      } else {
        this.wires = this.wires.filter(w => w.id !== id);
      }
    });

    this.selectedIds.clear();
    this.selectionType = null;
    this.emit('selection', { selected: null });
    this.emit('change', { action: 'deleteSelected' });
  }

  hasContent() {
    return this.components.size > 0 || this.wires.length > 0;
  }

  selectAll() {
    this.selectedIds.clear();
    this.components.forEach((_, id) => this.selectedIds.add(id));
    this.wires.forEach(w => this.selectedIds.add(w.id));
    this.selectionType = this.components.size > 0 ? 'component' : (this.wires.length > 0 ? 'wire' : null);
    const firstComp = this.components.size > 0 ? this.components.get(Array.from(this.components.keys())[0]) : null;
    this.emit('selection', { selected: firstComp, type: this.selectionType, count: this.selectedIds.size });
  }

  rotateSelected(delta = 90) {
    if (this.selectedIds.size === 0) return;
    this.pushHistory();
    this.selectedIds.forEach(id => {
      const comp = this.components.get(id);
      if (comp) {
        comp.rotation = (comp.rotation + delta + 360) % 360;
      }
    });
    this.emit('change', { action: 'rotateSelected' });
  }

  duplicateSelected() {
    if (this.selectedIds.size === 0 || this.selectionType !== 'component') return [];
    this.pushHistory();

    const oldToNewMap = new Map();
    const newSelected = new Set();
    const offset = 40;

    // 1. Clonar componentes seleccionados
    this.selectedIds.forEach(id => {
      const original = this.components.get(id);
      if (!original) return;

      const def = COMPONENT_CATALOG[original.type];
      const prefix = def ? def.prefix : 'C';
      const newName = this.generateDesignator(prefix);
      const newId = 'comp_' + Math.random().toString(36).substring(2, 9);

      const clone = {
        ...JSON.parse(JSON.stringify(original)),
        id: newId,
        name: newName,
        x: original.x + offset,
        y: original.y + offset
      };

      this.components.set(newId, clone);
      oldToNewMap.set(id, newId);
      newSelected.add(newId);
    });

    // 2. Duplicar cables internos entre los componentes duplicados
    this.wires.forEach(w => {
      if (oldToNewMap.has(w.fromCompId) && oldToNewMap.has(w.toCompId)) {
        const newWire = {
          id: 'wire_' + Math.random().toString(36).substring(2, 9),
          fromCompId: oldToNewMap.get(w.fromCompId),
          fromPinId: w.fromPinId,
          toCompId: oldToNewMap.get(w.toCompId),
          toPinId: w.toPinId,
          color: w.color || '#06B6D4'
        };
        this.wires.push(newWire);
      }
    });

    // 3. Seleccionar los duplicados
    this.selectedIds = newSelected;
    this.selectionType = 'component';
    const firstNew = this.components.get(Array.from(newSelected)[0]);
    this.emit('selection', { selected: firstNew, type: 'component', count: newSelected.size });
    this.emit('change', { action: 'duplicateSelected' });
    return Array.from(newSelected);
  }

  // ==================== CÁLCULO DE COORDENADAS DE PINES ====================
  /**
   * Obtiene la posición absoluta (X, Y) en el lienzo de un pin considerando
   * las dimensiones del componente, su posición y su rotación.
   */
  getPinPosition(compId, pinId) {
    const comp = this.components.get(compId);
    if (!comp) return null;

    const def = COMPONENT_CATALOG[comp.type];
    if (!def) return null;

    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return null;

    const cx = comp.width / 2;
    const cy = comp.height / 2;

    const px = pin.x - cx;
    const py = pin.y - cy;

    const rad = (comp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotX = px * cos - py * sin;
    const rotY = px * sin + py * cos;

    // Calcular dirección efectiva según la rotación del componente
    const dirList = ['top', 'right', 'bottom', 'left'];
    const originalDirIdx = dirList.indexOf(pin.direction || 'left');
    const rotSteps = Math.round((comp.rotation || 0) / 90) % 4;
    const effectiveDir = originalDirIdx >= 0 ? dirList[(originalDirIdx + rotSteps + 4) % 4] : 'left';

    return {
      x: Math.round(comp.x + cx + rotX),
      y: Math.round(comp.y + cy + rotY),
      label: pin.label,
      pinId: pin.id,
      compId: comp.id,
      direction: effectiveDir
    };
  }

  getAllPins() {
    const allPins = [];
    this.components.forEach(comp => {
      const def = COMPONENT_CATALOG[comp.type];
      if (def && def.pins) {
        def.pins.forEach(p => {
          const pos = this.getPinPosition(comp.id, p.id);
          if (pos) allPins.push(pos);
        });
      }
    });
    return allPins;
  }

  // ==================== ANÁLISIS TOPOLÓGICO ====================
  /**
   * Genera las redes eléctricas (Nets) agrupando pines conectados entre sí.
   */
  calculateNets() {
    // Grafo de adyacencia de terminales (clave: `${compId}:${pinId}`)
    const adj = new Map();
    const pinKeys = new Set();

    this.components.forEach(comp => {
      const def = COMPONENT_CATALOG[comp.type];
      if (def && def.pins) {
        def.pins.forEach(p => {
          const key = `${comp.id}:${p.id}`;
          pinKeys.add(key);
          if (!adj.has(key)) adj.set(key, []);
        });
      }
    });

    this.wires.forEach(w => {
      const k1 = `${w.fromCompId}:${w.fromPinId}`;
      const k2 = `${w.toCompId}:${w.toPinId}`;
      if (!adj.has(k1)) adj.set(k1, []);
      if (!adj.has(k2)) adj.set(k2, []);
      adj.get(k1).push({ target: k2, wireId: w.id });
      adj.get(k2).push({ target: k1, wireId: w.id });
    });

    const visited = new Set();
    const nets = [];
    let netCounter = 1;

    pinKeys.forEach(startPin => {
      if (!visited.has(startPin)) {
        const queue = [startPin];
        visited.add(startPin);
        const netPins = [];
        const netWires = new Set();

        while (queue.length > 0) {
          const curr = queue.shift();
          netPins.push(curr);

          const neighbors = adj.get(curr) || [];
          neighbors.forEach(edge => {
            netWires.add(edge.wireId);
            if (!visited.has(edge.target)) {
              visited.add(edge.target);
              queue.push(edge.target);
            }
          });
        }

        // Si tiene al menos una conexión o es un nodo con alambre
        const isGnd = netPins.some(p => {
          const compId = p.split(':')[0];
          const c = this.components.get(compId);
          return c && c.type === 'gnd';
        });

        const netName = isGnd ? 'GND (0V)' : `NET_${netCounter++}`;

        nets.push({
          name: netName,
          isGnd,
          pins: netPins,
          wires: Array.from(netWires)
        });
      }
    });

    return nets;
  }

  // ==================== EXPORTACIÓN / IMPORTACIÓN ====================
  toJSON() {
    return {
      version: '2.0',
      app: 'ElectroLab 2.0',
      timestamp: new Date().toISOString(),
      components: Array.from(this.components.values()),
      wires: this.wires
    };
  }

  loadCircuit(data) {
    this.pushHistory();
    this.components.clear();
    this.wires = [];
    this.prefixCounters = {};

    if (data.components) {
      data.components.forEach(c => {
        this.components.set(c.id, c);
        // Actualizar contadores
        const match = c.name.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10);
          if (!this.prefixCounters[prefix] || num > this.prefixCounters[prefix]) {
            this.prefixCounters[prefix] = num;
          }
        }
      });
    }

    if (data.wires) {
      this.wires = data.wires;
    }

    this.clearSelection();
    this.emit('change', { action: 'loadCircuit' });
  }

  clearCircuit() {
    this.pushHistory();
    this.components.clear();
    this.wires = [];
    this.prefixCounters = {};
    this.clearSelection();
    this.emit('change', { action: 'clearCircuit' });
  }
}
