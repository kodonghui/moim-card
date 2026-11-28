import { describe, expect, it } from 'vitest';
import { validateNickname, validateGatheringName } from './names';

describe('TASK-008 name rules', () => {
  it('trims and accepts 1 through 10 code points', () => {
    expect(validateNickname('  가  ')).toEqual({valid: true, value: '가'});
    expect(validateNickname('가나다라마바사아자차')).toMatchObject({valid: true});
    for (const value of ['', '  ', '가나다라마바사아자차카']) expect(validateNickname(value)).toMatchObject({valid: false, reason: 'length'});
  });
  it('rejects forbidden words irrespective of case', () => {
    for (const value of ['씨발', 'aFuCkb']) expect(validateNickname(value)).toMatchObject({valid: false, reason: 'prohibited'});
  });
  it('rejects control characters even at the edges before trimming', () => {
    for (const value of ['a\nb', '\ta', 'a\u0000', 'a\u2028b']) expect(validateNickname(value)).toMatchObject({valid: false, reason: 'control'});
  });
  it('trims gathering names and accepts 1 through 20 code points', () => {
    expect(validateGatheringName('  제주  ')).toEqual({valid: true, value: '제주'});
    expect(validateGatheringName('가'.repeat(20))).toMatchObject({valid: true});
    for (const value of ['', '  ', '가'.repeat(21)]) expect(validateGatheringName(value)).toMatchObject({valid: false, reason: 'length'});
  });
});
