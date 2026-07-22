import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import sitemap from './sitemap';

// ---------- module mocks -----------------------------------------------
vi.mock('@/lib/anchorsApi', () => ({
  fetchAnchors: vi.fn(),
}));

vi.mock('@/lib/settlementsApi', () => ({
  fetchSettlements: vi.fn(),
}));

import { fetchAnchors } from '@/lib/anchorsApi';
import { fetchSettlements } from '@/lib/settlementsApi';

const mockFetchAnchors = vi.mocked(fetchAnchors);
const mockFetchSettlements = vi.mocked(fetchSettlements);

// -----------------------------------------------------------------------

const ANCHORS = [
  { id: 'anchor-1', name: 'Anchor One', registeredAt: '2024-01-01T00:00:00Z', active: true },
  { id: 'anchor-2', name: 'Anchor Two', registeredAt: '2024-01-02T00:00:00Z', active: false },
];

const SETTLEMENTS = [
  { id: 1, anchor: 'anchor-1', asset: 'USDC', amount: 100, fee: 1, status: 'pending' as const, createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, anchor: 'anchor-2', asset: 'USDC', amount: 200, fee: 2, status: 'executed' as const, createdAt: '2024-01-02T00:00:00Z' },
];

const SETTLEMENTS_PAGE = {
  settlements: SETTLEMENTS,
  pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

describe('sitemap.ts metadata route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    mockFetchAnchors.mockResolvedValue(ANCHORS);
    mockFetchSettlements.mockResolvedValue(SETTLEMENTS_PAGE);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── static routes ────────────────────────────────────────────────────

  it('returns the 4 static routes with correct shape (default base URL)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const result = await sitemap();

    expect(result[0]).toEqual({
      url: 'http://localhost:3000',
      lastModified: new Date('2024-01-01T00:00:00.000Z'),
      changeFrequency: 'daily',
      priority: 1,
    });
    expect(result[1].url).toBe('http://localhost:3000/dashboard');
    expect(result[2].url).toBe('http://localhost:3000/anchors');
    expect(result[3].url).toBe('http://localhost:3000/settlements');
  });

  it('uses NEXT_PUBLIC_SITE_URL when provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://anchornet.example.com');
    const result = await sitemap();

    expect(result[0].url).toBe('https://anchornet.example.com');
    expect(result[1].url).toBe('https://anchornet.example.com/dashboard');
  });

  // ── anchor detail entries ────────────────────────────────────────────

  it('includes one entry per anchor detail page', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://anchornet.example.com');
    const result = await sitemap();

    const anchorUrls = result.map((e) => e.url).filter((u) => u.includes('/anchors/'));
    expect(anchorUrls).toEqual([
      'https://anchornet.example.com/anchors/anchor-1',
      'https://anchornet.example.com/anchors/anchor-2',
    ]);
  });

  it('gives anchor detail entries weekly changeFrequency and 0.6 priority', async () => {
    const result = await sitemap();
    const anchorEntry = result.find((e) => e.url.includes('/anchors/anchor-1'));

    expect(anchorEntry).toMatchObject({
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  });

  // ── settlement detail entries ────────────────────────────────────────

  it('includes one entry per settlement detail page', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://anchornet.example.com');
    const result = await sitemap();

    const settlementUrls = result.map((e) => e.url).filter((u) => u.includes('/settlements/'));
    expect(settlementUrls).toEqual([
      'https://anchornet.example.com/settlements/1',
      'https://anchornet.example.com/settlements/2',
    ]);
  });

  it('gives settlement detail entries weekly changeFrequency and 0.6 priority', async () => {
    const result = await sitemap();
    const settlementEntry = result.find((e) => e.url.includes('/settlements/1'));

    expect(settlementEntry).toMatchObject({
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  });

  it('paginates through all settlement pages', async () => {
    const page1 = {
      settlements: [SETTLEMENTS[0]],
      pagination: { page: 1, pageSize: 100, total: 2, totalPages: 2 },
    };
    const page2 = {
      settlements: [SETTLEMENTS[1]],
      pagination: { page: 2, pageSize: 100, total: 2, totalPages: 2 },
    };
    mockFetchSettlements
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const result = await sitemap();

    const settlementUrls = result.map((e) => e.url).filter((u) => u.includes('/settlements/'));
    expect(settlementUrls).toEqual([
      'http://localhost:3000/settlements/1',
      'http://localhost:3000/settlements/2',
    ]);
    expect(mockFetchSettlements).toHaveBeenCalledTimes(2);
    expect(mockFetchSettlements).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 100 });
    expect(mockFetchSettlements).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 100 });
  });

  // ── error resilience ─────────────────────────────────────────────────

  it('falls back to static-only routes when fetchAnchors rejects', async () => {
    mockFetchAnchors.mockRejectedValue(new Error('Network error'));

    const result = await sitemap();

    // Static routes still present
    expect(result).toHaveLength(4 + SETTLEMENTS.length);
    expect(result.some((e) => e.url.includes('/anchors/anchor-'))).toBe(false);
    expect(result[0].url).toBe('http://localhost:3000');
  });

  it('falls back to static-only routes when fetchSettlements rejects', async () => {
    mockFetchSettlements.mockRejectedValue(new Error('Network error'));

    const result = await sitemap();

    // Static routes still present
    expect(result).toHaveLength(4 + ANCHORS.length);
    expect(result.some((e) => e.url.match(/\/settlements\/\d/))).toBe(false);
    expect(result[0].url).toBe('http://localhost:3000');
  });

  it('falls back to static-only routes when both APIs reject', async () => {
    mockFetchAnchors.mockRejectedValue(new Error('Network error'));
    mockFetchSettlements.mockRejectedValue(new Error('Network error'));

    const result = await sitemap();

    expect(result).toHaveLength(4);
    expect(result[0].url).toBe('http://localhost:3000');
    expect(result[1].url).toBe('http://localhost:3000/dashboard');
    expect(result[2].url).toBe('http://localhost:3000/anchors');
    expect(result[3].url).toBe('http://localhost:3000/settlements');
  });

  // ── combined total ───────────────────────────────────────────────────

  it('returns 4 static + N anchor + M settlement entries in total', async () => {
    const result = await sitemap();

    // 4 static + 2 anchors + 2 settlements = 8
    expect(result).toHaveLength(4 + ANCHORS.length + SETTLEMENTS.length);
  });
});
