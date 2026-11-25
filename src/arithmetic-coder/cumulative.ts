import { FrequencyTable, CumulativeTable, FREQUENCY_TOTAL } from './types';

/**
 * Builds a prefix-sum cumulative frequency table from a FrequencyTable.
 * Reuses a pre-allocated buffer (length = alphabetSize + 1).
 *
 * cumTable[0] = 0
 * cumTable[i] = freq[0] + freq[1] + ... + freq[i-1]
 * cumTable[alphabetSize] = FREQUENCY_TOTAL
 *
 * Single-pass: validates each entry is a positive integer while accumulating.
 * Checks length match and final sum at the appropriate points.
 *
 * No bitwise operators are used (see design rule).
 */
export function buildCumulativeTable(
  freq: FrequencyTable,
  buffer: Uint32Array
): CumulativeTable {
  const alphabetSize = buffer.length - 1;
  if (freq.length !== alphabetSize) {
    throw new Error(
      `FrequencyTable length is ${freq.length}, expected ${alphabetSize}`
    );
  }

  let sum = 0;
  buffer[0] = 0;

  for (let i = 0; i < freq.length; i++) {
    const entry = freq[i];
    if (!Number.isInteger(entry) || entry < 1) {
      throw new Error(
        `FrequencyTable entry at index ${i} is ${entry}; must be ≥ 1`
      );
    }
    sum += entry;
    buffer[i + 1] = sum;
  }

  if (sum !== FREQUENCY_TOTAL) {
    throw new Error(
      `FrequencyTable sum is ${sum}, expected ${FREQUENCY_TOTAL} (2^24)`
    );
  }

  return buffer;
}

/**
 * Binary search: returns the symbol s such that
 * cumTable[s] <= value < cumTable[s + 1].
 * Used by the decoder to identify which symbol a given scaled code value falls into.
 * O(log alphabetSize).
 *
 * @param cumTable - CumulativeTable of length alphabetSize + 1
 * @param value    - a value in [0, FREQUENCY_TOTAL)
 * @returns symbol index s in [0, alphabetSize - 1]
 */
export function findSymbol(cumTable: CumulativeTable, value: number): number {
  let lo = 0;
  let hi = cumTable.length - 1; // hi = alphabetSize (one past the last valid symbol)

  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (cumTable[mid] <= value) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return lo;
}
