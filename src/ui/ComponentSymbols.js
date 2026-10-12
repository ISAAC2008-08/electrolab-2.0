/**
 * ElectroLab 2.0 - Generador de Símbolos Esquemáticos SVG
 * Dibuja los símbolos normalizados (IEEE/IEC) para cada componente del catálogo.
 * Soporta bandas de color normalizadas para resistencias según IEC 60062.
 */

import { convertToOhms, getResistorColorBands } from '../utils/resistorColorCode.js';

export function renderComponentSymbol(type, comp = null, isThumbnail = false) {
  const stroke = 'currentColor';
  const strokeWidth = isThumbnail ? 1.5 : 2;

  switch (type) {
    // ==================== FUENTES ====================
    case 'dc_source':
      return `
        <line x1="30" y1="0" x2="30" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="30" cy="30" r="15" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="30" y1="21" x2="30" y2="27" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="27" y1="24" x2="33" y2="24" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="27" y1="36" x2="33" y2="36" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="30" y1="45" x2="30" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'battery':
      return `
        <line x1="30" y1="0" x2="30" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Placa positiva larga -->
        <line x1="16" y1="20" x2="44" y2="20" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <!-- Placa negativa corta -->
        <line x1="22" y1="27" x2="38" y2="27" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <!-- Placa positiva 2 -->
        <line x1="16" y1="34" x2="44" y2="34" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <!-- Placa negativa 2 -->
        <line x1="22" y1="41" x2="38" y2="41" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <line x1="30" y1="41" x2="30" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <text x="46" y="19" font-size="9" fill="${stroke}" font-family="monospace">+</text>
      `;

    case 'ac_source':
      return `
        <line x1="30" y1="0" x2="30" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="30" cy="30" r="15" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Onda senoidal -->
        <path d="M 22 30 Q 26 23, 30 30 T 38 30" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
        <line x1="30" y1="45" x2="30" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gnd':
      return `
        <line x1="20" y1="0" x2="20" y2="18" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="8" y1="18" x2="32" y2="18" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <line x1="12" y1="24" x2="28" y2="24" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="16" y1="30" x2="24" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'junction_node': {
      const isSel = comp && comp._isSelected;
      if (isSel) {
        return `
          <!-- Nodo de conexión eléctrica seleccionado (anillo ámbar visible) -->
          <circle cx="12" cy="12" r="10" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="3,2" class="node-selected-halo"/>
          <circle cx="12" cy="12" r="6" fill="#F59E0B" stroke="#0F172A" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="2.5" fill="#FFFFFF"/>
        `;
      }
      return `
        <!-- Nodo de conexión eléctrica explícito (Punto de unión para ramificaciones) -->
        <circle cx="12" cy="12" r="5" fill="#06B6D4" stroke="#0F172A" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="2" fill="#FFFFFF"/>
      `;
    }

    case 'current_source':
      return `
        <line x1="30" y1="0" x2="30" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="30" cy="30" r="15" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Flecha de corriente hacia arriba -->
        <line x1="30" y1="38" x2="30" y2="22" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="30,19 26,26 34,26" fill="${stroke}"/>
        <line x1="30" y1="45" x2="30" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    // ==================== RESISTENCIAS ====================
    case 'resistor': {
      // Cálculo de bandas de color según valor real, unidad y tolerancia (IEC 60062)
      const resVal = comp?.params?.resistance !== undefined ? comp.params.resistance : (comp?.value !== undefined ? comp.value : 10);
      const unit = comp?.params?.resistanceUnit || comp?.unit || 'kΩ';
      const numBands = parseInt(comp?.params?.bandCount, 10) || 4;
      const tolerance = parseFloat(comp?.params?.tolerance) || 5;

      const ohms = convertToOhms(resVal, unit);
      const bands = getResistorColorBands(ohms, numBands, tolerance);

      if (bands && bands.length > 0) {
        let bandsSvg = '';
        if (numBands === 5) {
          const positions = [23, 30, 37, 44, 53];
          bandsSvg = bands.map((b, i) => {
            const bx = positions[i] || (23 + i * 7.5);
            return `<rect x="${bx}" y="10" width="3.5" height="20" fill="${b.color}" stroke="${b.border}" stroke-width="0.75" rx="0.5" />`;
          }).join('');
        } else {
          // 4 Bandas estándar (d1, d2, mult, tol)
          const positions = [24, 33, 42, 53];
          bandsSvg = bands.map((b, i) => {
            const bx = positions[i] || (24 + i * 9);
            return `<rect x="${bx}" y="10" width="4.5" height="20" fill="${b.color}" stroke="${b.border}" stroke-width="0.75" rx="0.5" />`;
          }).join('');
        }

        return `
          <!-- Terminales metálicos de conexión -->
          <line x1="0" y1="20" x2="16" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <line x1="64" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>

          <!-- Cuerpo cerámico clásico color beige/tan para contraste óptimo de bandas -->
          <rect x="16" y="10" width="48" height="20" rx="4" fill="#D4C5A9" stroke="#9E9484" stroke-width="1.2"/>
          <!-- Casquillos metálicos en los extremos -->
          <rect x="16" y="9" width="4.5" height="22" rx="2" fill="#B5AD9E" stroke="#877E6F" stroke-width="0.8"/>
          <rect x="59.5" y="9" width="4.5" height="22" rx="2" fill="#B5AD9E" stroke="#877E6F" stroke-width="0.8"/>

          <!-- Bandas de colores normalizadas IEC 60062 -->
          ${bandsSvg}

          <!-- Brillo superior para volumen visual tridimensional -->
          <rect x="21" y="11" width="38" height="2" fill="#FFFFFF" opacity="0.3" rx="1"/>
        `;
      }

      // Símbolo esquemático de zigzag tradicional si no hay bandas válidas
      return `
        <line x1="0" y1="20" x2="16" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polyline points="16,20 22,12 30,28 38,12 46,28 54,12 60,24 64,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
        <line x1="64" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;
    }

    case 'potentiometer':
      return `
        <line x1="0" y1="20" x2="15" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polyline points="15,20 20,10 30,30 40,10 50,30 60,10 65,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
        <line x1="65" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Flecha del cursor central -->
        <line x1="40" y1="60" x2="40" y2="34" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="40,28 36,36 44,36" fill="${stroke}"/>
      `;

    case 'photoresistor':
      return `
        <line x1="0" y1="20" x2="15" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polyline points="15,20 20,10 30,30 40,10 50,30 60,10 65,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
        <line x1="65" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Flechas de luz incidente -->
        <line x1="24" y1="2" x2="32" y2="10" stroke="${stroke}" stroke-width="1.5"/>
        <polygon points="33,11 28,9 31,6" fill="${stroke}"/>
        <line x1="36" y1="2" x2="44" y2="10" stroke="${stroke}" stroke-width="1.5"/>
        <polygon points="45,11 40,9 43,6" fill="${stroke}"/>
      `;

    case 'thermistor':
      return `
        <line x1="0" y1="20" x2="15" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polyline points="15,20 20,10 30,30 40,10 50,30 60,10 65,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
        <line x1="65" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Barra diagonal NTC -->
        <line x1="18" y1="34" x2="62" y2="6" stroke="${stroke}" stroke-width="1.5"/>
        <line x1="14" y1="34" x2="18" y2="34" stroke="${stroke}" stroke-width="1.5"/>
      `;

    // ==================== CAPACITORES ====================
    case 'cap_ceramic':
      return `
        <line x1="0" y1="20" x2="26" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Dos placas paralelas -->
        <line x1="26" y1="8" x2="26" y2="32" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <line x1="34" y1="8" x2="34" y2="32" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <line x1="34" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'cap_electrolytic':
      return `
        <line x1="0" y1="20" x2="26" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Placa plana positiva -->
        <line x1="26" y1="8" x2="26" y2="32" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <!-- Placa curva negativa -->
        <path d="M 34 8 Q 38 20 34 32" fill="none" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <line x1="36" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <text x="18" y="14" font-size="9" fill="${stroke}" font-family="monospace">+</text>
      `;

    // ==================== SEMICONDUCTORES ====================
    case 'diode':
      return `
        <line x1="0" y1="20" x2="22" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Triángulo del ánodo -->
        <polygon points="22,10 22,30 38,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Barra de cátodo -->
        <line x1="38" y1="10" x2="38" y2="30" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <line x1="38" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'zener_diode':
      return `
        <line x1="0" y1="20" x2="22" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="22,10 22,30 38,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Barra Zener doblada -->
        <polyline points="44,8 38,10 38,30 32,32" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="38" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'led': {
      const ledColor = comp?.params?.color || 'Rojo';
      let accentCol = '#EF4444';
      if (ledColor === 'Verde') accentCol = '#10B981';
      else if (ledColor === 'Azul') accentCol = '#3B82F6';
      else if (ledColor === 'Amarillo') accentCol = '#F59E0B';
      else if (ledColor === 'Blanco') accentCol = '#E2E8F0';

      return `
        <!-- Terminal Ánodo (A) -->
        <line x1="0" y1="25" x2="22" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Símbolo de diodo: Triángulo esquemático (sin simulación ficticia de encendido) -->
        <polygon points="22,15 22,35 38,25" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Barra de Cátodo (K) -->
        <line x1="38" y1="15" x2="38" y2="35" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <!-- Terminal Cátodo (K) -->
        <line x1="38" y1="25" x2="60" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Flechas normalizadas de emisión óptica -->
        <line x1="33" y1="13" x2="43" y2="5" stroke="${accentCol}" stroke-width="1.5"/>
        <polygon points="44,4 39,5 42,8" fill="${accentCol}"/>
        <line x1="40" y1="15" x2="50" y2="7" stroke="${accentCol}" stroke-width="1.5"/>
        <polygon points="51,6 46,7 49,10" fill="${accentCol}"/>
      `;
    }

    case 'transistor_npn':
      return `
        <!-- Base -->
        <line x1="0" y1="30" x2="26" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="26" y1="14" x2="26" y2="46" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <!-- Colector -->
        <line x1="26" y1="20" x2="45" y2="10" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="10" x2="45" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Emisor con flecha saliente -->
        <line x1="26" y1="40" x2="45" y2="50" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="44,50 35,42 41,40" fill="${stroke}"/>
        <line x1="45" y1="50" x2="45" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="34" cy="30" r="22" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="2,2"/>
      `;

    case 'transistor_pnp':
      return `
        <!-- Base -->
        <line x1="0" y1="30" x2="26" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="26" y1="14" x2="26" y2="46" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <!-- Emisor con flecha entrante -->
        <line x1="45" y1="0" x2="45" y2="10" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="10" x2="26" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="27,20 36,22 34,16" fill="${stroke}"/>
        <!-- Colector -->
        <line x1="26" y1="40" x2="45" y2="50" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="50" x2="45" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="34" cy="30" r="22" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="2,2"/>
      `;

    case 'mosfet_n':
      return `
        <!-- Compuerta -->
        <line x1="0" y1="30" x2="20" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="20" y1="16" x2="20" y2="44" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <!-- Canal -->
        <line x1="27" y1="14" x2="27" y2="22" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <line x1="27" y1="26" x2="27" y2="34" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <line x1="27" y1="38" x2="27" y2="46" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <!-- Drenador -->
        <line x1="27" y1="18" x2="45" y2="18" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="18" x2="45" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Fuente y sustrato -->
        <line x1="27" y1="42" x2="45" y2="42" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="42" x2="45" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="27" y1="30" x2="45" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="45" y1="30" x2="45" y2="42" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <polygon points="28,30 36,27 36,33" fill="${stroke}"/>
      `;

    // ==================== INTERRUPTORES ====================
    case 'switch_spst': {
      const isClosed = comp?.params?.state === 'closed';
      const armY2 = isClosed ? 20 : 8;
      return `
        <line x1="0" y1="20" x2="18" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="20" cy="20" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Brazo de contacto (interactivo) -->
        <line x1="20" y1="20" x2="42" y2="${armY2}" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
        <circle cx="42" cy="20" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="44" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;
    }

    case 'switch_spdt': {
      const pos = comp?.params?.position || '1';
      const armTargetY = pos === '2' ? 45 : 15;
      return `
        <line x1="0" y1="30" x2="18" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="20" cy="30" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Brazo COM a contacto 1 o 2 -->
        <line x1="20" y1="30" x2="42" y2="${armTargetY}" stroke="${stroke}" stroke-width="${strokeWidth + 0.5}"/>
        <circle cx="44" cy="15" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="47" y1="15" x2="60" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="44" cy="45" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="47" y1="45" x2="60" y2="45" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;
    }

    case 'push_button':
    case 'push_button_nc': {
      const isNC = (comp?.type === 'push_button_nc' || comp?.params?.buttonType === 'NC');
      const isPressed = comp?.params?.state === 'pressed';

      if (isNC) {
        // Pulsador Normalmente Cerrado (NC):
        // En reposo (released): barra tocando terminales por abajo (hace contacto).
        // Presionado (pressed): barra empujada hacia abajo alejándose de los contactos (abre circuito).
        const barY = isPressed ? 27 : 20;
        const stemTop = barY;
        const stemBottom = barY + 7;
        return `
          <line x1="0" y1="20" x2="20" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <circle cx="22" cy="20" r="2.5" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <circle cx="38" cy="20" r="2.5" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <line x1="40" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <!-- Barra conductora móvil (NC) -->
          <line x1="18" y1="${barY}" x2="42" y2="${barY}" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
          <!-- Vástago y pulsador mecánico -->
          <line x1="30" y1="${stemTop}" x2="30" y2="${stemBottom}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <rect x="24" y="${stemBottom}" width="12" height="3" rx="1" fill="${stroke}"/>
        `;
      } else {
        // Pulsador Normalmente Abierto (NO):
        // En reposo (released): barra por encima (circuito abierto).
        // Presionado (pressed): barra bajada tocando terminales (cierra circuito).
        const barY = isPressed ? 20 : 12;
        const stemTop = isPressed ? 13 : 5;
        return `
          <line x1="0" y1="20" x2="20" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <circle cx="22" cy="20" r="2.5" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <circle cx="38" cy="20" r="2.5" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <line x1="40" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <!-- Barra conductora móvil (NO) -->
          <line x1="18" y1="${barY}" x2="42" y2="${barY}" stroke="${stroke}" stroke-width="${strokeWidth + 1}"/>
          <!-- Vástago y pulsador mecánico -->
          <line x1="30" y1="${barY}" x2="30" y2="${stemTop}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
          <rect x="24" y="${stemTop - 3}" width="12" height="3" rx="1" fill="${stroke}"/>
        `;
      }
    }

    // ==================== COMPUERTAS LÓGICAS ====================
    case 'gate_and':
      return `
        <line x1="0" y1="15" x2="20" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="35" x2="20" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Cuerpo AND -->
        <path d="M 20 8 L 35 8 A 17 17 0 0 1 35 42 L 20 42 Z" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="52" y1="25" x2="70" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gate_or':
      return `
        <line x1="0" y1="15" x2="24" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="35" x2="24" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Cuerpo OR -->
        <path d="M 18 8 Q 28 25 18 42 Q 40 42 55 25 Q 40 8 18 8 Z" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="55" y1="25" x2="70" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gate_not':
      return `
        <line x1="0" y1="20" x2="18" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Triángulo inversor -->
        <polygon points="18,8 18,32 40,20" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Círculo de negación -->
        <circle cx="44" cy="20" r="3.5" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="48" y1="20" x2="60" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gate_nand':
      return `
        <line x1="0" y1="15" x2="18" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="35" x2="18" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <path d="M 18 8 L 33 8 A 17 17 0 0 1 33 42 L 18 42 Z" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="53" cy="25" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="56" y1="25" x2="70" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gate_nor':
      return `
        <line x1="0" y1="15" x2="22" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="35" x2="22" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <path d="M 16 8 Q 26 25 16 42 Q 38 42 51 25 Q 38 8 16 8 Z" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="54" cy="25" r="3" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="57" y1="25" x2="70" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    case 'gate_xor':
      return `
        <line x1="0" y1="15" x2="22" y2="15" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="35" x2="22" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Arco adicional XOR -->
        <path d="M 16 8 Q 26 25 16 42" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Cuerpo OR -->
        <path d="M 22 8 Q 32 25 22 42 Q 42 42 56 25 Q 42 8 22 8 Z" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="56" y1="25" x2="70" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      `;

    // ==================== CIRCUITOS INTEGRADOS ====================
    case 'ic_555':
      return `
        <!-- Pines externos izquierdos -->
        <line x1="0" y1="20" x2="20" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="40" x2="20" y2="40" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="60" x2="20" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="80" x2="20" y2="80" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Pines externos derechos -->
        <line x1="80" y1="20" x2="100" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="80" y1="40" x2="100" y2="40" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="80" y1="60" x2="100" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="80" y1="80" x2="100" y2="80" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Encapsulado DIP-8 -->
        <rect x="20" y="8" width="60" height="84" rx="3" fill="var(--bg-panel, #161e2e)" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Muesca de orientación pin 1 -->
        <path d="M 45 8 A 5 5 0 0 1 55 8" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <text x="50" y="52" font-size="10" font-weight="bold" text-anchor="middle" fill="${stroke}" font-family="monospace">NE555</text>
      `;

    case 'ic_741':
      return `
        <line x1="0" y1="20" x2="20" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="50" x2="20" y2="50" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="40" y1="0" x2="40" y2="12" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="40" y1="58" x2="40" y2="70" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="68" y1="35" x2="80" y2="35" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Triángulo Op-Amp -->
        <polygon points="20,10 20,60 68,35" fill="var(--bg-panel, #161e2e)" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Etiquetas de entrada -->
        <text x="24" y="24" font-size="11" fill="${stroke}" font-family="monospace">-</text>
        <text x="24" y="52" font-size="11" fill="${stroke}" font-family="monospace">+</text>
      `;

    case 'ic_4017':
      return `
        <!-- Pines de entrada -->
        <line x1="0" y1="30" x2="22" y2="30" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="60" x2="22" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="0" y1="90" x2="22" y2="90" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Pines de salida -->
        <line x1="88" y1="20" x2="110" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="88" y1="40" x2="110" y2="40" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="88" y1="60" x2="110" y2="60" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="88" y1="80" x2="110" y2="80" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="88" y1="100" x2="110" y2="100" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Cuerpo -->
        <rect x="22" y="10" width="66" height="92" rx="3" fill="var(--bg-panel, #161e2e)" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <text x="55" y="58" font-size="10" font-weight="bold" text-anchor="middle" fill="${stroke}" font-family="monospace">CD4017</text>
      `;

    case 'ic_7805':
      return `
        <line x1="0" y1="25" x2="20" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="60" y1="25" x2="80" y2="25" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <line x1="40" y1="40" x2="40" y2="50" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <rect x="20" y="10" width="40" height="30" rx="2" fill="var(--bg-panel, #161e2e)" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <text x="40" y="28" font-size="9" font-weight="bold" text-anchor="middle" fill="${stroke}" font-family="monospace">7805</text>
      `;

    default:
      return `<rect x="5" y="5" width="50" height="30" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
  }
}
