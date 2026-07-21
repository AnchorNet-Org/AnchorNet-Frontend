import { describe, it, expect, vi, afterEach } from 'vitest';
import robots from './robots';

describe('robots.ts metadata route', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it('should return valid robots.txt configuration with default base URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
      },
      sitemap: 'http://localhost:3000/sitemap.xml',
    });
  });

  it('should use NEXT_PUBLIC_SITE_URL for sitemap URL if provided', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://anchornet.example.com');
    const result = robots();

    expect(result.sitemap).toBe('https://anchornet.example.com/sitemap.xml');
  });
});
