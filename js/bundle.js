/**
 * Modern Pro Calculator - Standalone Bundle
 * Self-contained bundle supporting both local file:// execution and HTTP server deployment.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Calculator Engine
  // ==========================================
  class CalculatorEngine {
    constructor() {
      this.angleMode = 'DEG';
      this.memory = 0;
      this.lastResult = null;
      this.history = [];
    }

    setAngleMode(mode) {
      if (mode === 'DEG' || mode === 'RAD') this.angleMode = mode;
    }

    toggleAngleMode() {
      this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
      return this.angleMode;
    }

    memoryClear() {
      this.memory = 0;
      return this.memory;
    }

    memoryRecall() {
      return this.memory;
    }

    memoryStore(val) {
      const num = Number(val);
      if (!isNaN(num) && isFinite(num)) this.memory = num;
      return this.memory;
    }

    memoryAdd(val) {
      const num = Number(val);
      if (!isNaN(num) && isFinite(num)) this.memory += num;
      return this.memory;
    }

    memorySubtract(val) {
      const num = Number(val);
      if (!isNaN(num) && isFinite(num)) this.memory -= num;
      return this.memory;
    }

    hasMemory() {
      return this.memory !== 0;
    }

    static cleanFloat(val) {
      if (typeof val !== 'number' || !isFinite(val)) return val;
      if (Math.abs(val) < 1e-15) return 0;
      const nearestInt = Math.round(val);
      if (Math.abs(val - nearestInt) < 1e-12) return nearestInt;
      const str = val.toString();
      if (/(000000\d|999999\d)/.test(str)) {
        return parseFloat(val.toPrecision(14));
      }
      return val;
    }

    tokenize(rawExpr) {
      if (typeof rawExpr !== 'string') throw new Error('Expression must be a string');

      let expr = rawExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi')
        .replace(/√/g, 'sqrt')
        .trim();

      const tokens = [];
      let i = 0;
      const len = expr.length;

      const isDigit = (ch) => ch >= '0' && ch <= '9';
      const isAlpha = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');

      while (i < len) {
        const ch = expr[i];

        if (/\s/.test(ch)) {
          i++;
          continue;
        }

        if (isDigit(ch) || (ch === '.' && i + 1 < len && isDigit(expr[i + 1]))) {
          let numStr = '';
          let hasDot = false;
          let hasExp = false;

          while (i < len) {
            const c = expr[i];
            if (isDigit(c)) {
              numStr += c;
              i++;
            } else if (c === '.' && !hasDot && !hasExp) {
              hasDot = true;
              numStr += c;
              i++;
            } else if ((c === 'e' || c === 'E') && !hasExp) {
              hasExp = true;
              numStr += c;
              i++;
              if (i < len && (expr[i] === '+' || expr[i] === '-')) {
                numStr += expr[i];
                i++;
              }
            } else {
              break;
            }
          }

          tokens.push({ type: 'NUMBER', value: parseFloat(numStr), raw: numStr });
          continue;
        }

        if (isAlpha(ch)) {
          let name = '';
          while (i < len && (isAlpha(expr[i]) || isDigit(expr[i]))) {
            name += expr[i];
            i++;
          }
          const lowerName = name.toLowerCase();

          if (lowerName === 'pi') {
            tokens.push({ type: 'NUMBER', value: Math.PI, raw: 'pi' });
          } else if (lowerName === 'e') {
            tokens.push({ type: 'NUMBER', value: Math.E, raw: 'e' });
          } else if (lowerName === 'phi') {
            tokens.push({ type: 'NUMBER', value: 1.618033988749895, raw: 'phi' });
          } else if (lowerName === 'ans') {
            tokens.push({ type: 'NUMBER', value: this.lastResult ?? 0, raw: 'ans' });
          } else if (lowerName === 'mod') {
            tokens.push({ type: 'OPERATOR', value: '%' });
          } else {
            tokens.push({ type: 'FUNCTION', value: lowerName });
          }
          continue;
        }

        if (ch === '(') {
          tokens.push({ type: 'LPAREN', value: '(' });
          i++;
        } else if (ch === ')') {
          tokens.push({ type: 'RPAREN', value: ')' });
          i++;
        } else if (ch === ',') {
          tokens.push({ type: 'COMMA', value: ',' });
          i++;
        } else if (ch === '!') {
          tokens.push({ type: 'POSTFIX_OP', value: '!' });
          i++;
        } else if (ch === '%') {
          let lookAhead = i + 1;
          while (lookAhead < len && /\s/.test(expr[lookAhead])) {
            lookAhead++;
          }

          const isBinaryModulo =
            lookAhead < len &&
            (isDigit(expr[lookAhead]) ||
              expr[lookAhead] === '.' ||
              expr[lookAhead] === '(' ||
              isAlpha(expr[lookAhead]));

          if (isBinaryModulo) {
            tokens.push({ type: 'OPERATOR', value: '%' });
          } else {
            tokens.push({ type: 'POSTFIX_OP', value: '%' });
          }
          i++;
        } else if ('+-*/^'.includes(ch)) {
          const prev = tokens[tokens.length - 1];
          const isUnary =
            (ch === '+' || ch === '-') &&
            (!prev ||
              prev.type === 'OPERATOR' ||
              prev.type === 'UNARY_OP' ||
              prev.type === 'LPAREN' ||
              prev.type === 'COMMA');

          if (isUnary) {
            tokens.push({ type: 'UNARY_OP', value: ch === '-' ? 'neg' : 'pos' });
          } else {
            tokens.push({ type: 'OPERATOR', value: ch });
          }
          i++;
        } else {
          throw new Error(`Unexpected character: "${ch}" at index ${i}`);
        }
      }

      const normalizedTokens = [];
      for (let j = 0; j < tokens.length; j++) {
        const curr = tokens[j];
        const prev = tokens[j - 1];

        if (prev) {
          const prevIsNumOrRparen =
            prev.type === 'NUMBER' ||
            prev.type === 'RPAREN' ||
            prev.type === 'POSTFIX_OP';

          const currIsNumOrLparenOrFunc =
            curr.type === 'NUMBER' ||
            curr.type === 'LPAREN' ||
            curr.type === 'FUNCTION';

          if (prevIsNumOrRparen && currIsNumOrLparenOrFunc) {
            normalizedTokens.push({ type: 'OPERATOR', value: '*' });
          }
        }

        normalizedTokens.push(curr);
      }

      return normalizedTokens;
    }

    toRPN(tokens) {
      const outputQueue = [];
      const operatorStack = [];

      const precedence = {
        '+': 2,
        '-': 2,
        '*': 3,
        '/': 3,
        '%': 3,
        '^': 4,
        'neg': 4.5,
        'pos': 4.5,
        '!': 5
      };

      const associativity = {
        '+': 'L',
        '-': 'L',
        '*': 'L',
        '/': 'L',
        '%': 'L',
        '^': 'R',
        'neg': 'R',
        'pos': 'R',
        '!': 'L'
      };

      for (const token of tokens) {
        if (token.type === 'NUMBER') {
          outputQueue.push(token);
        } else if (token.type === 'FUNCTION') {
          operatorStack.push(token);
        } else if (token.type === 'OPERATOR' || token.type === 'UNARY_OP' || token.type === 'POSTFIX_OP') {
          const op1 = token.value;
          const p1 = precedence[op1] || 0;
          const a1 = associativity[op1] || 'L';

          while (operatorStack.length > 0) {
            const top = operatorStack[operatorStack.length - 1];
            if (top.type === 'FUNCTION') {
              outputQueue.push(operatorStack.pop());
            } else if (top.type === 'OPERATOR' || top.type === 'UNARY_OP' || top.type === 'POSTFIX_OP') {
              const op2 = top.value;
              const p2 = precedence[op2] || 0;

              if ((a1 === 'L' && p1 <= p2) || (a1 === 'R' && p1 < p2)) {
                outputQueue.push(operatorStack.pop());
              } else {
                break;
              }
            } else {
              break;
            }
          }

          operatorStack.push(token);
        } else if (token.type === 'LPAREN') {
          operatorStack.push(token);
        } else if (token.type === 'RPAREN') {
          let foundLeftParen = false;
          while (operatorStack.length > 0) {
            const top = operatorStack.pop();
            if (top.type === 'LPAREN') {
              foundLeftParen = true;
              break;
            } else {
              outputQueue.push(top);
            }
          }
          if (!foundLeftParen) throw new Error('Mismatched parentheses: unexpected ")"');
          if (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1].type === 'FUNCTION'
          ) {
            outputQueue.push(operatorStack.pop());
          }
        }
      }

      while (operatorStack.length > 0) {
        const top = operatorStack.pop();
        if (top.type === 'LPAREN' || top.type === 'RPAREN') {
          throw new Error('Mismatched parentheses: missing closing ")"');
        }
        outputQueue.push(top);
      }

      return outputQueue;
    }

    evaluateRPN(rpnQueue) {
      const stack = [];

      for (const token of rpnQueue) {
        if (token.type === 'NUMBER') {
          stack.push(token.value);
        } else if (token.type === 'UNARY_OP') {
          if (stack.length < 1) throw new Error('Missing operand for unary operator');
          const val = stack.pop();
          stack.push(CalculatorEngine.cleanFloat(token.value === 'neg' ? -val : +val));
        } else if (token.type === 'POSTFIX_OP') {
          if (stack.length < 1) throw new Error('Missing operand for operator');
          const val = stack.pop();
          if (token.value === '!') {
            stack.push(this.factorial(val));
          } else if (token.value === '%') {
            stack.push(CalculatorEngine.cleanFloat(val / 100));
          }
        } else if (token.type === 'OPERATOR') {
          if (stack.length < 2) throw new Error(`Missing operand for operator "${token.value}"`);
          const b = stack.pop();
          const a = stack.pop();
          stack.push(this.applyBinaryOp(token.value, a, b));
        } else if (token.type === 'FUNCTION') {
          if (stack.length < 1) throw new Error(`Missing argument for function "${token.value}"`);
          const arg = stack.pop();
          stack.push(this.applyFunction(token.value, arg));
        }
      }

      if (stack.length !== 1) throw new Error('Invalid expression format');

      return CalculatorEngine.cleanFloat(stack[0]);
    }

    applyBinaryOp(op, a, b) {
      let result;
      switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/':
          if (b === 0) throw new Error('Cannot divide by zero');
          result = a / b;
          break;
        case '%':
          if (b === 0) throw new Error('Cannot divide by zero in modulo');
          result = a % b;
          break;
        case '^': result = Math.pow(a, b); break;
        default: throw new Error(`Unknown operator: ${op}`);
      }
      return CalculatorEngine.cleanFloat(result);
    }

    applyFunction(fnName, x) {
      const isDeg = this.angleMode === 'DEG';
      const toRad = (angle) => (angle * Math.PI) / 180;
      const toDeg = (rad) => (rad * 180) / Math.PI;

      let res;
      switch (fnName) {
        case 'sin': {
          const rad = isDeg ? toRad(x % 360) : x;
          const val = Math.sin(rad);
          res = Math.abs(val) < 1e-15 ? 0 : val;
          break;
        }
        case 'cos': {
          if (isDeg) {
            const mod = Math.abs(x % 360);
            if (mod === 90 || mod === 270) {
              res = 0;
              break;
            }
            res = Math.cos(toRad(x));
          } else {
            res = Math.cos(x);
          }
          break;
        }
        case 'tan': {
          if (isDeg) {
            const mod = Math.abs(x % 180);
            if (mod === 90) throw new Error('Tangent undefined at 90° + k·180°');
            res = Math.tan(toRad(x));
          } else {
            const val = Math.tan(x);
            if (Math.abs(val) > 1e15) throw new Error('Tangent undefined');
            res = val;
          }
          break;
        }
        case 'asin': {
          if (x < -1 || x > 1) throw new Error('asin argument must be in [-1, 1]');
          const rad = Math.asin(x);
          res = isDeg ? toDeg(rad) : rad;
          break;
        }
        case 'acos': {
          if (x < -1 || x > 1) throw new Error('acos argument must be in [-1, 1]');
          const rad = Math.acos(x);
          res = isDeg ? toDeg(rad) : rad;
          break;
        }
        case 'atan': {
          const rad = Math.atan(x);
          res = isDeg ? toDeg(rad) : rad;
          break;
        }
        case 'sinh': res = Math.sinh(x); break;
        case 'cosh': res = Math.cosh(x); break;
        case 'tanh': res = Math.tanh(x); break;
        case 'ln':
        case 'log':
          if (x <= 0) throw new Error('Logarithm undefined for non-positive numbers');
          res = fnName === 'ln' ? Math.log(x) : Math.log10(x);
          break;
        case 'log10':
          if (x <= 0) throw new Error('Logarithm undefined for non-positive numbers');
          res = Math.log10(x);
          break;
        case 'log2':
          if (x <= 0) throw new Error('Logarithm undefined for non-positive numbers');
          res = Math.log2(x);
          break;
        case 'exp': res = Math.exp(x); break;
        case 'sqrt':
          if (x < 0) throw new Error('Square root of negative number');
          res = Math.sqrt(x);
          break;
        case 'cbrt': res = Math.cbrt(x); break;
        case 'abs': res = Math.abs(x); break;
        case 'inv':
          if (x === 0) throw new Error('Cannot divide by zero');
          res = 1 / x;
          break;
        case 'sqr': res = x * x; break;
        case 'cube': res = x * x * x; break;
        case 'fact': res = this.factorial(x); break;
        default: throw new Error(`Unknown function "${fnName}"`);
      }

      return CalculatorEngine.cleanFloat(res);
    }

    factorial(n) {
      if (n < 0) throw new Error('Factorial of negative number undefined');
      if (!Number.isInteger(n)) throw new Error('Factorial only defined for integers');
      if (n > 170) throw new Error('Factorial overflow (max n=170)');
      if (n === 0 || n === 1) return 1;

      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return res;
    }

    calculate(expression) {
      if (!expression || expression.trim() === '') return 0;
      const tokens = this.tokenize(expression);
      if (tokens.length === 0) return 0;
      const rpn = this.toRPN(tokens);
      const result = this.evaluateRPN(rpn);
      if (typeof result !== 'number' || isNaN(result)) throw new Error('Calculation resulted in NaN');
      if (!isFinite(result)) throw new Error('Result overflowed (Infinity)');
      this.lastResult = result;
      return result;
    }

    static formatResult(num, maxDigits = 12) {
      if (typeof num !== 'number' || isNaN(num)) return 'Error';
      if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
      if (num === 0) return '0';
      const abs = Math.abs(num);
      if (abs >= 1e15 || (abs < 1e-7 && abs !== 0)) {
        return num.toExponential(8).replace(/\.?0+e/, 'e');
      }
      return parseFloat(num.toPrecision(maxDigits)).toString();
    }
  }

  // ==========================================
  // 2. Unit Converter
  // ==========================================
  const UNIT_CATEGORIES = {
    length: {
      name: 'Length',
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
      units: {
        C: { name: 'Celsius (°C)' },
        F: { name: 'Fahrenheit (°F)' },
        K: { name: 'Kelvin (K)' }
      }
    },
    area: {
      name: 'Area',
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
      units: {
        mps: { name: 'Meters/sec (m/s)', factor: 1 },
        kmh: { name: 'Kilometers/hour (km/h)', factor: 1 / 3.6 },
        mph: { name: 'Miles/hour (mph)', factor: 0.44704 },
        knot: { name: 'Knots (kn)', factor: 0.514444 }
      }
    },
    data: {
      name: 'Digital Storage',
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

  class UnitConverter {
    static convert(value, categoryKey, fromUnit, toUnit) {
      const val = Number(value);
      if (isNaN(val) || !isFinite(val)) throw new Error('Invalid number for unit conversion');
      const cat = UNIT_CATEGORIES[categoryKey];
      if (!cat) throw new Error(`Unknown category: ${categoryKey}`);
      if (fromUnit === toUnit) return val;

      if (categoryKey === 'temperature') {
        let celsius;
        if (fromUnit === 'C') celsius = val;
        else if (fromUnit === 'F') celsius = ((val - 32) * 5) / 9;
        else if (fromUnit === 'K') celsius = val - 273.15;
        else throw new Error(`Unknown temperature unit: ${fromUnit}`);

        let result;
        if (toUnit === 'C') result = celsius;
        else if (toUnit === 'F') result = (celsius * 9) / 5 + 32;
        else if (toUnit === 'K') result = celsius + 273.15;
        else throw new Error(`Unknown temperature unit: ${toUnit}`);

        return parseFloat(result.toPrecision(12));
      }

      const fromDef = cat.units[fromUnit];
      const toDef = cat.units[toUnit];
      if (!fromDef || !toDef) throw new Error(`Invalid unit selection: ${fromUnit} -> ${toUnit}`);

      const baseValue = val * fromDef.factor;
      const result = baseValue / toDef.factor;
      return parseFloat(result.toPrecision(12));
    }
  }

  // ==========================================
  // 3. Programmer Mode
  // ==========================================
  const WORD_SIZES = {
    QWORD: { name: 'QWORD (64-bit)', bits: 64n, mask: 0xFFFFFFFFFFFFFFFFn },
    DWORD: { name: 'DWORD (32-bit)', bits: 32n, mask: 0xFFFFFFFFn },
    WORD: { name: 'WORD (16-bit)', bits: 16n, mask: 0xFFFFn },
    BYTE: { name: 'BYTE (8-bit)', bits: 8n, mask: 0xFFn }
  };

  class ProgrammerEngine {
    constructor() {
      this.wordSize = 'DWORD';
      this.value = 0n;
      this.isSigned = true;
    }

    setWordSize(sizeKey) {
      if (WORD_SIZES[sizeKey]) {
        this.wordSize = sizeKey;
        this.value = this.clamp(this.value);
      }
    }

    getMask() {
      return WORD_SIZES[this.wordSize].mask;
    }

    getBits() {
      return WORD_SIZES[this.wordSize].bits;
    }

    clamp(val) {
      return BigInt.asUintN(Number(this.getBits()), val);
    }

    setValue(val) {
      try {
        this.value = this.clamp(BigInt(val));
      } catch {
        this.value = 0n;
      }
      return this.value;
    }

    toggleBit(bitIndex) {
      const bits = Number(this.getBits());
      if (bitIndex >= 0 && bitIndex < bits) {
        const bitMask = 1n << BigInt(bitIndex);
        this.value = this.clamp(this.value ^ bitMask);
      }
      return this.value;
    }

    and(other) {
      this.value = this.clamp(this.value & BigInt(other));
      return this.value;
    }

    or(other) {
      this.value = this.clamp(this.value | BigInt(other));
      return this.value;
    }

    xor(other) {
      this.value = this.clamp(this.value ^ BigInt(other));
      return this.value;
    }

    not() {
      this.value = this.clamp(~this.value);
      return this.value;
    }

    lsh(shiftAmount = 1n) {
      this.value = this.clamp(this.value << BigInt(shiftAmount));
      return this.value;
    }

    rsh(shiftAmount = 1n) {
      this.value = this.clamp(this.value >> BigInt(shiftAmount));
      return this.value;
    }

    getRepresentations() {
      const bits = Number(this.getBits());
      const unsignedVal = this.clamp(this.value);
      const signedVal = BigInt.asIntN(bits, unsignedVal);
      const binStr = unsignedVal.toString(2).padStart(bits, '0');
      const nibbles = binStr.match(/.{1,4}/g)?.join(' ') ?? binStr;

      return {
        HEX: unsignedVal.toString(16).toUpperCase(),
        DEC: this.isSigned ? signedVal.toString(10) : unsignedVal.toString(10),
        OCT: unsignedVal.toString(8),
        BIN: binStr,
        BIN_FORMATTED: nibbles,
        BITS: bits
      };
    }
  }

  // ==========================================
  // 4. Sound Effects Synthesizer
  // ==========================================
  class SoundEffects {
    constructor() {
      this.audioCtx = null;
      this.enabled = true;
      this.volume = 0.2;
      try {
        const saved = localStorage.getItem('calc_sound_enabled');
        if (saved !== null) this.enabled = saved === 'true';
      } catch {}
    }

    initContext() {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    toggleSound() {
      this.enabled = !this.enabled;
      try {
        localStorage.setItem('calc_sound_enabled', String(this.enabled));
      } catch {}
      if (this.enabled) this.playClick();
      return this.enabled;
    }

    playClick() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(this.volume * 0.4, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.04);
      } catch {}
    }

    playOperator() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, this.audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(this.volume * 0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
      } catch {}
    }

    playEquals() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        [
          { freq: 523.25, time: 0, dur: 0.08 },
          { freq: 659.25, time: 0.06, dur: 0.12 }
        ].forEach(({ freq, time, dur }) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);
          gain.gain.setValueAtTime(this.volume * 0.4, now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + time);
          osc.stop(now + time + dur);
        });
      } catch {}
    }

    playClear() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.06);
        gain.gain.setValueAtTime(this.volume * 0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.06);
      } catch {}
    }

    playError() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(this.volume * 0.4, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);
      } catch {}
    }
  }

  // ==========================================
  // 5. History Manager
  // ==========================================
  class HistoryManager {
    constructor(storageKey = 'modern_calculator_history', maxItems = 100) {
      this.storageKey = storageKey;
      this.maxItems = maxItems;
      this.items = this.load();
      this.listeners = [];
    }

    load() {
      try {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    }

    save() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      } catch {}
      this.notify();
    }

    subscribe(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      };
    }

    notify() {
      this.listeners.forEach(cb => {
        try { cb(this.items); } catch {}
      });
    }

    add(expression, result, mode = 'standard') {
      if (!expression || result === undefined || result === null) return;
      const entry = {
        id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        expression: String(expression),
        result: String(result),
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      this.items.unshift(entry);
      if (this.items.length > this.maxItems) {
        this.items = this.items.slice(0, this.maxItems);
      }
      this.save();
      return entry;
    }

    clear() {
      this.items = [];
      this.save();
    }

    getItems() {
      return [...this.items];
    }

    exportAsCSV() {
      if (this.items.length === 0) return 'Timestamp,Expression,Result,Mode\n';
      const rows = this.items.map(item => {
        const esc = (txt) => `"${String(txt).replace(/"/g, '""')}"`;
        return `${esc(item.timestamp)},${esc(item.expression)},${esc(item.result)},${esc(item.mode)}`;
      });
      return 'Timestamp,Expression,Result,Mode\n' + rows.join('\n');
    }
  }

  // ==========================================
  // 6. UI Controller (CalculatorApp)
  // ==========================================
  class CalculatorApp {
    constructor() {
      this.engine = new CalculatorEngine();
      this.sound = new SoundEffects();
      this.history = new HistoryManager();
      this.programmer = new ProgrammerEngine();

      this.currentMode = 'standard';
      this.currentTheme = 'dark-slate';
      this.themes = ['dark-slate', 'swiss-light', 'cyberpunk-neon', 'retro-classic'];

      this.currentInput = '0';
      this.expression = '';
      this.hasEvaluated = false;
      this.openParensCount = 0;

      this.initDOM();
      this.initTheme();
      this.initEventListeners();
      this.initKeyboard();
      this.initConverter();
      this.initProgrammer();
      this.initHistory();
      this.updateDisplay();

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const pTheme = urlParams.get('theme');
        if (pTheme && this.themes.includes(pTheme)) {
          this.currentTheme = pTheme;
          document.documentElement.setAttribute('data-theme', this.currentTheme);
        }
        const pMode = urlParams.get('mode');
        if (pMode) {
          this.setMode(pMode);
        }
      } catch {}
    }

    initDOM() {
      this.appWrapper = document.getElementById('appWrapper');
      this.mainReadout = document.getElementById('mainReadout');
      this.expressionTrack = document.getElementById('expressionTrack');
      this.angleModeTag = document.getElementById('angleModeTag');
      this.memoryTag = document.getElementById('memoryTag');
      this.btnDegRad = document.getElementById('btnDegRad');
      this.btnMC = document.getElementById('btnMC');
      this.btnMR = document.getElementById('btnMR');
      this.themeBtn = document.getElementById('themeBtn');
      this.soundBtn = document.getElementById('soundBtn');
      this.soundIconOn = document.getElementById('soundIconOn');
      this.soundIconOff = document.getElementById('soundIconOff');
      this.historyToggleBtn = document.getElementById('historyToggleBtn');
      this.historyBadge = document.getElementById('historyBadge');
      this.historyDrawer = document.getElementById('historyDrawer');
      this.historyList = document.getElementById('historyList');
      this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
      this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
      this.exportHistoryBtn = document.getElementById('exportHistoryBtn');
      this.shortcutsBtn = document.getElementById('shortcutsBtn');
      this.shortcutsModal = document.getElementById('shortcutsModal');
      this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
      this.copyResultBtn = document.getElementById('copyResultBtn');
      this.toastContainer = document.getElementById('toastContainer');

      this.calcKeypadView = document.getElementById('calcKeypadView');
      this.scientificSubgrid = document.getElementById('scientificSubgrid');
      this.converterView = document.getElementById('converterView');
      this.programmerView = document.getElementById('programmerView');
      this.mainDisplaySection = document.getElementById('mainDisplaySection');
      this.memoryBar = document.getElementById('memoryBar');

      this.converterCategories = document.getElementById('converterCategories');
      this.converterFromInput = document.getElementById('converterFromInput');
      this.converterFromSelect = document.getElementById('converterFromSelect');
      this.converterToInput = document.getElementById('converterToInput');
      this.converterToSelect = document.getElementById('converterToSelect');
      this.converterSwapBtn = document.getElementById('converterSwapBtn');
      this.clearFromInputBtn = document.getElementById('clearFromInputBtn');
      this.copyConverterBtn = document.getElementById('copyConverterBtn');
      this.conversionFormula = document.getElementById('conversionFormula');

      this.baseRepList = document.getElementById('baseRepList');
      this.valHEX = document.getElementById('valHEX');
      this.valDEC = document.getElementById('valDEC');
      this.valOCT = document.getElementById('valOCT');
      this.valBIN = document.getElementById('valBIN');
      this.bitMatrix = document.getElementById('bitMatrix');
      this.wordSizeSelect = document.getElementById('wordSizeSelect');
    }

    initTheme() {
      try {
        const savedTheme = localStorage.getItem('calc_theme');
        if (savedTheme && this.themes.includes(savedTheme)) {
          this.currentTheme = savedTheme;
        }
      } catch {}
      document.documentElement.setAttribute('data-theme', this.currentTheme);
    }

    cycleTheme() {
      const idx = this.themes.indexOf(this.currentTheme);
      this.currentTheme = this.themes[(idx + 1) % this.themes.length];
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      try {
        localStorage.setItem('calc_theme', this.currentTheme);
      } catch {}
      this.showToast(`Theme: ${this.getThemeDisplayName(this.currentTheme)}`);
      this.sound.playClick();
    }

    getThemeDisplayName(theme) {
      switch (theme) {
        case 'dark-slate': return 'Dark Slate';
        case 'swiss-light': return 'Swiss Light';
        case 'cyberpunk-neon': return 'Cyberpunk Neon';
        case 'retro-classic': return 'Retro Classic';
        default: return theme;
      }
    }

    toggleSound() {
      const enabled = this.sound.toggleSound();
      this.soundIconOn.style.display = enabled ? 'inline-block' : 'none';
      this.soundIconOff.style.display = enabled ? 'none' : 'inline-block';
      this.showToast(`Sound: ${enabled ? 'Enabled' : 'Muted'}`);
    }

    setMode(mode) {
      if (this.currentMode === mode) return;
      this.currentMode = mode;

      document.querySelectorAll('.tab-btn').forEach(tab => {
        const isSelected = tab.dataset.mode === mode;
        tab.classList.toggle('active', isSelected);
        tab.setAttribute('aria-selected', String(isSelected));
      });

      this.calcKeypadView.style.display = 'none';
      this.converterView.style.display = 'none';
      this.programmerView.style.display = 'none';
      this.scientificSubgrid.style.display = 'none';
      this.appWrapper.classList.remove('wide-mode');
      this.mainDisplaySection.style.display = 'flex';
      this.memoryBar.style.display = 'flex';
      this.angleModeTag.classList.add('hidden');

      if (mode === 'standard') {
        this.calcKeypadView.style.display = 'flex';
      } else if (mode === 'scientific') {
        this.calcKeypadView.style.display = 'flex';
        this.scientificSubgrid.style.display = 'grid';
        this.appWrapper.classList.add('wide-mode');
        this.angleModeTag.classList.remove('hidden');
        this.angleModeTag.textContent = this.engine.angleMode;
        this.btnDegRad.textContent = this.engine.angleMode === 'DEG' ? 'RAD' : 'DEG';
      } else if (mode === 'converter') {
        this.converterView.style.display = 'flex';
        this.mainDisplaySection.style.display = 'none';
        this.memoryBar.style.display = 'none';
        this.updateConverter();
      } else if (mode === 'programmer') {
        this.calcKeypadView.style.display = 'flex';
        this.programmerView.style.display = 'flex';
        this.memoryBar.style.display = 'none';
        this.updateProgrammerUI();
      }

      this.sound.playClick();
    }

    toggleAngleMode() {
      const newMode = this.engine.toggleAngleMode();
      this.angleModeTag.textContent = newMode;
      this.btnDegRad.textContent = newMode === 'DEG' ? 'RAD' : 'DEG';
      this.showToast(`Angle Mode: ${newMode}`);
      this.sound.playClick();
    }

    initEventListeners() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
      });

      this.themeBtn.addEventListener('click', () => this.cycleTheme());
      this.soundBtn.addEventListener('click', () => this.toggleSound());
      const soundEnabled = this.sound.enabled;
      this.soundIconOn.style.display = soundEnabled ? 'inline-block' : 'none';
      this.soundIconOff.style.display = soundEnabled ? 'none' : 'inline-block';

      this.angleModeTag.addEventListener('click', () => this.toggleAngleMode());

      this.shortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.add('active'));
      this.closeShortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.remove('active'));
      this.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === this.shortcutsModal) this.shortcutsModal.classList.remove('active');
      });

      this.historyToggleBtn.addEventListener('click', () => this.toggleHistoryDrawer(true));
      this.closeHistoryBtn.addEventListener('click', () => this.toggleHistoryDrawer(false));
      this.clearHistoryBtn.addEventListener('click', () => {
        this.history.clear();
        this.renderHistory();
        this.showToast('History Cleared');
        this.sound.playClear();
      });
      this.exportHistoryBtn.addEventListener('click', () => this.exportHistory());

      this.copyResultBtn.addEventListener('click', () => this.copyResult());

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.calc-btn');
        if (!btn) return;

        this.createRipple(btn, e);

        if (btn.dataset.num !== undefined) {
          this.inputDigit(btn.dataset.num);
          return;
        }
        if (btn.dataset.op !== undefined) {
          this.inputOperator(btn.dataset.op);
          return;
        }
        if (btn.dataset.fn !== undefined) {
          this.inputFunction(btn.dataset.fn);
          return;
        }
        if (btn.dataset.action !== undefined) {
          this.inputAction(btn.dataset.action);
          return;
        }
        if (btn.dataset.progOp !== undefined) {
          this.inputProgrammerOp(btn.dataset.progOp);
          return;
        }
      });

      document.querySelectorAll('.mem-btn').forEach(btn => {
        btn.addEventListener('click', () => this.handleMemory(btn.dataset.action));
      });
    }

    createRipple(button, event) {
      const circle = document.createElement('span');
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      const rect = button.getBoundingClientRect();
      const x = (event.clientX || rect.left + radius) - rect.left - radius;
      const y = (event.clientY || rect.top + radius) - rect.top - radius;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
      circle.classList.add('ripple');

      const ripple = button.querySelector('.ripple');
      if (ripple) ripple.remove();

      button.appendChild(circle);
      setTimeout(() => circle.remove(), 400);
    }

    inputDigit(digit) {
      this.sound.playClick();
      this.mainReadout.classList.remove('error-state');

      if (this.currentMode === 'programmer') {
        this.handleProgrammerDigit(digit);
        return;
      }

      if (this.hasEvaluated) {
        this.currentInput = digit === '.' ? '0.' : digit;
        this.expression = '';
        this.hasEvaluated = false;
      } else {
        if (digit === '.') {
          if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
          }
        } else {
          if (this.currentInput === '0') {
            this.currentInput = digit;
          } else {
            this.currentInput += digit;
          }
        }
      }

      this.updateDisplay();
    }

    inputOperator(op) {
      this.sound.playOperator();
      this.mainReadout.classList.remove('error-state');

      const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';

      if (this.hasEvaluated) {
        this.expression = `${this.currentInput} ${opSymbol} `;
        this.currentInput = '0';
        this.hasEvaluated = false;
      } else {
        if (this.expression.endsWith(' ') && this.currentInput === '0') {
          this.expression = this.expression.slice(0, -3) + ` ${opSymbol} `;
        } else {
          this.expression += `${this.currentInput} ${opSymbol} `;
          this.currentInput = '0';
        }
      }

      this.updateDisplay();
    }

    inputFunction(fn) {
      this.sound.playClick();
      this.mainReadout.classList.remove('error-state');

      if (fn === 'deg-rad') {
        this.toggleAngleMode();
        return;
      }
      if (fn === 'pi') {
        this.currentInput = CalculatorEngine.formatResult(Math.PI);
        this.updateDisplay();
        return;
      }
      if (fn === 'e') {
        this.currentInput = CalculatorEngine.formatResult(Math.E);
        this.updateDisplay();
        return;
      }

      const currentVal = parseFloat(this.currentInput);
      if (!isNaN(currentVal)) {
        try {
          let transformed;
          switch (fn) {
            case 'sqr': transformed = this.engine.applyFunction('sqr', currentVal); break;
            case 'sqrt': transformed = this.engine.applyFunction('sqrt', currentVal); break;
            case 'cbrt': transformed = this.engine.applyFunction('cbrt', currentVal); break;
            case 'inv': transformed = this.engine.applyFunction('inv', currentVal); break;
            case 'fact': transformed = this.engine.factorial(currentVal); break;
            case 'abs': transformed = this.engine.applyFunction('abs', currentVal); break;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
            case 'ln':
            case 'log':
            case 'exp':
              transformed = this.engine.applyFunction(fn, currentVal);
              break;
            case 'pow':
              this.expression += `${this.currentInput} ^ `;
              this.currentInput = '0';
              this.updateDisplay();
              return;
            case 'mod':
              this.expression += `${this.currentInput} mod `;
              this.currentInput = '0';
              this.updateDisplay();
              return;
            default:
              return;
          }

          this.history.add(`${fn}(${this.currentInput})`, CalculatorEngine.formatResult(transformed), 'scientific');
          this.currentInput = CalculatorEngine.formatResult(transformed);
          this.hasEvaluated = true;
          this.updateDisplay();
        } catch (err) {
          this.handleError(err.message);
        }
      }
    }

    inputAction(action) {
      this.mainReadout.classList.remove('error-state');

      switch (action) {
        case 'clear':
          this.sound.playClear();
          this.currentInput = '0';
          this.expression = '';
          this.openParensCount = 0;
          this.hasEvaluated = false;
          break;
        case 'backspace':
          this.sound.playClick();
          if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
          } else {
            this.currentInput = '0';
          }
          break;
        case 'negate':
          this.sound.playClick();
          if (this.currentInput !== '0') {
            if (this.currentInput.startsWith('-')) {
              this.currentInput = this.currentInput.slice(1);
            } else {
              this.currentInput = '-' + this.currentInput;
            }
          }
          break;
        case 'paren':
          this.sound.playClick();
          if (this.currentInput === '0' || this.expression.endsWith(' ') || this.openParensCount === 0) {
            this.expression += '(';
            this.openParensCount++;
          } else if (this.openParensCount > 0) {
            this.expression += `${this.currentInput})`;
            this.currentInput = '0';
            this.openParensCount--;
          }
          break;
        case 'evaluate':
          this.evaluate();
          break;
      }

      this.updateDisplay();
    }

    evaluate() {
      let fullExpr = this.expression + (this.currentInput !== '0' || !this.expression ? this.currentInput : '');
      while (this.openParensCount > 0) {
        fullExpr += ')';
        this.openParensCount--;
      }

      if (!fullExpr || fullExpr.trim() === '') return;

      try {
        const rawResult = this.engine.calculate(fullExpr);
        const formatted = CalculatorEngine.formatResult(rawResult);

        this.sound.playEquals();
        this.history.add(fullExpr, formatted, this.currentMode);
        this.renderHistory();

        this.expressionTrack.textContent = `${fullExpr} =`;
        this.currentInput = formatted;
        this.expression = '';
        this.hasEvaluated = true;
        this.mainReadout.textContent = formatted;
        this.adjustReadoutFontSize(formatted);
      } catch (err) {
        this.handleError(err.message);
      }
    }

    handleError(msg) {
      this.sound.playError();
      this.mainReadout.textContent = msg || 'Error';
      this.mainReadout.classList.add('error-state');
      this.currentInput = '0';
      this.expression = '';
      this.hasEvaluated = true;
    }

    updateDisplay() {
      this.expressionTrack.textContent = this.expression || '\u00A0';
      this.mainReadout.textContent = this.currentInput;
      this.adjustReadoutFontSize(this.currentInput);
    }

    adjustReadoutFontSize(text) {
      const len = String(text).length;
      if (len > 14) {
        this.mainReadout.style.fontSize = '1.75rem';
      } else if (len > 10) {
        this.mainReadout.style.fontSize = '2.2rem';
      } else {
        this.mainReadout.style.fontSize = '2.75rem';
      }
    }

    handleMemory(action) {
      this.sound.playClick();
      const currentVal = parseFloat(this.currentInput) || 0;

      switch (action) {
        case 'mc':
          this.engine.memoryClear();
          this.showToast('Memory Cleared');
          break;
        case 'mr':
          this.currentInput = CalculatorEngine.formatResult(this.engine.memoryRecall());
          this.hasEvaluated = true;
          this.updateDisplay();
          this.showToast('Memory Recalled');
          break;
        case 'ms':
          this.engine.memoryStore(currentVal);
          this.showToast(`Stored to Memory (${currentVal})`);
          break;
        case 'm-plus':
          this.engine.memoryAdd(currentVal);
          this.showToast(`Memory + ${currentVal}`);
          break;
        case 'm-minus':
          this.engine.memorySubtract(currentVal);
          this.showToast(`Memory − ${currentVal}`);
          break;
      }

      const hasMem = this.engine.hasMemory();
      this.memoryTag.classList.toggle('hidden', !hasMem);
      this.btnMC.disabled = !hasMem;
      this.btnMR.disabled = !hasMem;
      this.btnMR.classList.toggle('active-mem', hasMem);
    }

    initConverter() {
      this.activeCategory = 'length';

      document.querySelectorAll('.chip-btn').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.activeCategory = chip.dataset.cat;
          this.populateConverterUnits();
          this.updateConverter();
        });
      });

      this.populateConverterUnits();

      this.converterFromInput.addEventListener('input', () => this.updateConverter('from'));
      this.converterToInput.addEventListener('input', () => this.updateConverter('to'));
      this.converterFromSelect.addEventListener('change', () => this.updateConverter('from'));
      this.converterToSelect.addEventListener('change', () => this.updateConverter('from'));

      this.converterSwapBtn.addEventListener('click', () => {
        const temp = this.converterFromSelect.value;
        this.converterFromSelect.value = this.converterToSelect.value;
        this.converterToSelect.value = temp;
        this.updateConverter('from');
        this.sound.playClick();
      });

      if (this.clearFromInputBtn) {
        this.clearFromInputBtn.addEventListener('click', () => {
          this.converterFromInput.value = '0';
          this.updateConverter('from');
          this.converterFromInput.focus();
          this.sound.playClear();
        });
      }

      if (this.copyConverterBtn) {
        this.copyConverterBtn.addEventListener('click', () => {
          const val = this.converterToInput.value;
          const toUnitText = this.converterToSelect.options[this.converterToSelect.selectedIndex]?.text || '';
          const textToCopy = `${val} ${toUnitText}`;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).then(() => {
              this.showToast(`Copied "${val}"`);
            }).catch(() => {
              this.fallbackCopy(val);
            });
          } else {
            this.fallbackCopy(val);
          }
          this.sound.playClick();
        });
      }
    }

    populateConverterUnits() {
      const cat = UNIT_CATEGORIES[this.activeCategory];
      if (!cat) return;
      const unitKeys = Object.keys(cat.units);

      this.converterFromSelect.innerHTML = unitKeys
        .map(k => `<option value="${k}">${cat.units[k].name}</option>`)
        .join('');

      this.converterToSelect.innerHTML = unitKeys
        .map(k => `<option value="${k}">${cat.units[k].name}</option>`)
        .join('');

      if (unitKeys.length >= 2) {
        this.converterFromSelect.selectedIndex = 0;
        this.converterToSelect.selectedIndex = 1;
      }
    }

    updateConverter(direction = 'from') {
      try {
        const cat = this.activeCategory;
        const catObj = UNIT_CATEGORIES[cat];
        if (direction === 'from') {
          const val = parseFloat(this.converterFromInput.value) || 0;
          const res = UnitConverter.convert(
            val,
            cat,
            this.converterFromSelect.value,
            this.converterToSelect.value
          );
          this.converterToInput.value = res;
        } else {
          const val = parseFloat(this.converterToInput.value) || 0;
          const res = UnitConverter.convert(
            val,
            cat,
            this.converterToSelect.value,
            this.converterFromSelect.value
          );
          this.converterFromInput.value = res;
        }

        if (this.conversionFormula && catObj) {
          const oneUnitRes = UnitConverter.convert(
            1,
            cat,
            this.converterFromSelect.value,
            this.converterToSelect.value
          );
          const fromName = catObj.units[this.converterFromSelect.value]?.name || this.converterFromSelect.value;
          const toName = catObj.units[this.converterToSelect.value]?.name || this.converterToSelect.value;
          this.conversionFormula.textContent = `1 ${fromName} = ${oneUnitRes} ${toName}`;
        }
      } catch {}
    }

    initProgrammer() {
      this.wordSizeSelect.addEventListener('change', (e) => {
        this.programmer.setWordSize(e.target.value);
        this.updateProgrammerUI();
        this.sound.playClick();
      });

      this.renderBitMatrix(32);

      document.querySelectorAll('.base-row').forEach(row => {
        row.addEventListener('click', () => {
          document.querySelectorAll('.base-row').forEach(r => r.classList.remove('active'));
          row.classList.add('active');
          this.programmerActiveBase = row.dataset.base;
          this.sound.playClick();
        });
      });

      this.programmerActiveBase = 'DEC';
    }

    renderBitMatrix(totalBits = 32) {
      this.bitMatrix.innerHTML = '';
      for (let i = totalBits - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'bit-cell';
        cell.dataset.bit = String(i);
        cell.textContent = '0';
        cell.title = `Bit ${i} (Weight: 2^${i})`;
        cell.addEventListener('click', () => {
          this.programmer.toggleBit(i);
          this.updateProgrammerUI();
          this.sound.playClick();
        });
        this.bitMatrix.appendChild(cell);
      }
    }

    handleProgrammerDigit(digit) {
      const base = this.programmerActiveBase || 'DEC';
      const currentValStr = this.programmer.value.toString(
        base === 'HEX' ? 16 : base === 'OCT' ? 8 : base === 'BIN' ? 2 : 10
      );

      let nextStr = this.programmer.value === 0n ? digit : currentValStr + digit;

      try {
        let parsed;
        if (base === 'HEX') parsed = BigInt('0x' + nextStr);
        else if (base === 'OCT') parsed = BigInt('0o' + nextStr);
        else if (base === 'BIN') parsed = BigInt('0b' + nextStr);
        else parsed = BigInt(nextStr);

        this.programmer.setValue(parsed);
        this.updateProgrammerUI();
      } catch {}
    }

    inputProgrammerOp(op) {
      this.sound.playOperator();
      switch (op) {
        case 'NOT': this.programmer.not(); break;
        case 'LSH': this.programmer.lsh(1n); break;
        case 'RSH': this.programmer.rsh(1n); break;
      }
      this.updateProgrammerUI();
    }

    updateProgrammerUI() {
      const rep = this.programmer.getRepresentations();
      this.valHEX.textContent = rep.HEX;
      this.valDEC.textContent = rep.DEC;
      this.valOCT.textContent = rep.OCT;
      this.valBIN.textContent = rep.BIN_FORMATTED;

      this.mainReadout.textContent = rep[this.programmerActiveBase || 'DEC'];

      const cells = this.bitMatrix.querySelectorAll('.bit-cell');
      cells.forEach(cell => {
        const bitIdx = parseInt(cell.dataset.bit, 10);
        const isSet = (this.programmer.value & (1n << BigInt(bitIdx))) !== 0n;
        cell.textContent = isSet ? '1' : '0';
        cell.classList.toggle('bit-on', isSet);
      });
    }

    initHistory() {
      this.renderHistory();
      this.history.subscribe(() => this.renderHistory());
    }

    toggleHistoryDrawer(open) {
      this.historyDrawer.classList.toggle('open', open);
      this.sound.playClick();
    }

    renderHistory() {
      const items = this.history.getItems();
      this.historyBadge.style.display = items.length > 0 ? 'block' : 'none';

      if (items.length === 0) {
        this.historyList.innerHTML = '<p class="history-empty">No calculations recorded yet.</p>';
        return;
      }

      this.historyList.innerHTML = items
        .map(item => `
          <div class="history-item" data-res="${item.result}" data-expr="${item.expression}">
            <div class="history-time">${item.timestamp} • ${item.mode}</div>
            <div class="history-expr">${item.expression}</div>
            <div class="history-res">= ${item.result}</div>
          </div>
        `)
        .join('');

      this.historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          this.currentInput = el.dataset.res;
          this.expression = '';
          this.hasEvaluated = true;
          this.updateDisplay();
          this.toggleHistoryDrawer(false);
          this.showToast(`Loaded ${el.dataset.res}`);
          this.sound.playClick();
        });
      });
    }

    exportHistory() {
      const csv = this.history.exportAsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculator-history-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('History exported as CSV');
    }

    initKeyboard() {
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        const key = e.key;

        if (/^[0-9]$/.test(key)) {
          this.inputDigit(key);
          this.highlightButton(`[data-num="${key}"]`);
          e.preventDefault();
          return;
        }

        if (['+', '-', '*', '/'].includes(key)) {
          this.inputOperator(key);
          this.highlightButton(`[data-op="${key}"]`);
          e.preventDefault();
          return;
        }

        if (key === '^') {
          this.inputFunction('pow');
          e.preventDefault();
          return;
        }

        if (key === '(' || key === ')') {
          this.inputAction('paren');
          this.highlightButton('[data-action="paren"]');
          e.preventDefault();
          return;
        }

        if (key === 'Enter' || key === '=') {
          this.inputAction('evaluate');
          this.highlightButton('[data-action="evaluate"]');
          e.preventDefault();
          return;
        }

        if (key === 'Backspace') {
          this.inputAction('backspace');
          this.highlightButton('[data-action="backspace"]');
          e.preventDefault();
          return;
        }

        if (key === 'Escape' || key.toLowerCase() === 'c') {
          this.inputAction('clear');
          this.highlightButton('[data-action="clear"]');
          e.preventDefault();
          return;
        }

        if (key === '.') {
          this.inputDigit('.');
          this.highlightButton('[data-num="."]');
          e.preventDefault();
          return;
        }

        if (key.toLowerCase() === 'h') {
          this.toggleHistoryDrawer(!this.historyDrawer.classList.contains('open'));
          e.preventDefault();
          return;
        }

        if (key.toLowerCase() === 'r') {
          this.toggleAngleMode();
          e.preventDefault();
          return;
        }

        if (key === '?') {
          this.shortcutsModal.classList.toggle('active');
          e.preventDefault();
          return;
        }
      });
    }

    highlightButton(selector) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 120);
      }
    }

    copyResult() {
      const text = this.mainReadout.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast(`Copied "${text}" to clipboard`);
        }).catch(() => {
          this.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    }

    fallbackCopy(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast(`Copied "${text}" to clipboard`);
      } catch {}
      document.body.removeChild(textArea);
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      this.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CalculatorApp());
  } else {
    new CalculatorApp();
  }
})();

