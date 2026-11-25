import { describe, it, expect } from 'vitest';
import { validateFrequencyTable } from './validate';
import { buildCumulativeTable } from './cumulative';
import { FREQUENCY_TOTAL } from './types';

// Helper: build a valid 4-entry FrequencyTable (Uint32Array) summing to FREQUENCY_TOTAL
function validFreq4(): Uint32Array {
  const perSymbol = FREQUENCY_TOTAL / 4; // 4_194_304
  return new Uint32Array([perSymbol, perSymbol, perSymbol, perSymbol]);
}

describe('validateFrequencyTable', () => {
  describe('wrong length', () => {
    it('throws when table is too short', () => {
      const table = new Uint32Array([1, 2]);
      expect(() => validateFrequencyTable(table, 4)).toThrowError(
        /length is 2, expected 4/
      );
    });

    it('throws when table is too long', () => {
      const table = new Uint32Array([1, 2, 3, 4, 5]);
      expect(() => validateFrequencyTable(table, 4)).toThrowError(
        /length is 5, expected 4/
      );
    });
  });

  describe('zero-frequency entries', () => {
    it('throws for zero at index 0', () => {
      // Build a table where only index 0 is 0, rest share the total
      const third = FREQUENCY_TOTAL / 3;
      const table = [0, third, third, third];
      expect(() => validateFrequencyTable(table, 4)).toThrowError(/index 0/);
      expect(() => validateFrequencyTable(table, 4)).toThrowError(/must be ≥ 1/);
    });

    it('throws for zero at a mid-table index', () => {
      const half = FREQUENCY_TOTAL / 2;
      const table = [half, 0, half, 0]; // multiple zeros; first is at index 1
      // length is 4 but sum is wrong too; zero check fires first (per implementation order)
      // Use a table with correct sum but zero at index 2
      const a = FREQUENCY_TOTAL - 3;
      const tableB = [1, 1, 0, 1]; // sum != FREQUENCY_TOTAL but zero fires first
      expect(() => validateFrequencyTable(tableB, 4)).toThrowError(/index 2/);
      expect(() => validateFrequencyTable(tableB, 4)).toThrowError(/must be ≥ 1/);
    });
  });

  describe('fractional entries', () => {
    it('throws for a fractional entry', () => {
      const table = [0.5, FREQUENCY_TOTAL - 1, 0, 0]; // length 4
      expect(() => validateFrequencyTable(table, 4)).toThrowError(/must be ≥ 1/);
    });
  });

  describe('NaN entries', () => {
    it('throws for a NaN entry', () => {
      const table = [NaN, FREQUENCY_TOTAL - 1, 0, 0];
      expect(() => validateFrequencyTable(table, 4)).toThrowError(/must be ≥ 1/);
    });
  });

  describe('wrong sum', () => {
    it('throws when sum is too low by 1', () => {
      const perSymbol = FREQUENCY_TOTAL / 4;
      const table = [perSymbol, perSymbol, perSymbol, perSymbol - 1];
      expect(() => validateFrequencyTable(table, 4)).toThrowError(
        /expected 16777216/
      );
    });

    it('throws when sum is too high by 1', () => {
      const perSymbol = FREQUENCY_TOTAL / 4;
      const table = [perSymbol, perSymbol, perSymbol, perSymbol + 1];
      expect(() => validateFrequencyTable(table, 4)).toThrowError(
        /expected 16777216/
      );
    });
  });

  describe('valid inputs', () => {
    it('accepts a valid Uint32Array', () => {
      expect(() => validateFrequencyTable(validFreq4(), 4)).not.toThrow();
    });

    it('accepts a valid number[]', () => {
      const perSymbol = FREQUENCY_TOTAL / 4;
      const table = [perSymbol, perSymbol, perSymbol, perSymbol];
      expect(() => validateFrequencyTable(table, 4)).not.toThrow();
    });
  });
});

describe('buildCumulativeTable', () => {
  describe('wrong length', () => {
    it('throws when freq.length does not match buffer.length - 1', () => {
      const freq = new Uint32Array([1, 2, 3]); // length 3
      const buffer = new Uint32Array(5);        // alphabetSize = 4
      expect(() => buildCumulativeTable(freq, buffer)).toThrowError(
        /length is 3, expected 4/
      );
    });
  });

  describe('zero entry', () => {
    it('throws for zero at index 1', () => {
      const freq = [1, 0, 1, 1]; // length 4; buffer length 5
      const buffer = new Uint32Array(5);
      expect(() => buildCumulativeTable(freq, buffer)).toThrowError(/index 1/);
      expect(() => buildCumulativeTable(freq, buffer)).toThrowError(/must be ≥ 1/);
    });
  });

  describe('fractional entry', () => {
    it('throws for a fractional entry', () => {
      const freq = [1, 1.5, 1, 1];
      const buffer = new Uint32Array(5);
      expect(() => buildCumulativeTable(freq, buffer)).toThrowError(/must be ≥ 1/);
    });
  });

  describe('wrong sum', () => {
    it('throws when sum does not equal FREQUENCY_TOTAL', () => {
      const freq = [1, 1, 1, 1]; // sum = 4, not FREQUENCY_TOTAL
      const buffer = new Uint32Array(5);
      expect(() => buildCumulativeTable(freq, buffer)).toThrowError(
        /expected 16777216/
      );
    });
  });

  describe('correct cumulative values', () => {
    it('produces the right prefix sums for a uniform 4-symbol table', () => {
      const perSymbol = FREQUENCY_TOTAL / 4; // 4_194_304
      const freq = new Uint32Array([perSymbol, perSymbol, perSymbol, perSymbol]);
      const buffer = new Uint32Array(5);

      const result = buildCumulativeTable(freq, buffer);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(4_194_304);
      expect(result[2]).toBe(8_388_608);
      expect(result[3]).toBe(12_582_912);
      expect(result[4]).toBe(16_777_216);
    });

    it('returns the same buffer reference', () => {
      const perSymbol = FREQUENCY_TOTAL / 4;
      const freq = new Uint32Array([perSymbol, perSymbol, perSymbol, perSymbol]);
      const buffer = new Uint32Array(5);

      const result = buildCumulativeTable(freq, buffer);

      expect(result).toBe(buffer);
    });
  });
});
