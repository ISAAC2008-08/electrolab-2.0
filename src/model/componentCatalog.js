/**
 * ElectroLab 2.0 - Catálogo de Componentes Electrónicos
 * Definición unificada de especificaciones, pines, símbolos SVG,
 * parámetros por defecto y fórmulas asociadas.
 */

export const COMPONENT_CATEGORIES = [
  { id: 'sources', name: 'Fuentes de Alimentación', icon: 'zap' },
  { id: 'resistors', name: 'Resistencias y Pasivos', icon: 'activity' },
  { id: 'capacitors', name: 'Capacitores', icon: 'disc' },
  { id: 'semiconductors', name: 'Semiconductores', icon: 'cpu' },
  { id: 'switches', name: 'Interruptores y Control', icon: 'toggle-left' },
  { id: 'logic', name: 'Compuertas Lógicas', icon: 'git-merge' },
  { id: 'ics', name: 'Circuitos Integrados', icon: 'box' }
];

export const COMPONENT_CATALOG = {
  // ==================== FUENTES ====================
  'dc_source': {
    type: 'dc_source',
    category: 'sources',
    name: 'Fuente DC (Voltaje)',
    prefix: 'V',
    defaultValue: 5,
    unit: 'V',
    width: 60,
    height: 60,
    description: 'Fuente de tensión continua constante e ideal.',
    pins: [
      { id: 'p_plus', label: '+', x: 30, y: 0, direction: 'top' },
      { id: 'p_minus', label: '-', x: 30, y: 60, direction: 'bottom' }
    ],
    params: {
      voltage: { label: 'Tensión', value: 5, unit: 'V', min: 0.1, max: 1000 },
      internalResistance: { label: 'Resistencia Interna', value: 0.01, unit: 'Ω', min: 0, max: 100 }
    },
    formulas: [
      { name: 'Tensión en terminales', eq: 'V_{out} = V_s - I \\cdot R_{int}' },
      { name: 'Potencia entregada', eq: 'P = V \\cdot I' }
    ]
  },
  'battery': {
    type: 'battery',
    category: 'sources',
    name: 'Batería 9V / Celda',
    prefix: 'BT',
    defaultValue: 9,
    unit: 'V',
    width: 60,
    height: 60,
    description: 'Batería electroquímica de corriente directa.',
    pins: [
      { id: 'p_plus', label: '+', x: 30, y: 0, direction: 'top' },
      { id: 'p_minus', label: '-', x: 30, y: 60, direction: 'bottom' }
    ],
    params: {
      voltage: { label: 'Tensión Nominal', value: 9, unit: 'V', min: 1.2, max: 48 },
      capacity: { label: 'Capacidad', value: 550, unit: 'mAh', min: 50, max: 10000 }
    },
    formulas: [
      { name: 'Energía almacenada', eq: 'E = V \\cdot Q_{Ah}' },
      { name: 'Tiempo de descarga', eq: 't = C / I_{carga}' }
    ]
  },
  'ac_source': {
    type: 'ac_source',
    category: 'sources',
    name: 'Fuente AC (Alterna)',
    prefix: 'VAC',
    defaultValue: 120,
    unit: 'V',
    width: 60,
    height: 60,
    description: 'Generador sinusoidal de corriente alterna.',
    pins: [
      { id: 'p_live', label: '~', x: 30, y: 0, direction: 'top' },
      { id: 'p_neutral', label: '~', x: 30, y: 60, direction: 'bottom' }
    ],
    params: {
      voltage: { label: 'Tensión RMS', value: 120, unit: 'V', min: 1, max: 400 },
      frequency: { label: 'Frecuencia', value: 60, unit: 'Hz', min: 0.1, max: 1e6 }
    },
    formulas: [
      { name: 'Tensión instantánea', eq: 'v(t) = V_{pk} \\cdot \\sin(2\\pi f t)' },
      { name: 'Relación RMS a Pico', eq: 'V_{pk} = V_{rms} \\cdot \\sqrt{2}' }
    ]
  },
  'gnd': {
    type: 'gnd',
    category: 'sources',
    name: 'Tierra / Masa (GND)',
    prefix: 'GND',
    defaultValue: 0,
    unit: 'V',
    width: 40,
    height: 40,
    description: 'Nodo de referencia de potencial cero (0 voltios).',
    pins: [
      { id: 'p_gnd', label: 'GND', x: 20, y: 0, direction: 'top' }
    ],
    params: {},
    formulas: [
      { name: 'Potencial de referencia', eq: 'V_{GND} = 0.00\\text{ V}' }
    ]
  },
  'junction_node': {
    type: 'junction_node',
    category: 'sources',
    name: 'Nodo de Conexión (Unión)',
    prefix: 'N',
    defaultValue: 0,
    unit: '',
    width: 24,
    height: 24,
    description: 'Punto de unión eléctrica equipotencial para ramificar conductores.',
    pins: [
      { id: 'p_node', label: 'Nodo', x: 12, y: 12, direction: 'center' }
    ],
    params: {},
    formulas: [
      { name: 'Ley de Corrientes de Kirchhoff (LCK)', eq: '\\sum I_{entrantes} = \\sum I_{salientes}' }
    ]
  },
  'current_source': {
    type: 'current_source',
    category: 'sources',
    name: 'Fuente de Corriente DC',
    prefix: 'I',
    defaultValue: 0.02,
    unit: 'A',
    width: 60,
    height: 60,
    description: 'Generador de corriente constante ideal.',
    pins: [
      { id: 'p_out', label: '+', x: 30, y: 0, direction: 'top' },
      { id: 'p_in', label: '-', x: 30, y: 60, direction: 'bottom' }
    ],
    params: {
      current: { label: 'Corriente', value: 20, unit: 'mA', min: 0.1, max: 10000 }
    },
    formulas: [
      { name: 'Ley de Kirchhoff de Corrientes', eq: '\\sum I_{entrantes} = \\sum I_{salientes}' }
    ]
  },

  // ==================== RESISTENCIAS ====================
  'resistor': {
    type: 'resistor',
    category: 'resistors',
    name: 'Resistencia Fija',
    prefix: 'R',
    defaultValue: 10000,
    unit: 'Ω',
    width: 80,
    height: 40,
    description: 'Elemento pasivo lineal disipador de energía según Ley de Ohm.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 80, y: 20, direction: 'right' }
    ],
    params: {
      resistance: { label: 'Resistencia', value: 10, unit: '', min: 0.1, max: 100000 },
      resistanceUnit: { label: 'Unidad', value: 'kΩ', options: ['Ω', 'kΩ', 'MΩ'] },
      bandCount: { label: 'Número de Bandas', value: 4, options: [4, 5] },
      tolerance: { label: 'Tolerancia', value: 5, options: [5, 10, 1, 2] },
      powerRating: { label: 'Potencia Máx.', value: 0.25, unit: 'W', min: 0.125, max: 50 }
    },
    formulas: [
      { name: 'Ley de Ohm', eq: 'V = I \\cdot R' },
      { name: 'Conductancia eléctrica', eq: 'G = \\frac{1}{R} = \\frac{I}{V}' },
      { name: 'Potencia disipada', eq: 'P = I^2 \\cdot R = \\frac{V^2}{R}' }
    ]
  },
  'potentiometer': {
    type: 'potentiometer',
    category: 'resistors',
    name: 'Potenciómetro',
    prefix: 'POT',
    defaultValue: 10000,
    unit: 'Ω',
    width: 80,
    height: 60,
    description: 'Resistor de tres terminales con divisor de tensión ajustable.',
    pins: [
      { id: 'p1', label: 'A', x: 0, y: 20, direction: 'left' },
      { id: 'pw', label: 'W', x: 40, y: 60, direction: 'bottom' },
      { id: 'p2', label: 'B', x: 80, y: 20, direction: 'right' }
    ],
    params: {
      resistance: { label: 'Resistencia Total', value: 10, unit: 'kΩ', min: 1, max: 1000 },
      position: { label: 'Posición Cursor', value: 50, unit: '%', min: 0, max: 100 }
    },
    formulas: [
      { name: 'Divisor de Tensión', eq: 'V_W = V_{AB} \\cdot \\frac{R_{W}}{R_{Total}}' }
    ]
  },
  'photoresistor': {
    type: 'photoresistor',
    category: 'resistors',
    name: 'Fotorresistencia (LDR)',
    prefix: 'LDR',
    defaultValue: 10000,
    unit: 'Ω',
    width: 80,
    height: 40,
    description: 'Resistencia fotosensible cuyo valor decrece con la luz.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 80, y: 20, direction: 'right' }
    ],
    params: {
      lux: { label: 'Iluminación', value: 300, unit: 'lux', min: 1, max: 10000 }
    },
    formulas: [
      { name: 'Relación Luz-Resistencia', eq: 'R = R_0 \\cdot (E / E_0)^{-\\gamma}' }
    ]
  },
  'thermistor': {
    type: 'thermistor',
    category: 'resistors',
    name: 'Termistor NTC',
    prefix: 'TH',
    defaultValue: 10000,
    unit: 'Ω',
    width: 80,
    height: 40,
    description: 'Resistor con coeficiente de temperatura negativo.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 80, y: 20, direction: 'right' }
    ],
    params: {
      temp: { label: 'Temperatura', value: 25, unit: '°C', min: -40, max: 125 }
    },
    formulas: [
      { name: 'Ecuación de Steinhart-Hart', eq: '1/T = A + B \\ln(R) + C (\\ln(R))^3' }
    ]
  },

  // ==================== CAPACITORES ====================
  'cap_ceramic': {
    type: 'cap_ceramic',
    category: 'capacitors',
    name: 'Capacitor Cerámico',
    prefix: 'C',
    defaultValue: 100,
    unit: 'nF',
    width: 60,
    height: 40,
    description: 'Condensador no polarizado para filtrado de alta frecuencia.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      capacitance: { label: 'Capacitancia', value: 100, unit: 'nF', min: 1, max: 10000 },
      voltageMax: { label: 'Tensión Máxima', value: 50, unit: 'V', min: 10, max: 500 }
    },
    formulas: [
      { name: 'Carga Almacenada', eq: 'Q = C \\cdot V' },
      { name: 'Reactancia Capacitiva', eq: 'X_c = \\frac{1}{2\\pi f C}' }
    ]
  },
  'cap_electrolytic': {
    type: 'cap_electrolytic',
    category: 'capacitors',
    name: 'Capacitor Electrolítico',
    prefix: 'CE',
    defaultValue: 100,
    unit: 'μF',
    width: 60,
    height: 40,
    description: 'Condensador polarizado para filtrado de fuentes y desacoplo.',
    pins: [
      { id: 'p_plus', label: '+', x: 0, y: 20, direction: 'left' },
      { id: 'p_minus', label: '-', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      capacitance: { label: 'Capacitancia', value: 100, unit: 'μF', min: 1, max: 10000 },
      voltageMax: { label: 'Tensión Límite', value: 25, unit: 'V', min: 6.3, max: 450 }
    },
    formulas: [
      { name: 'Energía Almacenada', eq: 'E = \\frac{1}{2} C V^2' },
      { name: 'Constante de Tiempo RC', eq: '\\tau = R \\cdot C' }
    ]
  },

  // ==================== SEMICONDUCTORES ====================
  'diode': {
    type: 'diode',
    category: 'semiconductors',
    name: 'Diodo Rectificador (1N4007)',
    prefix: 'D',
    defaultValue: 0.7,
    unit: 'V',
    width: 60,
    height: 40,
    description: 'Permite el paso de corriente únicamente en polarización directa.',
    pins: [
      { id: 'p_anode', label: 'A', x: 0, y: 20, direction: 'left' },
      { id: 'p_cathode', label: 'K', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      vf: { label: 'Tensión Directa Vf', value: 0.7, unit: 'V', min: 0.2, max: 1.5 },
      ir: { label: 'Corriente Inversa Ir', value: 5, unit: 'μA', min: 0.01, max: 100 }
    },
    formulas: [
      { name: 'Ecuación de Shockley', eq: 'I = I_s \\left( e^{\\frac{V_D}{\\eta V_T}} - 1 \\right)' }
    ]
  },
  'zener_diode': {
    type: 'zener_diode',
    category: 'semiconductors',
    name: 'Diodo Zener',
    prefix: 'DZ',
    defaultValue: 5.1,
    unit: 'V',
    width: 60,
    height: 40,
    description: 'Diodo para regulación por tensión de avalancha Zener.',
    pins: [
      { id: 'p_anode', label: 'A', x: 0, y: 20, direction: 'left' },
      { id: 'p_cathode', label: 'K', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      vz: { label: 'Tensión Zener Vz', value: 5.1, unit: 'V', min: 2.4, max: 36 }
    },
    formulas: [
      { name: 'Regulación de Tensión', eq: 'V_{out} = V_Z' }
    ]
  },
  'led': {
    type: 'led',
    category: 'semiconductors',
    name: 'Diodo LED Emisor de Luz',
    prefix: 'LED',
    defaultValue: 2.1,
    unit: 'V',
    width: 60,
    height: 50,
    description: 'Diodo electroluminiscente para señalización o iluminación.',
    pins: [
      { id: 'p_anode', label: 'A', x: 0, y: 25, direction: 'left' },
      { id: 'p_cathode', label: 'K', x: 60, y: 25, direction: 'right' }
    ],
    params: {
      color: { label: 'Color Emisión', value: 'Rojo', options: ['Rojo', 'Verde', 'Azul', 'Amarillo', 'Blanco'] },
      vf: { label: 'Caída de Tensión', value: 2.0, unit: 'V', min: 1.6, max: 3.5 },
      ratedCurrent: { label: 'Corriente Nominal', value: 20, unit: 'mA', min: 5, max: 50 }
    },
    formulas: [
      { name: 'Cálculo de R limitadora', eq: 'R = \\frac{V_{cc} - V_{led}}{I_{led}}' }
    ]
  },
  'transistor_npn': {
    type: 'transistor_npn',
    category: 'semiconductors',
    name: 'Transistor BJT NPN (2N2222)',
    prefix: 'Q',
    defaultValue: 100,
    unit: 'hFE',
    width: 60,
    height: 60,
    description: 'Transistor bipolar NPN para conmutación y amplificación.',
    pins: [
      { id: 'p_base', label: 'B', x: 0, y: 30, direction: 'left' },
      { id: 'p_collector', label: 'C', x: 45, y: 0, direction: 'top' },
      { id: 'p_emitter', label: 'E', x: 45, y: 60, direction: 'bottom' }
    ],
    params: {
      hfe: { label: 'Ganancia (hFE/β)', value: 100, unit: '', min: 10, max: 800 },
      vbe: { label: 'Tensión V_BE', value: 0.7, unit: 'V', min: 0.5, max: 0.9 }
    },
    formulas: [
      { name: 'Corriente de Colector', eq: 'I_C = \\beta \\cdot I_B' },
      { name: 'Ley de Corrientes BJT', eq: 'I_E = I_B + I_C' }
    ]
  },
  'transistor_pnp': {
    type: 'transistor_pnp',
    category: 'semiconductors',
    name: 'Transistor BJT PNP (2N3906)',
    prefix: 'Q',
    defaultValue: 100,
    unit: 'hFE',
    width: 60,
    height: 60,
    description: 'Transistor bipolar PNP activado por nivel bajo en base.',
    pins: [
      { id: 'p_base', label: 'B', x: 0, y: 30, direction: 'left' },
      { id: 'p_emitter', label: 'E', x: 45, y: 0, direction: 'top' },
      { id: 'p_collector', label: 'C', x: 45, y: 60, direction: 'bottom' }
    ],
    params: {
      hfe: { label: 'Ganancia (hFE/β)', value: 100, unit: '', min: 10, max: 800 }
    },
    formulas: [
      { name: 'Corriente de Emisor', eq: 'I_E = I_B + I_C' }
    ]
  },
  'mosfet_n': {
    type: 'mosfet_n',
    category: 'semiconductors',
    name: 'MOSFET Canal N',
    prefix: 'M',
    defaultValue: 0.05,
    unit: 'Ω',
    width: 60,
    height: 60,
    description: 'Transistor de efecto de campo por compuerta aislada para potencia.',
    pins: [
      { id: 'p_gate', label: 'G', x: 0, y: 30, direction: 'left' },
      { id: 'p_drain', label: 'D', x: 45, y: 0, direction: 'top' },
      { id: 'p_source', label: 'S', x: 45, y: 60, direction: 'bottom' }
    ],
    params: {
      vth: { label: 'Tensión Umbral V_th', value: 2.5, unit: 'V', min: 1, max: 5 },
      rds_on: { label: 'Resistencia R_ds(on)', value: 0.04, unit: 'Ω', min: 0.005, max: 2 }
    },
    formulas: [
      { name: 'Potencia en conducción', eq: 'P = I_D^2 \\cdot R_{DS(on)}' }
    ]
  },

  // ==================== INTERRUPTORES ====================
  'switch_spst': {
    type: 'switch_spst',
    category: 'switches',
    name: 'Interruptor SPST',
    prefix: 'SW',
    defaultValue: 'open',
    unit: '',
    width: 60,
    height: 40,
    description: 'Interruptor unipolar de un solo tiro (abierto / cerrado).',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      state: { label: 'Estado', value: 'open', options: ['open', 'closed'] }
    },
    formulas: [
      { name: 'Resistencia de contacto', eq: 'R_{cerrado} \\approx 0 \\,\\Omega, \\; R_{abierto} \\to \\infty' }
    ]
  },
  'switch_spdt': {
    type: 'switch_spdt',
    category: 'switches',
    name: 'Interruptor SPDT (Conmutador)',
    prefix: 'SW',
    defaultValue: 'pos1',
    unit: '',
    width: 60,
    height: 60,
    description: 'Conmutador unipolar de doble tiro.',
    pins: [
      { id: 'p_common', label: 'COM', x: 0, y: 30, direction: 'left' },
      { id: 'p1', label: '1', x: 60, y: 15, direction: 'right' },
      { id: 'p2', label: '2', x: 60, y: 45, direction: 'right' }
    ],
    params: {
      position: { label: 'Posición Activa', value: '1', options: ['1', '2'] }
    },
    formulas: [
      { name: 'Conmutación de línea', eq: '\\text{COM} \\leftrightarrow \\text{Tiro Seleccionado}' }
    ]
  },
  'push_button': {
    type: 'push_button',
    category: 'switches',
    name: 'Pulsador NA (Normalmente Abierto)',
    prefix: 'PB',
    defaultValue: 'released',
    unit: '',
    width: 60,
    height: 40,
    description: 'Pulsador momentáneo Normalmente Abierto (NO). Cierra el contacto al presionar y lo abre al soltar.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      buttonType: { label: 'Tipo de Contacto', value: 'NO', options: ['NO', 'NC'] },
      state: { label: 'Estado Momentáneo', value: 'released', options: ['released', 'pressed'] }
    },
    formulas: [
      { name: 'Contacto momentáneo NA', eq: 'R_{presionado} \\approx 0 \\,\\Omega, \\; R_{reposo} \\to \\infty' }
    ]
  },
  'push_button_nc': {
    type: 'push_button_nc',
    category: 'switches',
    name: 'Pulsador NC (Normalmente Cerrado)',
    prefix: 'PB',
    defaultValue: 'released',
    unit: '',
    width: 60,
    height: 40,
    description: 'Pulsador momentáneo Normalmente Cerrado (NC). Conduce en reposo y abre el circuito al presionar.',
    pins: [
      { id: 'p1', label: '1', x: 0, y: 20, direction: 'left' },
      { id: 'p2', label: '2', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      buttonType: { label: 'Tipo de Contacto', value: 'NC', options: ['NC', 'NO'] },
      state: { label: 'Estado Momentáneo', value: 'released', options: ['released', 'pressed'] }
    },
    formulas: [
      { name: 'Contacto momentáneo NC', eq: 'R_{reposo} \\approx 0 \\,\\Omega, \\; R_{presionado} \\to \\infty' }
    ]
  },

  // ==================== COMPUERTAS LÓGICAS ====================
  'gate_and': {
    type: 'gate_and',
    category: 'logic',
    name: 'Compuerta Lógica AND',
    prefix: 'U',
    defaultValue: '74LS08',
    unit: '',
    width: 70,
    height: 50,
    description: 'Salida alta (1) sólo cuando ambas entradas son altas.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 15, direction: 'left' },
      { id: 'in_b', label: 'B', x: 0, y: 35, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 70, y: 25, direction: 'right' }
    ],
    params: {
      tech: { label: 'Tecnología', value: 'TTL 5V', options: ['TTL 5V', 'CMOS 3.3V', 'CMOS 5V'] }
    },
    formulas: [
      { name: 'Función Booleana', eq: 'Y = A \\cdot B' }
    ]
  },
  'gate_or': {
    type: 'gate_or',
    category: 'logic',
    name: 'Compuerta Lógica OR',
    prefix: 'U',
    defaultValue: '74LS32',
    unit: '',
    width: 70,
    height: 50,
    description: 'Salida alta si al menos una de las entradas es alta.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 15, direction: 'left' },
      { id: 'in_b', label: 'B', x: 0, y: 35, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 70, y: 25, direction: 'right' }
    ],
    params: {
      tech: { label: 'Tecnología', value: 'TTL 5V', options: ['TTL 5V', 'CMOS 3.3V', 'CMOS 5V'] }
    },
    formulas: [
      { name: 'Función Booleana', eq: 'Y = A + B' }
    ]
  },
  'gate_not': {
    type: 'gate_not',
    category: 'logic',
    name: 'Inversor Lógico NOT',
    prefix: 'U',
    defaultValue: '74LS04',
    unit: '',
    width: 60,
    height: 40,
    description: 'Invierte el estado lógico de la entrada.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 20, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 60, y: 20, direction: 'right' }
    ],
    params: {
      tech: { label: 'Tecnología', value: 'TTL 5V', options: ['TTL 5V', 'CMOS 3.3V', 'CMOS 5V'] }
    },
    formulas: [
      { name: 'Función Booleana', eq: 'Y = \\overline{A}' }
    ]
  },
  'gate_nand': {
    type: 'gate_nand',
    category: 'logic',
    name: 'Compuerta NAND (Universal)',
    prefix: 'U',
    defaultValue: '74LS00',
    unit: '',
    width: 70,
    height: 50,
    description: 'Compuerta universal: negación del producto lógico.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 15, direction: 'left' },
      { id: 'in_b', label: 'B', x: 0, y: 35, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 70, y: 25, direction: 'right' }
    ],
    params: {},
    formulas: [
      { name: 'Función Booleana', eq: 'Y = \\overline{A \\cdot B}' }
    ]
  },
  'gate_nor': {
    type: 'gate_nor',
    category: 'logic',
    name: 'Compuerta NOR',
    prefix: 'U',
    defaultValue: '74LS02',
    unit: '',
    width: 70,
    height: 50,
    description: 'Salida alta únicamente cuando ambas entradas son bajas.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 15, direction: 'left' },
      { id: 'in_b', label: 'B', x: 0, y: 35, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 70, y: 25, direction: 'right' }
    ],
    params: {},
    formulas: [
      { name: 'Función Booleana', eq: 'Y = \\overline{A + B}' }
    ]
  },
  'gate_xor': {
    type: 'gate_xor',
    category: 'logic',
    name: 'Compuerta OR Exclusiva (XOR)',
    prefix: 'U',
    defaultValue: '74LS86',
    unit: '',
    width: 70,
    height: 50,
    description: 'Salida alta si exactamente una de las entradas es alta.',
    pins: [
      { id: 'in_a', label: 'A', x: 0, y: 15, direction: 'left' },
      { id: 'in_b', label: 'B', x: 0, y: 35, direction: 'left' },
      { id: 'out_y', label: 'Y', x: 70, y: 25, direction: 'right' }
    ],
    params: {},
    formulas: [
      { name: 'Función Booleana', eq: 'Y = A \\oplus B = A\\overline{B} + \\overline{A}B' }
    ]
  },

  // ==================== CIRCUITOS INTEGRADOS ====================
  'ic_555': {
    type: 'ic_555',
    category: 'ics',
    name: 'Temporizador NE555 (DIP-8)',
    prefix: 'U',
    defaultValue: 'NE555',
    unit: '',
    width: 100,
    height: 100,
    description: 'Circuito integrado clásico para generación de pulsos y oscilación.',
    pins: [
      // Lado izquierdo
      { id: 'p1_gnd', label: '1:GND', x: 0, y: 20, direction: 'left' },
      { id: 'p2_trig', label: '2:TRIG', x: 0, y: 40, direction: 'left' },
      { id: 'p3_out', label: '3:OUT', x: 0, y: 60, direction: 'left' },
      { id: 'p4_reset', label: '4:RST', x: 0, y: 80, direction: 'left' },
      // Lado derecho
      { id: 'p8_vcc', label: '8:VCC', x: 100, y: 20, direction: 'right' },
      { id: 'p7_disch', label: '7:DIS', x: 100, y: 40, direction: 'right' },
      { id: 'p6_thres', label: '6:THR', x: 100, y: 60, direction: 'right' },
      { id: 'p5_ctrl', label: '5:CV', x: 100, y: 80, direction: 'right' }
    ],
    params: {
      mode: { label: 'Modo Típico', value: 'Astable', options: ['Astable', 'Monoestable', 'Biestable'] }
    },
    formulas: [
      { name: 'Frecuencia Astable', eq: 'f = \\frac{1.44}{(R_1 + 2 R_2) \\cdot C}' },
      { name: 'Ciclo de Trabajo (Duty)', eq: 'D = \\frac{R_1 + R_2}{R_1 + 2 R_2} \\cdot 100\\%' },
      { name: 'Tiempo Alto / Bajo', eq: 't_{high} = 0.693(R_1+R_2)C, \\; t_{low} = 0.693 R_2 C' }
    ]
  },
  'ic_741': {
    type: 'ic_741',
    category: 'ics',
    name: 'Amplificador Operacional LM741',
    prefix: 'U',
    defaultValue: 'LM741',
    unit: '',
    width: 80,
    height: 70,
    description: 'Op-Amp estándar para amplificación, suma y comparador.',
    pins: [
      { id: 'p_inv', label: 'IN-', x: 0, y: 20, direction: 'left' },
      { id: 'p_noninv', label: 'IN+', x: 0, y: 50, direction: 'left' },
      { id: 'p_vplus', label: 'V+', x: 40, y: 0, direction: 'top' },
      { id: 'p_vminus', label: 'V-', x: 40, y: 70, direction: 'bottom' },
      { id: 'p_out', label: 'OUT', x: 80, y: 35, direction: 'right' }
    ],
    params: {
      gainOpenLoop: { label: 'Ganancia Aol', value: 200000, unit: '', min: 10000, max: 1000000 }
    },
    formulas: [
      { name: 'Ganancia Inversora', eq: 'A_v = -\\frac{R_f}{R_{in}}' },
      { name: 'Ganancia No Inversora', eq: 'A_v = 1 + \\frac{R_f}{R_{in}}' },
      { name: 'Voltaje Salida Ideal', eq: 'V_{out} = A_{ol} \\cdot (V_+ - V_-)' }
    ]
  },
  'ic_4017': {
    type: 'ic_4017',
    category: 'ics',
    name: 'Contador Johnson CD4017',
    prefix: 'U',
    defaultValue: 'CD4017',
    unit: '',
    width: 110,
    height: 110,
    description: 'Contador secuenciador de décadas de 10 salidas activas en alto.',
    pins: [
      { id: 'p_clk', label: 'CLK', x: 0, y: 30, direction: 'left' },
      { id: 'p_rst', label: 'RST', x: 0, y: 60, direction: 'left' },
      { id: 'p_en', label: 'EN', x: 0, y: 90, direction: 'left' },
      { id: 'p_q0', label: 'Q0', x: 110, y: 20, direction: 'right' },
      { id: 'p_q1', label: 'Q1', x: 110, y: 40, direction: 'right' },
      { id: 'p_q2', label: 'Q2', x: 110, y: 60, direction: 'right' },
      { id: 'p_q3', label: 'Q3', x: 110, y: 80, direction: 'right' },
      { id: 'p_co', label: 'CO', x: 110, y: 100, direction: 'right' }
    ],
    params: {
      maxCount: { label: 'Etapas de conteo', value: 10, unit: '', min: 2, max: 10 }
    },
    formulas: [
      { name: 'Secuencia de salidas', eq: 'Q_n = 1 \\text{ en flanco ascendente}' }
    ]
  },
  'ic_7805': {
    type: 'ic_7805',
    category: 'ics',
    name: 'Regulador Lineal LM7805 (+5V)',
    prefix: 'VR',
    defaultValue: 5,
    unit: 'V',
    width: 80,
    height: 50,
    description: 'Regulador positivo de voltaje a +5V estabilizados (hasta 1.5A).',
    pins: [
      { id: 'p_in', label: 'IN', x: 0, y: 25, direction: 'left' },
      { id: 'p_gnd', label: 'GND', x: 40, y: 50, direction: 'bottom' },
      { id: 'p_out', label: 'OUT', x: 80, y: 25, direction: 'right' }
    ],
    params: {
      vout: { label: 'Tensión Regulada', value: 5.0, unit: 'V', min: 4.8, max: 5.2 },
      vinMin: { label: 'Tensión Mín. Entrada', value: 7.5, unit: 'V', min: 7.0, max: 35.0 }
    },
    formulas: [
      { name: 'Potencia Disipada', eq: 'P_D = (V_{in} - V_{out}) \\cdot I_L' }
    ]
  }
};
