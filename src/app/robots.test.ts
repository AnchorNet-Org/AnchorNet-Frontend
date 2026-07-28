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

  it('should warn when NEXT_PUBLIC_SITE_URL is missing in production', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const result = robots();

    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(warnSpy).toHaveBeenCalledWith(
      '[robots] NEXT_PUBLIC_SITE_URL is not set in production; falling back to http://localhost:3000.',
    );
    warnSpy.mockRestore();
  });

  it('should not warn when NEXT_PUBLIC_SITE_URL is missing in development', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const result = robots();

    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
