/** "599", "549,99", "1 299.50" → a price; anything else (or 0) → null. */
export function parsePrice(input: string): number | null {
  const clean = input.replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n > 0 && n <= 1_000_000 ? n : null;
}
