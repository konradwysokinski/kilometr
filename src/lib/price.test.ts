import { describe, expect, it } from 'vitest';
import { parsePrice } from './price';

describe('parsePrice', () => {
  it('reads whole and decimal amounts, with a comma or a dot', () => {
    expect(parsePrice('599')).toBe(599);
    expect(parsePrice('549,99')).toBe(549.99);
    expect(parsePrice('549.9')).toBe(549.9);
    expect(parsePrice(' 1 299,50 ')).toBe(1299.5);
    expect(parsePrice('1\u00a0299')).toBe(1299);
  });

  it('rejects empty, zero, negative and malformed input', () => {
    for (const bad of ['', '0', '-5', 'abc', '5,999', '1.2.3', '599 zł']) expect(parsePrice(bad)).toBeNull();
  });
});
