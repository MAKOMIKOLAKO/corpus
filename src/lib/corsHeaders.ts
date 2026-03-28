/** Matches next.config.js CORS origin (no extension origins). */
export function getConfiguredCorsOrigin(): string {
  return (
    process.env.CORS_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://usecorpus.app")
  );
}

export function corsJsonHeaders(): Record<string, string> {
  const origin = getConfiguredCorsOrigin();
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

export function corsOptionsHeaders(): Record<string, string> {
  const origin = getConfiguredCorsOrigin();
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
