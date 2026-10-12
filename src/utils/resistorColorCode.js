/**
 * ElectroLab 2.0 - Código Estándar de Colores para Resistencias (IEC 60062)
 * Calcula las bandas de color a partir del valor en Ohmios, tolerancia y número de bandas (4 o 5).
 */

export const COLOR_TABLE = {
  black:  { name: 'Negro',    color: '#18181B', border: '#71717A', textColor: '#FFFFFF', digit: 0, mult: 1 },
  brown:  { name: 'Marrón',   color: '#8B4513', border: '#A0522D', textColor: '#FFFFFF', digit: 1, mult: 10, tol: 1 },
  red:    { name: 'Rojo',     color: '#EF4444', border: '#B91C1C', textColor: '#FFFFFF', digit: 2, mult: 100, tol: 2 },
  orange: { name: 'Naranja',  color: '#F97316', border: '#C2410C', textColor: '#FFFFFF', digit: 3, mult: 1000 },
  yellow: { name: 'Amarillo', color: '#EAB308', border: '#A16207', textColor: '#000000', digit: 4, mult: 10000 },
  green:  { name: 'Verde',    color: '#22C55E', border: '#15803D', textColor: '#FFFFFF', digit: 5, mult: 100000, tol: 0.5 },
  blue:   { name: 'Azul',     color: '#3B82F6', border: '#1D4ED8', textColor: '#FFFFFF', digit: 6, mult: 1000000, tol: 0.25 },
  violet: { name: 'Violeta',  color: '#A855F7', border: '#7E22CE', textColor: '#FFFFFF', digit: 7, mult: 10000000, tol: 0.1 },
  gray:   { name: 'Gris',     color: '#94A3B8', border: '#475569', textColor: '#000000', digit: 8, mult: 100000000 },
  white:  { name: 'Blanco',   color: '#F8FAFC', border: '#CBD5E1', textColor: '#000000', digit: 9, mult: 1000000000 },
  gold:   { name: 'Dorado',   color: '#D4AF37', border: '#B4941F', textColor: '#000000', mult: 0.1, tol: 5 },
  silver: { name: 'Plateado', color: '#C0C0C0', border: '#9CA3AF', textColor: '#000000', mult: 0.01, tol: 10 }
};

const DIGIT_COLORS = [
  COLOR_TABLE.black,
  COLOR_TABLE.brown,
  COLOR_TABLE.red,
  COLOR_TABLE.orange,
  COLOR_TABLE.yellow,
  COLOR_TABLE.green,
  COLOR_TABLE.blue,
  COLOR_TABLE.violet,
  COLOR_TABLE.gray,
  COLOR_TABLE.white
];

const MULTIPLIERS = [
  { exp: -2, ...COLOR_TABLE.silver },
  { exp: -1, ...COLOR_TABLE.gold },
  { exp: 0,  ...COLOR_TABLE.black },
  { exp: 1,  ...COLOR_TABLE.brown },
  { exp: 2,  ...COLOR_TABLE.red },
  { exp: 3,  ...COLOR_TABLE.orange },
  { exp: 4,  ...COLOR_TABLE.yellow },
  { exp: 5,  ...COLOR_TABLE.green },
  { exp: 6,  ...COLOR_TABLE.blue },
  { exp: 7,  ...COLOR_TABLE.violet }
];

/**
 * Convierte un valor numérico y unidad (Ω, kΩ, MΩ) a Ohmios puros.
 */
export function convertToOhms(value, unit = 'Ω') {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return null;

  const u = String(unit).trim().toLowerCase();
  if (u === 'kω' || u === 'k' || u === 'kohm' || u === 'kohms') {
    return num * 1000;
  }
  if (u === 'mω' || u === 'm' || u === 'meg' || u === 'mohm') {
    return num * 1000000;
  }
  return num;
}

/**
 * Formatea un valor en Ohmios a una cadena con prefijo métrico (Ω, kΩ, MΩ).
 */
