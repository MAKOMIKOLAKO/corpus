import { NextResponse } from 'next/server';

export function timedJson<T>(
  payload: T,
  startedAt: number,
  init?: ResponseInit,
  metricName = 'app'
) {
  const response = NextResponse.json(payload, init);
  const durationMs = Math.max(0, Date.now() - startedAt);
  response.headers.set('Server-Timing', `${metricName};dur=${durationMs}`);
  return response;
}
