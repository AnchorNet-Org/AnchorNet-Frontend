import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsBar } from './MetricsBar';
import { useAsync } from '@/hooks/useAsync';

vi.mock('@/hooks/useAsync', () => ({
  useAsync: vi.fn(),
}));

type UseAsyncResult = ReturnType<typeof useAsync>;

/**
 * Returns a complete, typed `useAsync` result with no-op defaults.
 *
 * The hook's return shape is the contract under test: if `useAsync` ever
 * gains, loses or renames a member, this factory (and every call site that
 * overrides it) stops compiling, instead of silently verifying the component
 * against a fabricated interface like the old `{ state, refresh }` mocks did.
 */
function mockUseAsync(overrides: Partial<UseAsyncResult> = {}): UseAsyncResult {
  return {
    state: { status: 'loading' },
    reload: vi.fn(),
    refresh: vi.fn(() => Promise.resolve()),
    mutate: vi.fn(),
    ...overrides,
  };
}

describe('MetricsBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a stable four-card skeleton grid before metrics resolve', () => {
    vi.mocked(useAsync).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
      reload: vi.fn(),
      mutate: vi.fn(),
    } as any);
    render(<MetricsBar />);
    expect(screen.getByText('Active anchors')).toBeInTheDocument();
    expect(screen.getByText('Pools')).toBeInTheDocument();
    expect(screen.getByText('Total liquidity')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
  });

  it('keeps the auto-refresh interval on schedule', () => {
    const mockReload = vi.fn();
    vi.mocked(useAsync).mockReturnValue({
      state: { status: 'ready', data: { activeAnchors: 50, anchors: 100, pools: 10, totalLiquidity: 500000, settlements: 1000, pendingSettlements: 0 } },
      refresh: mockReload,
      reload: vi.fn(),
      mutate: vi.fn(),
    } as any);
    render(<MetricsBar />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('handles unmount mid-refresh without warnings', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(useAsync).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
      reload: vi.fn(),
      mutate: vi.fn(),
    } as any);
    const { unmount } = render(<MetricsBar />);
    act(() => {
      unmount();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it('does not update state after unmount when interval-triggered refresh resolves', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(useAsync).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
      reload: vi.fn(),
      mutate: vi.fn(),
    } as any);
    const { unmount } = render(<MetricsBar />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    act(() => {
      unmount();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});
