import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredSiteUrl && process.env.NODE_ENV === 'production') {
    console.warn(
      '[robots] NEXT_PUBLIC_SITE_URL is not set in production; falling back to http://localhost:3000.',
    );
  }
  const baseUrl = configuredSiteUrl || 'http://localhost:3000';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
