/**
 * Programmer Mode Engine
 * High-performance bitwise math, base representations (HEX, DEC, OCT, BIN),
 * bit-width masking (BYTE 8-bit, WORD 16-bit, DWORD 32-bit, QWORD 64-bit),
 * and live bit manipulation.
 */

export const WORD_SIZES = {
  QWORD: { name: 'QWORD (64-bit)', bits: 64n, mask: 0xFFFFFFFFFFFFFFFFn },
  DWORD: { name: 'DWORD (32-bit)', bits: 32n, mask: 0xFFFFFFFFn },
  WORD: { name: 'WORD (16-bit)', bits: 16n, mask: 0xFFFFn },
  BYTE: { name: 'BYTE (8-bit)', bits: 8n, mask: 0xFFn }
};

export class ProgrammerEngine {
  constructor() {
    this.wordSize = 'DWORD'; // Default 32-bit
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
    const mask = this.getMask();
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

  // Bitwise Operations
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

  nand(other) {
    this.value = this.clamp(~(this.value & BigInt(other)));
    return this.value;
  }

  nor(other) {
    this.value = this.clamp(~(this.value | BigInt(other)));
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

  rol(shiftAmount = 1n) {
    const bits = this.getBits();
    const s = BigInt(shiftAmount) % bits;
    const v = this.clamp(this.value);
    this.value = this.clamp((v << s) | (v >> (bits - s)));
    return this.value;
  }

  ror(shiftAmount = 1n) {
    const bits = this.getBits();
    const s = BigInt(shiftAmount) % bits;
    const v = this.clamp(this.value);
    this.value = this.clamp((v >> s) | (v << (bits - s)));
    return this.value;
  }

  // Formatted representations
  getRepresentations() {
    const bits = Number(this.getBits());
    const unsignedVal = this.clamp(this.value);
    const signedVal = BigInt.asIntN(bits, unsignedVal);

    // Binary string padded to bits, formatted in 4-bit nibbles
    let binStr = unsignedVal.toString(2).padStart(bits, '0');
    // Group into 4-bit nibbles for readablility
    const nibbles = binStr.match(/.{1,4}/g)?.join(' ') ?? binStr;

    return {
      HEX: unsignedVal.toString(16).toUpperCase(),
      DEC: this.isSigned ? signedVal.toString(10) : unsignedVal.toString(10),
      OCT: unsignedVal.toString(8),
      BIN: binStr,
      BIN_FORMATTED: nibbles,
      BITS: bits,
      RAW_VALUE: unsignedVal
    };
  }
}

