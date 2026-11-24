import { describe, expect, it } from 'vitest';
import { csvRecords, parseCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and line breaks inside fields', () => {
    const text = '﻿a,b,c\r\n1,"two, ""2""","three\nlines"\n4,,6\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'two, "2"', 'three\nlines'],
      ['4', '', '6'],
    ]);
  });

  it('keeps the last row without a trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('csvRecords', () => {
  it('numbers duplicate headers', () => {
    expect(csvRecords('Distance,Name,Distance\n10.5,Run,10500.0\n')).toEqual([
      { Distance: '10.5', Name: 'Run', 'Distance #2': '10500.0' },
    ]);
  });
});