export function formatOhms(ohms) {
  if (ohms == null || isNaN(ohms) || ohms <= 0) return '0 Ω';
  if (ohms >= 1000000) {
    const val = parseFloat((ohms / 1000000).toPrecision(4));
    return `${val} MΩ`;
  }
  if (ohms >= 1000) {
    const val = parseFloat((ohms / 1000).toPrecision(4));
    return `${val} kΩ`;
  }
  const val = parseFloat(ohms.toPrecision(4));
  return `${val} Ω`;
}

/**
 * Formatea un valor de corriente en Amperios a cadena con prefijos (A, mA, µA).
 */
export function formatAmps(amps) {
  if (amps == null || isNaN(amps)) return '0 A';
  const sign = amps < 0 ? '-' : '';
  const a = Math.abs(amps);
  if (a === 0) return '0.00 A';
  if (a >= 1) return `${sign}${a.toFixed(3)} A`;
  if (a >= 1e-3) return `${sign}${(a * 1e3).toFixed(3)} mA`;
  if (a >= 1e-6) return `${sign}${(a * 1e6).toFixed(3)} µA`;
  return `${sign}${(a * 1e9).toFixed(3)} nA`;
}

/**
 * Formatea un valor de tensión en Voltios a cadena con prefijos (V, mV).
 */
