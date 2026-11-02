import test from 'node:test';
import assert from 'node:assert/strict';
import { UnitConverter } from '../js/unit-converter.js';
import { ProgrammerEngine } from '../js/programmer-mode.js';

test('Unit Converter - Length', () => {
  assert.equal(UnitConverter.convert(1, 'length', 'km', 'm'), 1000);
  assert.equal(UnitConverter.convert(1, 'length', 'm', 'cm'), 100);
  assert.equal(UnitConverter.convert(1, 'length', 'mi', 'm'), 1609.344);
});

test('Unit Converter - Temperature', () => {
  assert.equal(UnitConverter.convert(0, 'temperature', 'C', 'F'), 32);
  assert.equal(UnitConverter.convert(100, 'temperature', 'C', 'F'), 212);
  assert.equal(UnitConverter.convert(212, 'temperature', 'F', 'C'), 100);
  assert.equal(UnitConverter.convert(0, 'temperature', 'C', 'K'), 273.15);
});

test('Unit Converter - Data Storage', () => {
  assert.equal(UnitConverter.convert(1, 'data', 'GB', 'MB'), 1024);
  assert.equal(UnitConverter.convert(1, 'data', 'MB', 'KB'), 1024);
  assert.equal(UnitConverter.convert(1, 'data', 'TB', 'GB'), 1024);
});

test('Programmer Engine - Base representations', () => {
  const prog = new ProgrammerEngine();
  prog.setValue(255);
  const rep = prog.getRepresentations();
  assert.equal(rep.HEX, 'FF');
  assert.equal(rep.DEC, '255');
  assert.equal(rep.OCT, '377');
  assert.equal(rep.BIN.slice(-8), '11111111');
});

test('Programmer Engine - Bitwise operations', () => {
  const prog = new ProgrammerEngine();
  prog.setWordSize('BYTE'); // 8-bit
  prog.setValue(0b1100);
  prog.and(0b1010);
  assert.equal(prog.value, 0b1000n);

  prog.or(0b0011);
  assert.equal(prog.value, 0b1011n);

  prog.xor(0b1111);
  assert.equal(prog.value, 0b0100n);
});

test('Programmer Engine - Bit toggle', () => {
  const prog = new ProgrammerEngine();
  prog.setWordSize('BYTE');
  prog.setValue(0);
  prog.toggleBit(0); // set bit 0 -> 1
  assert.equal(prog.value, 1n);
  prog.toggleBit(2); // set bit 2 -> 5 (1 + 4)
  assert.equal(prog.value, 5n);
  prog.toggleBit(0); // clear bit 0 -> 4
  assert.equal(prog.value, 4n);
});

