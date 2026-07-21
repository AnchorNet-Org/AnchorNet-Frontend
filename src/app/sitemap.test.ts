import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import sitemap from './sitemap';

describe('sitemap.ts metadata route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('should return valid sitemap.xml configuration with default base URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const result = sitemap();

    expect(result).toHaveLength(4);
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

  it('should use NEXT_PUBLIC_SITE_URL if provided', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://anchornet.example.com');
    const result = sitemap();

    expect(result[0].url).toBe('https://anchornet.example.com');
    expect(result[1].url).toBe('https://anchornet.example.com/dashboard');
  });
});
