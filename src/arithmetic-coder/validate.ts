import { FrequencyTable, FREQUENCY_TOTAL } from './types';

/**
 * Validates a FrequencyTable against the codec contract.
 * Throws a descriptive Error on any violation.
 */
export function validateFrequencyTable(
  table: FrequencyTable,
  alphabetSize: number
): void {
  if (table.length !== alphabetSize) {
    throw new Error(
      `FrequencyTable length is ${table.length}, expected ${alphabetSize}`
    );
  }

  for (let i = 0; i < table.length; i++) {
    const entry = table[i];
    if (!Number.isInteger(entry) || entry < 1) {
      throw new Error(
        `FrequencyTable entry at index ${i} is ${entry}; must be ≥ 1`
      );
    }
  }

  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    sum += table[i];
  }
  if (sum !== FREQUENCY_TOTAL) {
    throw new Error(
      `FrequencyTable sum is ${sum}, expected ${FREQUENCY_TOTAL} (2^24)`
    );
  }
}
