/** An array of exactly alphabetSize positive integers summing to FREQUENCY_TOTAL. */
export type FrequencyTable = Uint32Array | number[];

/** Cumulative frequency table: cumTable[i] = sum of freq[0..i-1], cumTable[alphabetSize] = FREQUENCY_TOTAL. */
export type CumulativeTable = Uint32Array;

/** Fixed sum of all entries in a valid FrequencyTable. Equal to 2^24. */
export const FREQUENCY_TOTAL = 16_777_216;

/** Default vocabulary size matching DistilGPT-2. */
export const DEFAULT_ALPHABET_SIZE = 50_257;

export interface EncoderOptions {
  /** Defaults to DEFAULT_ALPHABET_SIZE. */
  alphabetSize?: number;
}

export interface DecoderOptions {
  /** Defaults to DEFAULT_ALPHABET_SIZE. */
  alphabetSize?: number;
}

export interface EncoderState {
  /** 48-bit unsigned lower bound of the current interval; range [0, 2^48). */
  low: number;
  /** Current interval width; invariant: range ∈ [2^40, 2^48). */
  range: number;
  /** Cached top byte awaiting carry resolution (0–255), or -1 if uninitialised. */
  cache: number;
  /** Count of pending 0xFF bytes that may absorb a carry. */
  carry: number;
  /** Accumulated output bytes. */
  output: number[];
  /** Incremented in propagateCarry when carry >= 2; test-only. */
  _deepCarryCount: number;
  /** Incremented on every propagateCarry call; test-only. */
  _carryCount: number;
}

export interface DecoderState {
  /** Current interval width; invariant: range ∈ [2^40, 2^48). */
  range: number;
  /** Relative code value: in [0, range). */
  code: number;
  /** Next byte index to read from compressed array. */
  pos: number;
  /** The compressed input bytes. */
  input: Uint8Array;
}
