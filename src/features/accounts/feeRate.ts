import { MAX_FEE_BPS } from '../../core';

/**
 * Reads a percentage typed by the user ("1.5", "1.5%") as basis points.
 * Empty means no rate; invalid or out-of-range text gives null.
 */
export function parseFeePercent(text: string): number | undefined | null {
  const trimmed = text.trim().replace(/\s*%$/, '');
  if (trimmed === '') return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const bps = Math.round(Number(trimmed) * 100);
  return bps <= MAX_FEE_BPS ? bps : null;
}

/** Basis points as the number shown in the field: 150 → "1.5". */
export function feePercentInput(bps: number | undefined): string {
  return bps === undefined ? '' : String(bps / 100);
}
