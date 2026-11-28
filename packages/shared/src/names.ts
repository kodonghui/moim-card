import { prohibitedWords } from './prohibited-words';

type NameResult = { valid: true; value: string } | { valid: false; reason: 'required' | 'too_long' | 'control_character' | 'banned_word' };
const controls = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export function validateNickname(input: string): NameResult {
  if (controls.test(input)) return { valid: false, reason: 'control_character' };
  const value = input.trim().normalize('NFC');
  if (!value) return { valid: false, reason: 'required' };
  if ([...value].length > 10) return { valid: false, reason: 'too_long' };
  if (prohibitedWords.some(word => value.toLocaleLowerCase('ko').includes(word))) return { valid: false, reason: 'banned_word' };
  return { valid: true, value };
}

export function validateGatheringName(input: string): NameResult {
  if (controls.test(input)) return { valid: false, reason: 'control_character' };
  const value = input.trim().normalize('NFC');
  if (!value) return { valid: false, reason: 'required' };
  if ([...value].length > 20) return { valid: false, reason: 'too_long' };
  return { valid: true, value };
}
