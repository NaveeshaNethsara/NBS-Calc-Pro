/**
 * Advanced Mathematical & Expression Parser Engine
 * Supports arithmetic, operator precedence, scientific functions,
 * angle modes (DEG/RAD), floating-point precision correction, and memory.
 */

export class CalculatorEngine {
  constructor() {
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
    this.memory = 0;
    this.lastResult = null;
    this.history = [];
  }

  setAngleMode(mode) {
    if (mode === 'DEG' || mode === 'RAD') {
      this.angleMode = mode;
    }
  }

  toggleAngleMode() {
    this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
    return this.angleMode;
  }

  // Memory functions
  memoryClear() {
    this.memory = 0;
    return this.memory;
  }

  memoryRecall() {
    return this.memory;
  }

  memoryStore(val) {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num)) {
      this.memory = num;
    }
    return this.memory;
  }

  memoryAdd(val) {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num)) {
      this.memory += num;
    }
    return this.memory;
  }

  memorySubtract(val) {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num)) {
      this.memory -= num;
    }
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

  /**
   * Tokenize mathematical expression
   */
  tokenize(rawExpr) {
    if (typeof rawExpr !== 'string') {
      throw new Error('Expression must be a string');
    }

    // Normalize symbols
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

      // Whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (including decimals and scientific notation like 1e5 or 2.5e-3)
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

      // Word tokens: functions, constants, or operators (mod)
      if (isAlpha(ch)) {
        let name = '';
        while (i < len && (isAlpha(expr[i]) || isDigit(expr[i]))) {
          name += expr[i];
          i++;
        }
        const lowerName = name.toLowerCase();

        // Check constants
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
          // Function name (sin, cos, tan, sqrt, etc.)
          tokens.push({ type: 'FUNCTION', value: lowerName });
        }
        continue;
      }

      // Operators and punctuation
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
        // Look ahead to see if it's binary modulo or postfix percent:
        // If followed by an operand (number, word, or left paren), it's binary modulo.
        // Otherwise, it's postfix percentage (e.g. 50% or 200 * 15%).
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
        // Distinguish between binary +/- and unary +/-
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

    // Auto-insert implicit multiplication where appropriate:
    // e.g. 2(3) -> 2 * (3), (2)(3) -> (2) * (3), 2pi -> 2 * pi, 2sqrt(4) -> 2 * sqrt(4)
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

  /**
   * Shunting-yard algorithm to convert infix tokens to postfix (RPN)
   */
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
        if (!foundLeftParen) {
          throw new Error('Mismatched parentheses: unexpected ")"');
        }
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

  /**
   * Evaluate Postfix (RPN) queue
   */
  evaluateRPN(rpnQueue) {
    const stack = [];

    for (const token of rpnQueue) {
      if (token.type === 'NUMBER') {
        stack.push(token.value);
      } else if (token.type === 'UNARY_OP') {
        if (stack.length < 1) throw new Error('Missing operand for unary operator');
        const val = stack.pop();
        if (token.value === 'neg') {
          stack.push(CalculatorEngine.cleanFloat(-val));
        } else {
          stack.push(CalculatorEngine.cleanFloat(+val));
        }
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

    if (stack.length !== 1) {
      throw new Error('Invalid expression format');
    }

    return CalculatorEngine.cleanFloat(stack[0]);
  }

  /**
   * Apply binary operator
   */
  applyBinaryOp(op, a, b) {
    let result;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        if (b === 0) throw new Error('Cannot divide by zero');
        result = a / b;
        break;
      case '%':
        if (b === 0) throw new Error('Cannot divide by zero in modulo');
        result = a % b;
        break;
      case '^':
        result = Math.pow(a, b);
        break;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
    return CalculatorEngine.cleanFloat(result);
  }

  /**
   * Mathematical functions
   */
  applyFunction(fnName, x) {
    const isDeg = this.angleMode === 'DEG';
    const toRad = (angle) => (angle * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    let res;
    switch (fnName) {
      // Trigonometric
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

      // Hyperbolic
      case 'sinh':
        res = Math.sinh(x);
        break;
      case 'cosh':
        res = Math.cosh(x);
        break;
      case 'tanh':
        res = Math.tanh(x);
        break;

      // Logarithmic and Exponential
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
      case 'exp':
        res = Math.exp(x);
        break;

      // Roots and Powers
      case 'sqrt':
        if (x < 0) throw new Error('Square root of negative number');
        res = Math.sqrt(x);
        break;
      case 'cbrt':
        res = Math.cbrt(x);
        break;
      case 'abs':
        res = Math.abs(x);
        break;
      case 'inv':
        if (x === 0) throw new Error('Cannot divide by zero');
        res = 1 / x;
        break;
      case 'sqr':
        res = x * x;
        break;
      case 'cube':
        res = x * x * x;
        break;
      case 'fact':
        res = this.factorial(x);
        break;

      default:
        throw new Error(`Unknown function "${fnName}"`);
    }

    return CalculatorEngine.cleanFloat(res);
  }

  /**
   * Factorial with support for positive integers
   */
  factorial(n) {
    if (n < 0) throw new Error('Factorial of negative number undefined');
    if (!Number.isInteger(n)) throw new Error('Factorial only defined for integers');
    if (n > 170) throw new Error('Factorial overflow (max n=170)');
    if (n === 0 || n === 1) return 1;

    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  /**
   * Main calculation entrypoint
   */
  calculate(expression) {
    if (!expression || expression.trim() === '') {
      return 0;
    }

    const tokens = this.tokenize(expression);
    if (tokens.length === 0) return 0;

    const rpn = this.toRPN(tokens);
    const result = this.evaluateRPN(rpn);

    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Calculation resulted in NaN');
    }

    if (!isFinite(result)) {
      throw new Error('Result overflowed (Infinity)');
    }

    this.lastResult = result;
    return result;
  }

  /**
   * High-precision human-friendly formatting
   * Eliminates JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.3)
   */
  static formatResult(num, maxDigits = 12) {
    if (typeof num !== 'number' || isNaN(num)) return 'Error';
    if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
    if (num === 0) return '0';

    const abs = Math.abs(num);

    // Exponential notation for extreme numbers
    if (abs >= 1e15 || (abs < 1e-7 && abs !== 0)) {
      return num.toExponential(8).replace(/\.?0+e/, 'e');
    }

    // Round to prevent floating point jitter
    const rounded = parseFloat(num.toPrecision(maxDigits));
    return rounded.toString();
  }
}
