/**
 * Unit Converter Module
 * High-precision conversions across Length, Mass, Temperature, Area, Speed, Digital Storage, and Time.
 */

export const UNIT_CATEGORIES = {
  length: {
    name: 'Length',
    base: 'm',
    units: {
      m: { name: 'Meters (m)', factor: 1 },
      km: { name: 'Kilometers (km)', factor: 1000 },
      cm: { name: 'Centimeters (cm)', factor: 0.01 },
      mm: { name: 'Millimeters (mm)', factor: 0.001 },
      mi: { name: 'Miles (mi)', factor: 1609.344 },
      yd: { name: 'Yards (yd)', factor: 0.9144 },
      ft: { name: 'Feet (ft)', factor: 0.3048 },
      in: { name: 'Inches (in)', factor: 0.0254 },
      nmi: { name: 'Nautical Miles (nmi)', factor: 1852 }
    }
  },
  mass: {
    name: 'Mass & Weight',
    base: 'kg',
    units: {
      kg: { name: 'Kilograms (kg)', factor: 1 },
      g: { name: 'Grams (g)', factor: 0.001 },
      mg: { name: 'Milligrams (mg)', factor: 0.000001 },
      t: { name: 'Metric Tons (t)', factor: 1000 },
      lb: { name: 'Pounds (lb)', factor: 0.45359237 },
      oz: { name: 'Ounces (oz)', factor: 0.028349523125 },
      st: { name: 'Stone (st)', factor: 6.35029318 }
    }
  },
  temperature: {
    name: 'Temperature',
    base: 'C',
    units: {
      C: { name: 'Celsius (°C)' },
      F: { name: 'Fahrenheit (°F)' },
      K: { name: 'Kelvin (K)' }
    }
  },
  area: {
    name: 'Area',
    base: 'm2',
    units: {
      m2: { name: 'Square Meters (m²)', factor: 1 },
      km2: { name: 'Square Kilometers (km²)', factor: 1000000 },
      ft2: { name: 'Square Feet (ft²)', factor: 0.09290304 },
      ac: { name: 'Acres (ac)', factor: 4046.8564224 },
      ha: { name: 'Hectares (ha)', factor: 10000 }
    }
  },
  speed: {
    name: 'Speed',
    base: 'mps',
    units: {
      mps: { name: 'Meters/sec (m/s)', factor: 1 },
      kmh: { name: 'Kilometers/hour (km/h)', factor: 1 / 3.6 },
      mph: { name: 'Miles/hour (mph)', factor: 0.44704 },
      knot: { name: 'Knots (kn)', factor: 0.514444 }
    }
  },
  data: {
    name: 'Digital Storage',
    base: 'B',
    units: {
      B: { name: 'Bytes (B)', factor: 1 },
      KB: { name: 'Kilobytes (KB)', factor: 1024 },
      MB: { name: 'Megabytes (MB)', factor: 1024 ** 2 },
      GB: { name: 'Gigabytes (GB)', factor: 1024 ** 3 },
      TB: { name: 'Terabytes (TB)', factor: 1024 ** 4 },
      PB: { name: 'Petabytes (PB)', factor: 1024 ** 5 }
    }
  },
  time: {
    name: 'Time',
    base: 's',
    units: {
      ms: { name: 'Milliseconds (ms)', factor: 0.001 },
      s: { name: 'Seconds (s)', factor: 1 },
      min: { name: 'Minutes (min)', factor: 60 },
      h: { name: 'Hours (h)', factor: 3600 },
      d: { name: 'Days (d)', factor: 86400 },
      wk: { name: 'Weeks (wk)', factor: 604800 },
      yr: { name: 'Years (365d)', factor: 31536000 }
    }
  }
};

export class UnitConverter {
  static convert(value, categoryKey, fromUnit, toUnit) {
    const val = Number(value);
    if (isNaN(val) || !isFinite(val)) {
      throw new Error('Invalid number for unit conversion');
    }

    const cat = UNIT_CATEGORIES[categoryKey];
    if (!cat) {
      throw new Error(`Unknown category: ${categoryKey}`);
    }

    if (fromUnit === toUnit) {
      return val;
    }

    // Special handling for Temperature (affine transformation, not simple factor)
    if (categoryKey === 'temperature') {
      let celsius;
      if (fromUnit === 'C') {
        celsius = val;
      } else if (fromUnit === 'F') {
        celsius = ((val - 32) * 5) / 9;
      } else if (fromUnit === 'K') {
        celsius = val - 273.15;
      } else {
        throw new Error(`Unknown temperature unit: ${fromUnit}`);
      }

      let result;
      if (toUnit === 'C') {
        result = celsius;
      } else if (toUnit === 'F') {
        result = (celsius * 9) / 5 + 32;
      } else if (toUnit === 'K') {
        result = celsius + 273.15;
      } else {
        throw new Error(`Unknown temperature unit: ${toUnit}`);
      }

      return parseFloat(result.toPrecision(12));
    }

    // Linear conversion via base unit
    const fromDef = cat.units[fromUnit];
    const toDef = cat.units[toUnit];

    if (!fromDef || !toDef) {
      throw new Error(`Invalid unit selection: ${fromUnit} -> ${toUnit}`);
    }

    const baseValue = val * fromDef.factor;
    const result = baseValue / toDef.factor;

    // Clean precision
    return parseFloat(result.toPrecision(12));
  }
}

