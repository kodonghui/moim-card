import { it, expect } from 'vitest';
import { validateNickname, validateGatheringName } from '../src/names';
it('server uses shared validation rules', () => {
  expect(validateNickname('씨발').valid).toBe(false);
  expect(validateGatheringName('가'.repeat(21)).valid).toBe(false);
});
