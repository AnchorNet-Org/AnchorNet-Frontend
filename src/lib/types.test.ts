import { describe, it, expect } from 'vitest';
import { isSettlementStatus, SETTLEMENT_STATUSES, SettlementStatus } from '@/lib/types';

describe('isSettlementStatus runtime guard', () => {
  it('returns true for each valid status', () => {
    SETTLEMENT_STATUSES.forEach((status) => {
      expect(isSettlementStatus(status)).toBe(true);
    });
  });

  it('returns false for an invalid status', () => {
    const invalid = 'invalid-status' as unknown;
    expect(isSettlementStatus(invalid)).toBe(false);
  });

  it('narrows type correctly', () => {
    const raw: unknown = 'pending';
    if (isSettlementStatus(raw)) {
      // Within this block raw is inferred as SettlementStatus
      const _: SettlementStatus = raw; // should compile
      expect(raw).toBe('pending');
    } else {
      // Should not happen in this test
      expect.unreachable();
    }
  });
});
