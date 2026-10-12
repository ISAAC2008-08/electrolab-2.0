/**
 * ElectroLab 2.0 - Punto de Entrada Principal (Vanilla JavaScript)
 * Arquitectura unificada sin frameworks externos.
 * Preparado para ejecutarse tanto en Vite como directamente en VS Code con Live Server.
 */

import { CircuitModel } from './model/CircuitModel.js';
import { Toolbar } from './ui/Toolbar.js';
import { CanvasEditor } from './ui/CanvasEditor.js';
import { LibraryPanel } from './ui/LibraryPanel.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { BottomPanel } from './ui/BottomPanel.js';
import { PREBUILT_CIRCUITS } from './examples/prebuiltCircuits.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar el Modelo Único Centralizado
  const circuitModel = new CircuitModel();

  // 2. Contenedores del DOM
  const topbarContainer = document.getElementById('app-topbar-container');
  const canvasContainer = document.getElementById('canvas-container');
  const libraryContainer = document.getElementById('panel-library-container');
  const propertiesContainer = document.getElementById('panel-properties-container');
  const bottomContainer = document.getElementById('panel-bottom-container');

  // 3. Inicializar el Editor de Lienzo Central
  const canvasEditor = new CanvasEditor(canvasContainer, circuitModel);

  // 4. Inicializar el Panel Inferior de Análisis y Fórmulas
  const bottomPanel = new BottomPanel(bottomContainer, circuitModel);

  // 5. Inicializar la Barra Superior de Menús y Herramientas
  const toolbar = new Toolbar(topbarContainer, circuitModel, canvasEditor, bottomPanel);
  canvasEditor.setToolbar(toolbar);

  // 6. Inicializar la Biblioteca Lateral Izquierda
  const libraryPanel = new LibraryPanel(libraryContainer, circuitModel, canvasEditor);
  toolbar.setLibraryPanel(libraryPanel);
  canvasEditor.setLibraryPanel(libraryPanel);

  // 7. Inicializar el Inspector Lateral Derecho de Propiedades
  const propertiesPanel = new PropertiesPanel(propertiesContainer, circuitModel, canvasEditor);

  // 8. Cargar el primer circuito educativo demostrativo (Divisor de Tensión)
  const defaultDemo = PREBUILT_CIRCUITS[0];
  if (defaultDemo) {
    circuitModel.loadCircuit(defaultDemo.circuit);
    setTimeout(() => {
      canvasEditor.centerView();
    }, 100);
  }

  // Exponer API en ventana para depuración o scripts de prueba en consola del navegador
  window.ElectroLab = {
    model: circuitModel,
    editor: canvasEditor,
    catalog: libraryPanel,
    version: '2.0.0'
  };

  console.log('⚡ ElectroLab 2.0 inicializado con éxito. Modelo unificado activo.');
});
