/**
 * ElectroLab 2.0 - Circuitos de Ejemplo Preconfigurados
 * Permite cargar esquemas educativos listos para inspeccionar y analizar.
 */

export const PREBUILT_CIRCUITS = [
  {
    id: 'voltage_divider',
    name: 'Divisor de Tensión Resistivo (9V)',
    description: 'Circuito clásico con dos resistencias de 10kΩ en serie para reducir la tensión a la mitad (4.5V).',
    circuit: {
      components: [
        {
          id: 'v1',
          type: 'dc_source',
          name: 'V1',
          x: 200,
          y: 200,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 9, internalResistance: 0.01 },
          value: 9,
          unit: 'V'
        },
        {
          id: 'r1',
          type: 'resistor',
          name: 'R1',
          x: 390,
          y: 150,
          rotation: 90,
          width: 80,
          height: 40,
          params: { resistance: 10, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 10,
          unit: 'kΩ'
        },
        {
          id: 'r2',
          type: 'resistor',
          name: 'R2',
          x: 390,
          y: 270,
          rotation: 90,
          width: 80,
          height: 40,
          params: { resistance: 10, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 10,
          unit: 'kΩ'
        },
        {
          id: 'gnd1',
          type: 'gnd',
          name: 'GND1',
          x: 410,
          y: 390,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'w1', fromCompId: 'v1', fromPinId: 'p_plus', toCompId: 'r1', toPinId: 'p1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: 'p2', toCompId: 'r2', toPinId: 'p1' },
        { id: 'w3', fromCompId: 'r2', fromPinId: 'p2', toCompId: 'gnd1', toPinId: 'p_gnd' },
        { id: 'w4', fromCompId: 'v1', fromPinId: 'p_minus', toCompId: 'gnd1', toPinId: 'p_gnd' }
      ]
    }
  },
  {
    id: 'rc_filter',
    name: 'Filtro RC Pasa-Bajos',
    description: 'Atenúa señales de alta frecuencia. Constante de tiempo τ = R·C y frecuencia de corte fc.',
    circuit: {
      components: [
        {
          id: 'vac1',
          type: 'ac_source',
          name: 'VAC1',
          x: 220,
          y: 220,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 5, frequency: 1000 },
          value: 5,
          unit: 'V'
        },
        {
          id: 'r1',
          type: 'resistor',
          name: 'R1',
          x: 360,
          y: 200,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'c1',
          type: 'cap_ceramic',
          name: 'C1',
          x: 500,
          y: 260,
          rotation: 90,
          width: 60,
          height: 40,
          params: { capacitance: 100, voltageMax: 50 },
          value: 100,
          unit: 'nF'
        },
        {
          id: 'gnd1',
          type: 'gnd',
          name: 'GND1',
          x: 500,
          y: 380,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'w1', fromCompId: 'vac1', fromPinId: 'p_live', toCompId: 'r1', toPinId: 'p1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: 'p2', toCompId: 'c1', toPinId: 'p1' },
        { id: 'w3', fromCompId: 'c1', fromPinId: 'p2', toCompId: 'gnd1', toPinId: 'p_gnd' },
        { id: 'w4', fromCompId: 'vac1', fromPinId: 'p_neutral', toCompId: 'gnd1', toPinId: 'p_gnd' }
      ]
    }
  },
  {
    id: 'led_switch',
    name: 'Control de LED con Interruptor SPST',
    description: 'Circuito conmutado de iluminación con resistencia limitadora de 220Ω para proteger el diodo.',
    circuit: {
      components: [
        {
          id: 'bat1',
          type: 'battery',
          name: 'BT1',
          x: 220,
          y: 220,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 5, capacity: 550 },
          value: 5,
          unit: 'V'
        },
        {
          id: 'sw1',
          type: 'switch_spst',
          name: 'SW1',
          x: 340,
          y: 200,
          rotation: 0,
          width: 60,
          height: 40,
          params: { state: 'closed' },
          value: 'closed',
          unit: ''
        },
        {
          id: 'r1',
          type: 'resistor',
          name: 'R1',
          x: 460,
          y: 200,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 220, resistanceUnit: 'Ω', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 220,
          unit: 'Ω'
        },
        {
          id: 'led1',
          type: 'led',
          name: 'LED1',
          x: 580,
          y: 225,
          rotation: 90,
          width: 60,
          height: 50,
          params: { color: 'Rojo', vf: 2.0, ratedCurrent: 20 },
          value: 2.0,
          unit: 'V'
        },
        {
          id: 'gnd1',
          type: 'gnd',
          name: 'GND1',
          x: 590,
          y: 360,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'w1', fromCompId: 'bat1', fromPinId: 'p_plus', toCompId: 'sw1', toPinId: 'p1' },
        { id: 'w2', fromCompId: 'sw1', fromPinId: 'p2', toCompId: 'r1', toPinId: 'p1' },
        { id: 'w3', fromCompId: 'r1', fromPinId: 'p2', toCompId: 'led1', toPinId: 'p_anode' },
        { id: 'w4', fromCompId: 'led1', fromPinId: 'p_cathode', toCompId: 'gnd1', toPinId: 'p_gnd' },
        { id: 'w5', fromCompId: 'bat1', fromPinId: 'p_minus', toCompId: 'gnd1', toPinId: 'p_gnd' }
      ]
    }
  },
  {
    id: 'resistor_color_code_lab',
    name: 'Red de Resistencias (100 Ω, 1 kΩ, 4.7 kΩ)',
    description: 'Demostración de código de colores IEC 60062: 100Ω (Marrón-Negro-Marrón), 1kΩ (Marrón-Negro-Rojo) y 4.7kΩ (Amarillo-Violeta-Rojo).',
    circuit: {
      components: [
        {
          id: 'v_src',
          type: 'dc_source',
          name: 'V1',
          x: 180,
          y: 220,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 12 },
          value: 12,
          unit: 'V'
        },
        {
          id: 'r_100',
          type: 'resistor',
          name: 'R1',
          x: 320,
          y: 140,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 100, resistanceUnit: 'Ω', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 100,
          unit: 'Ω'
        },
        {
          id: 'r_1k',
          type: 'resistor',
          name: 'R2',
          x: 320,
          y: 240,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'r_4k7',
          type: 'resistor',
          name: 'R3',
          x: 320,
          y: 340,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 4.7, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5, powerRating: 0.25 },
          value: 4.7,
          unit: 'kΩ'
        },
        {
          id: 'gnd_ref',
          type: 'gnd',
          name: 'GND1',
          x: 480,
          y: 240,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'w_s1', fromCompId: 'v_src', fromPinId: 'p_plus', toCompId: 'r_100', toPinId: 'p1' },
        { id: 'w_s2', fromCompId: 'r_100', fromPinId: 'p1', toCompId: 'r_1k', toPinId: 'p1' },
        { id: 'w_s3', fromCompId: 'r_1k', fromPinId: 'p1', toCompId: 'r_4k7', toPinId: 'p1' },
        { id: 'w_g1', fromCompId: 'r_100', fromPinId: 'p2', toCompId: 'gnd_ref', toPinId: 'p_gnd' },
        { id: 'w_g2', fromCompId: 'r_1k', fromPinId: 'p2', toCompId: 'gnd_ref', toPinId: 'p_gnd' },
        { id: 'w_g3', fromCompId: 'r_4k7', fromPinId: 'p2', toCompId: 'gnd_ref', toPinId: 'p_gnd' },
        { id: 'w_g4', fromCompId: 'v_src', fromPinId: 'p_minus', toCompId: 'gnd_ref', toPinId: 'p_gnd' }
      ]
    }
  },
  {
    id: 'test_b_series',
    name: 'Prueba B: Circuito Serie (10V, 1kΩ + 1kΩ)',
    description: 'Fuente DC de 10V con dos resistencias de 1kΩ en serie. Resultados teóricos: RT = 2kΩ, IT = 5mA, VR1 = VR2 = 5V, PT = 50mW.',
    circuit: {
      components: [
        {
          id: 'v_src10',
          type: 'dc_source',
          name: 'V1',
          x: 220,
          y: 220,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 10 },
          value: 10,
          unit: 'V'
        },
        {
          id: 'r_s1',
          type: 'resistor',
          name: 'R1',
          x: 360,
          y: 160,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'r_s2',
          type: 'resistor',
          name: 'R2',
          x: 480,
          y: 160,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'gnd_s',
          type: 'gnd',
          name: 'GND1',
          x: 480,
          y: 320,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'ws1', fromCompId: 'v_src10', fromPinId: 'p_plus', toCompId: 'r_s1', toPinId: 'p1' },
        { id: 'ws2', fromCompId: 'r_s1', fromPinId: 'p2', toCompId: 'r_s2', toPinId: 'p1' },
        { id: 'ws3', fromCompId: 'r_s2', fromPinId: 'p2', toCompId: 'gnd_s', toPinId: 'p_gnd' },
        { id: 'ws4', fromCompId: 'v_src10', fromPinId: 'p_minus', toCompId: 'gnd_s', toPinId: 'p_gnd' }
      ]
    }
  },
  {
    id: 'test_c_parallel',
    name: 'Prueba C: Circuito Paralelo (10V, 1kΩ || 1kΩ)',
    description: 'Fuente DC de 10V con dos resistencias de 1kΩ en paralelo. Resultados teóricos: RT = 500Ω, IT = 20mA, I_ramas = 10mA, VR1 = VR2 = 10V, PT = 200mW.',
    circuit: {
      components: [
        {
          id: 'v_par10',
          type: 'dc_source',
          name: 'V1',
          x: 200,
          y: 220,
          rotation: 0,
          width: 60,
          height: 60,
          params: { voltage: 10 },
          value: 10,
          unit: 'V'
        },
        {
          id: 'r_p1',
          type: 'resistor',
          name: 'R1',
          x: 360,
          y: 160,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'r_p2',
          type: 'resistor',
          name: 'R2',
          x: 360,
          y: 280,
          rotation: 0,
          width: 80,
          height: 40,
          params: { resistance: 1, resistanceUnit: 'kΩ', bandCount: 4, tolerance: 5 },
          value: 1,
          unit: 'kΩ'
        },
        {
          id: 'gnd_p',
          type: 'gnd',
          name: 'GND1',
          x: 520,
          y: 220,
          rotation: 0,
          width: 40,
          height: 40,
          params: {},
          value: 0,
          unit: 'V'
        }
      ],
      wires: [
        { id: 'wp1', fromCompId: 'v_par10', fromPinId: 'p_plus', toCompId: 'r_p1', toPinId: 'p1' },
        { id: 'wp2', fromCompId: 'r_p1', fromPinId: 'p1', toCompId: 'r_p2', toPinId: 'p1' },
        { id: 'wp3', fromCompId: 'r_p1', fromPinId: 'p2', toCompId: 'gnd_p', toPinId: 'p_gnd' },
        { id: 'wp4', fromCompId: 'r_p2', fromPinId: 'p2', toCompId: 'gnd_p', toPinId: 'p_gnd' },
        { id: 'wp5', fromCompId: 'v_par10', fromPinId: 'p_minus', toCompId: 'gnd_p', toPinId: 'p_gnd' }
      ]
    }
  }
];
