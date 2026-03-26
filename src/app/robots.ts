import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dashboard/', '/collections/', '/feed/', '/settings/'],
    },
    sitemap: 'https://usecorpus.app/sitemap.xml',
  };
}
