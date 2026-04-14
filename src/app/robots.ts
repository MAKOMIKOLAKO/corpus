import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/login',
          '/signup',
          '/forgot-password',
          '/setup-username',
          '/reset-password/',
          '/verify-email/',
          '/library',
          '/add',
          '/collections',
          '/feed',
          '/research',
          '/connections',
          '/notifications',
          '/account/',
          '/entries/',
          '/alerts',
        ],
      },
    ],
    sitemap: 'https://usecorpus.app/sitemap.xml',
  };
}
