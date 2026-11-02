import test from 'node:test';
import assert from 'node:assert/strict';
import { CalculatorEngine } from '../js/calculator-engine.js';

test('Basic Arithmetic', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('2 + 3'), 5);
  assert.equal(engine.calculate('10 - 4'), 6);
  assert.equal(engine.calculate('6 * 7'), 42);
  assert.equal(engine.calculate('20 / 4'), 5);
  assert.equal(engine.calculate('17 % 5'), 2);
});

test('Precision Formatting (Fix 0.1 + 0.2)', () => {
  const engine = new CalculatorEngine();
  const res = engine.calculate('0.1 + 0.2');
  assert.equal(CalculatorEngine.formatResult(res), '0.3');
});

test('Operator Precedence and Associativity', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('2 + 3 * 4'), 14);
  assert.equal(engine.calculate('(2 + 3) * 4'), 20);
  assert.equal(engine.calculate('2 ^ 3 ^ 2'), 512); // right-associative: 2^(3^2) = 2^9 = 512
  assert.equal(engine.calculate('10 - 2 - 3'), 5); // left-associative: (10-2)-3 = 5
});

test('Unary Operations and Implicit Multiplication', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('-5 + 10'), 5);
  assert.equal(engine.calculate('5 * -2'), -10);
  assert.equal(engine.calculate('-(3 + 4)'), -7);
  assert.equal(engine.calculate('2(3 + 4)'), 14); // implicit multiplication
  assert.equal(engine.calculate('(2)(3)'), 6);
});

test('Postfix Operations (Factorial and Percent)', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('5!'), 120);
  assert.equal(engine.calculate('0!'), 1);
  assert.equal(engine.calculate('200 * 15%'), 30);
  assert.equal(engine.calculate('50%'), 0.5);
});

test('Trigonometry in DEG and RAD Modes', () => {
  const engine = new CalculatorEngine();
  engine.setAngleMode('DEG');
  assert.equal(Math.round(engine.calculate('sin(30)') * 100) / 100, 0.5);
  assert.equal(engine.calculate('cos(90)'), 0);
  assert.equal(Math.round(engine.calculate('tan(45)')), 1);
  assert.equal(engine.calculate('asin(0.5)'), 30);

  engine.setAngleMode('RAD');
  assert.equal(Math.round(engine.calculate('sin(pi / 2)')), 1);
});

test('Logarithms, Roots, and Powers', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('sqrt(16)'), 4);
  assert.equal(engine.calculate('cbrt(27)'), 3);
  assert.equal(engine.calculate('log(100)'), 2);
  assert.equal(Math.round(engine.calculate('ln(e)')), 1);
  assert.equal(engine.calculate('abs(-42)'), 42);
  assert.equal(engine.calculate('sqr(5)'), 25);
  assert.equal(engine.calculate('inv(4)'), 0.25);
});

test('Constants', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.calculate('pi'), Math.PI);
  assert.equal(engine.calculate('e'), Math.E);
  assert.equal(engine.calculate('2pi'), 2 * Math.PI);
});

test('Memory Operations', () => {
  const engine = new CalculatorEngine();
  assert.equal(engine.hasMemory(), false);
  engine.memoryStore(50);
  assert.equal(engine.hasMemory(), true);
  assert.equal(engine.memoryRecall(), 50);
  engine.memoryAdd(25);
  assert.equal(engine.memoryRecall(), 75);
  engine.memorySubtract(15);
  assert.equal(engine.memoryRecall(), 60);
  engine.memoryClear();
  assert.equal(engine.memoryRecall(), 0);
  assert.equal(engine.hasMemory(), false);
});

test('Error Handling', () => {
  const engine = new CalculatorEngine();
  assert.throws(() => engine.calculate('10 / 0'), /Cannot divide by zero/);
  assert.throws(() => engine.calculate('sqrt(-4)'), /Square root of negative/);
  assert.throws(() => engine.calculate('log(-10)'), /Logarithm undefined/);
  assert.throws(() => engine.calculate('(2 + 3'), /Mismatched parentheses/);
  assert.throws(() => engine.calculate('2 + * 3'), /Missing operand/);
});

