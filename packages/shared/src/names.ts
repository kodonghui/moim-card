import { prohibitedWords } from './prohibited-words';

type NameResult = { valid: true; value: string } | { valid: false; reason: 'length' | 'control' | 'prohibited' };
const controls = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export function validateNickname(input: string): NameResult {
  if (controls.test(input)) return { valid: false, reason: 'control' };
  const value = input.trim();
  if ([...value].length < 1 || [...value].length > 10) return { valid: false, reason: 'length' };
  if (prohibitedWords.some(word => value.toLocaleLowerCase('ko').includes(word))) return { valid: false, reason: 'prohibited' };
  return { valid: true, value };
}

export function validateGatheringName(input: string): NameResult {
  const value = input.trim();
  if ([...value].length < 1 || [...value].length > 20) return { valid: false, reason: 'length' };
  return { valid: true, value };
}
