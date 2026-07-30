import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsBar } from './MetricsBar';
import { useAsync } from '@/hooks/useAsync';

vi.mock('@/hooks/useAsync', () => ({
  useAsync: vi.fn(),
}));

describe('MetricsBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a stable four-card skeleton grid before metrics resolve', () => {
    (useAsync as any).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
    });
    render(<MetricsBar />);
    expect(screen.getByText('Active anchors')).toBeInTheDocument();
    expect(screen.getByText('Pools')).toBeInTheDocument();
    expect(screen.getByText('Total liquidity')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
  });

  it('keeps the auto-refresh interval on schedule', () => {
    const mockReload = vi.fn();
    (useAsync as any).mockReturnValue({
      state: { status: 'ready', data: { activeAnchors: 50, anchors: 100, pools: 10, totalLiquidity: 500000, settlements: 1000 } },
      refresh: mockReload,
    });
    render(<MetricsBar />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(mockReload).toHaveBeenCalled();
  });

  it('handles unmount mid-refresh without warnings', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (useAsync as any).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
    });
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
    (useAsync as any).mockReturnValue({
      state: { status: 'loading' },
      refresh: vi.fn(),
    });
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