/**
 * ElectroLab 2.0 - LibraryPanel (Biblioteca de Componentes)
 * Panel lateral izquierdo con categorías expandibles, buscador rápido,
 * vistas previas esquemáticas SVG y soporte de arrastre/clic para añadir al lienzo.
 */

import { COMPONENT_CATEGORIES, COMPONENT_CATALOG } from '../model/componentCatalog.js';
import { renderComponentSymbol } from './ComponentSymbols.js';

export class LibraryPanel {
  constructor(containerElement, model, canvasEditor) {
    this.container = containerElement;
    this.model = model;
    this.canvasEditor = canvasEditor;
    this.searchTerm = '';
    this.expandedCategories = new Set(['sources', 'resistors', 'capacitors', 'semiconductors']);

    this.initDOM();
    this.render();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="library-panel">
        <!-- Encabezado del panel -->
        <div class="panel-header">
          <div class="panel-header-title">
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>BIBLIOTECA</span>
          </div>
          <div class="panel-header-actions">
            <span class="panel-header-badge">${Object.keys(COMPONENT_CATALOG).length} comp.</span>
            <button id="library-toggle-close" class="panel-header-icon-btn" title="Cerrar biblioteca de componentes (Ctrl+B)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Barra de búsqueda -->
        <div class="library-search-box">
          <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="library-search-input" placeholder="Buscar símbolo o valor..." autocomplete="off" />
          <button id="library-search-clear" class="search-clear-btn" style="display: none;">&times;</button>
        </div>

        <!-- Contenedor scrolleable de categorías -->
        <div class="library-categories-container" id="library-categories"></div>

        <!-- Pie informativo del panel -->
        <div class="library-footer-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Arrastra al lienzo o haz clic para añadir</span>
        </div>
      </div>
    `;

    const searchInput = this.container.querySelector('#library-search-input');
    const searchClear = this.container.querySelector('#library-search-clear');

    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      searchClear.style.display = this.searchTerm ? 'block' : 'none';
      this.render();
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      this.searchTerm = '';
      searchClear.style.display = 'none';
      this.render();
      searchInput.focus();
    });

    const closeBtn = this.container.querySelector('#library-toggle-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggle(false));
    }
  }

  toggle(forceOpen = null) {
    const isCollapsed = this.container.classList.contains('is-collapsed');
    const shouldCollapse = (forceOpen !== null) ? !forceOpen : !isCollapsed;

    if (shouldCollapse) {
      this.container.classList.add('is-collapsed');
    } else {
      this.container.classList.remove('is-collapsed');
    }

    const reopenBtn = document.getElementById('btn-reopen-library');
    if (reopenBtn) {
      reopenBtn.style.display = shouldCollapse ? 'flex' : 'none';
    }

    const tbToggleBtn = document.getElementById('tb-toggle-library');
    if (tbToggleBtn) {
      tbToggleBtn.classList.toggle('is-active', !shouldCollapse);
    }

    setTimeout(() => {
      if (this.canvasEditor) {
        this.canvasEditor.render();
      }
    }, 220);
  }

  render() {
    const listContainer = this.container.querySelector('#library-categories');
    if (!listContainer) return;

    let html = '';

    COMPONENT_CATEGORIES.forEach(cat => {
      // Filtrar componentes de esta categoría
      const catComponents = Object.values(COMPONENT_CATALOG).filter(comp => {
        if (comp.category !== cat.id) return false;
        if (!this.searchTerm) return true;
        return (
          comp.name.toLowerCase().includes(this.searchTerm) ||
          comp.prefix.toLowerCase().includes(this.searchTerm) ||
          (comp.description && comp.description.toLowerCase().includes(this.searchTerm))
        );
      });

      if (catComponents.length === 0 && this.searchTerm) {
        return; // Ocultar categoría vacía si hay búsqueda activa
      }

      const isExpanded = this.searchTerm ? true : this.expandedCategories.has(cat.id);

      html += `
        <div class="category-section" data-cat-id="${cat.id}">
          <button class="category-header-btn ${isExpanded ? 'is-expanded' : ''}" type="button">
            <svg class="category-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span class="category-title">${cat.name}</span>
            <span class="category-count">${catComponents.length}</span>
          </button>

          <div class="category-items-grid" style="display: ${isExpanded ? 'grid' : 'none'};">
            ${catComponents.map(comp => this.renderComponentCard(comp)).join('')}
          </div>
        </div>
      `;
    });

    if (html === '' && this.searchTerm) {
      html = `
        <div class="library-empty-search">
          <p>No se encontraron componentes para "${this.searchTerm}"</p>
        </div>
      `;
    }

    listContainer.innerHTML = html;

    // Vincular eventos de colapso de categorías
    listContainer.querySelectorAll('.category-header-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.category-section');
        const catId = section.getAttribute('data-cat-id');

        if (this.expandedCategories.has(catId)) {
          this.expandedCategories.delete(catId);
        } else {
          this.expandedCategories.add(catId);
        }
        this.render();
      });
    });

    // Vincular drag & drop y clic de componentes
    listContainer.querySelectorAll('.library-item-card').forEach(card => {
      const type = card.getAttribute('data-type');

      // Drag and drop hacia el SVG
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/electrolab-component', type);
        e.dataTransfer.effectAllowed = 'copy';
      });

      // Clic para spawnear en el centro
      card.addEventListener('click', () => {
        // Calcular centro del viewport
        const rect = this.canvasEditor.svg.getBoundingClientRect();
        const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
        const centerCanvas = this.canvasEditor.clientToCanvas(rect.left + centerScreen.x, rect.top + centerScreen.y);

        this.model.addComponent(type, centerCanvas.x - 30, centerCanvas.y - 30);
      });
    });
  }

  renderComponentCard(comp) {
    const symbolSvg = renderComponentSymbol(comp.type, null, true);

    return `
      <div class="library-item-card" draggable="true" data-type="${comp.type}" title="${comp.description}">
        <div class="item-preview-box">
          <svg class="item-preview-svg" viewBox="0 0 ${comp.width} ${comp.height}">
            ${symbolSvg}
          </svg>
        </div>
        <div class="item-info">
          <div class="item-name">${comp.name}</div>
          <div class="item-tag">${comp.prefix} · ${comp.unit ? `${comp.defaultValue} ${comp.unit}` : 'Estándar'}</div>
        </div>
      </div>
    `;
  }
}