export function formatVolts(volts) {
  if (volts == null || isNaN(volts)) return '0 V';
  const sign = volts < 0 ? '-' : '';
  const v = Math.abs(volts);
  if (v === 0) return '0.00 V';
  if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(3)} kV`;
  if (v >= 1) return `${sign}${v.toFixed(3)} V`;
  if (v >= 1e-3) return `${sign}${(v * 1e3).toFixed(3)} mV`;
  return `${sign}${(v * 1e6).toFixed(3)} µV`;
}

/**
 * Formatea un valor de potencia en Vatios a cadena con prefijos (W, mW, kW).
 */
export function formatWatts(watts) {
  if (watts == null || isNaN(watts)) return '0 W';
  const sign = watts < 0 ? '-' : '';
  const w = Math.abs(watts);
  if (w === 0) return '0.00 W';
  if (w >= 1e3) return `${sign}${(w / 1e3).toFixed(3)} kW`;
  if (w >= 1) return `${sign}${w.toFixed(3)} W`;
  if (w >= 1e-3) return `${sign}${(w * 1e3).toFixed(3)} mW`;
  if (w >= 1e-6) return `${sign}${(w * 1e6).toFixed(3)} µW`;
  return `${sign}${(w * 1e9).toFixed(3)} nW`;
}

/**
 * Convierte un valor de conductancia con unidad (S, mS, µS, uS) a Siemens (S) puros.
 */
export function convertToSiemens(value, unit = 'S') {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return null;

  const u = String(unit).trim().toLowerCase();
  if (u === 'ms' || u === 'millisiemens') {
    return num * 1e-3;
  }
  if (u === 'µs' || u === 'us' || u === 'microsiemens') {
    return num * 1e-6;
  }
  if (u === 'ks') {
    return num * 1e3;
  }
  return num;
}

/**
 * Formatea un valor de conductancia en Siemens (S) a cadena con prefijos métricos (S, mS, µS, nS).
 */
export function formatSiemens(siemens) {
  if (siemens == null || isNaN(siemens)) return '0 S';
  if (!isFinite(siemens)) return '∞ S';
  const sign = siemens < 0 ? '-' : '';
  const s = Math.abs(siemens);
  if (s === 0) return '0.00 S';
  if (s >= 1) {
    const val = parseFloat(s.toPrecision(4));
    return `${sign}${val} S`;
  }
  if (s >= 1e-3) {
    const val = parseFloat((s * 1e3).toPrecision(4));
    return `${sign}${val} mS`;
  }
  if (s >= 1e-6) {
    const val = parseFloat((s * 1e6).toPrecision(4));
    return `${sign}${val} µS`;
  }
  const val = parseFloat((s * 1e9).toPrecision(4));
  return `${sign}${val} nS`;
}

/**
 * Calcula la conductancia a partir de la resistencia: G = 1/R.
 * @param {number} ohms - Valor en Ohmios.
 * @returns {number|null} Conductancia en Siemens o null si R <= 0 o inválido.
 */
export function resistanceToConductance(ohms) {
  if (ohms == null || isNaN(ohms) || ohms <= 0) return null;
  return 1 / ohms;
}

/**
 * Calcula la resistencia a partir de la conductancia: R = 1/G.
 * @param {number} siemens - Valor en Siemens.
 * @returns {number|null} Resistencia en Ohmios o null si G <= 0 o inválido.
 */
export function conductanceToResistance(siemens) {
  if (siemens == null || isNaN(siemens) || siemens <= 0) return null;
  return 1 / siemens;
}

/**
 * Calcula las bandas de color para una resistencia según IEC 60062.
 * @param {number} ohms - Valor en Ohmios (debe ser > 0).
 * @param {number} numBands - 4 o 5 bandas (por defecto 4).
 * @param {number} tolerancePercent - Tolerancia (1, 2, 5, 10, etc. Por defecto 5).
 * @returns {Array|null} Lista de objetos de color para cada banda, o null si el valor es inválido.
 */
export function getResistorColorBands(ohms, numBands = 4, tolerancePercent = 5) {
  if (ohms == null || isNaN(ohms) || ohms <= 0 || !isFinite(ohms)) {
    return null; // No inventar colores para valores inválidos
  }

  // Tolerancia
  let tolColor = COLOR_TABLE.gold; // 5%
  if (tolerancePercent === 10) tolColor = COLOR_TABLE.silver;
  else if (tolerancePercent === 1) tolColor = COLOR_TABLE.brown;
  else if (tolerancePercent === 2) tolColor = COLOR_TABLE.red;
  else if (tolerancePercent === 0.5) tolColor = COLOR_TABLE.green;

  if (numBands === 5) {
    // 5 Bandas: 3 dígitos significativos + 1 multiplicador + 1 tolerancia
    // Representamos ohms como D1 D2 D3 * 10^exp
    const expFloor = Math.floor(Math.log10(ohms));
    const normalized = ohms / Math.pow(10, expFloor - 2); // número de 3 dígitos ~100 a 999
    const rounded = Math.round(normalized);

    let d1, d2, d3, multiplierExp;

    if (rounded >= 1000) {
      d1 = 1;
      d2 = 0;
      d3 = 0;
      multiplierExp = expFloor - 2 + 1;
    } else {
      const str = String(rounded).padStart(3, '0');
      d1 = parseInt(str[0], 10);
      d2 = parseInt(str[1], 10);
      d3 = parseInt(str[2], 10);
      multiplierExp = expFloor - 2;
    }

    if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9 || d3 < 0 || d3 > 9) return null;
    if (multiplierExp < -2 || multiplierExp > 7) return null;

    const multObj = MULTIPLIERS.find(m => m.exp === multiplierExp) || COLOR_TABLE.black;

    return [
      DIGIT_COLORS[d1],
      DIGIT_COLORS[d2],
      DIGIT_COLORS[d3],
      multObj,
      tolColor
    ];
  }

  // 4 Bandas: 2 dígitos significativos + 1 multiplicador + 1 tolerancia
  // Representamos ohms como D1 D2 * 10^exp
  const expFloor = Math.floor(Math.log10(ohms));
  const normalized = ohms / Math.pow(10, expFloor - 1); // número de 2 dígitos ~10 a 99
  const rounded = Math.round(normalized);

  let d1, d2, multiplierExp;

  if (rounded >= 100) {
    d1 = 1;
    d2 = 0;
    multiplierExp = expFloor - 1 + 1;
  } else {
    const str = String(rounded).padStart(2, '0');
    d1 = parseInt(str[0], 10);
    d2 = parseInt(str[1], 10);
    multiplierExp = expFloor - 1;
  }

  if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9) return null;
  if (multiplierExp < -2 || multiplierExp > 7) return null;

  const multObj = MULTIPLIERS.find(m => m.exp === multiplierExp) || COLOR_TABLE.black;

  return [
    DIGIT_COLORS[d1],
    DIGIT_COLORS[d2],
    multObj,
    tolColor
  ];
}
