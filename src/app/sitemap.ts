import { MetadataRoute } from 'next';
import { fetchAnchors } from '@/lib/anchorsApi';
import { fetchSettlements } from '@/lib/settlementsApi';
import { Settlement } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const routes = ['', '/dashboard', '/anchors', '/settlements'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Fetch all anchor detail pages, falling back to [] if the API is unreachable.
  let anchorEntries: MetadataRoute.Sitemap = [];
  try {
    const anchors = await fetchAnchors();
    anchorEntries = anchors.map((anchor) => ({
      url: `${baseUrl}/anchors/${anchor.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // API temporarily unreachable — omit anchor detail pages rather than failing.
  }

  // Fetch all settlement detail pages (paginated), falling back to [] on error.
  let settlementEntries: MetadataRoute.Sitemap = [];
  try {
    const allSettlements: Settlement[] = [];
    let page = 1;
    // Use the maximum allowed page size to minimise round-trips.
    const pageSize = 100;

    while (true) {
      const { settlements, pagination } = await fetchSettlements({ page, pageSize });
      allSettlements.push(...settlements);
      if (page >= pagination.totalPages) break;
      page++;
    }

    settlementEntries = allSettlements.map((settlement) => ({
      url: `${baseUrl}/settlements/${settlement.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // API temporarily unreachable — omit settlement detail pages rather than failing.
  }

  return [...routes, ...anchorEntries, ...settlementEntries];
}
