// SECURITY: Run `npm audit` periodically; see npm output for any remaining high/critical issues after `npm audit fix`.

const corsOrigin =
  process.env.CORS_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://usecorpus.app');

const csp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

function securityHeadersNoCsp() {
  return [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];
}

function hstsHeader() {
  if (process.env.NODE_ENV !== 'production') return [];
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
  ];
}

module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['undici', 'cheerio'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/stripe/webhook',
        headers: [...securityHeadersNoCsp(), ...hstsHeader()],
      },
      {
        source: '/((?!api/stripe/webhook).*)',
        headers: [
          ...securityHeadersNoCsp(),
          ...hstsHeader(),
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        source: '/api/((?!stripe/webhook$).*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: corsOrigin },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};
