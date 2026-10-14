import { JURISDICTIONS, JurisdictionSchema, type Jurisdiction } from '@regdata/contracts';
import type { AuthenticatedUser, AuthProvider, AuthRequest } from './auth.types';

/**
 * Development authentication. Simulates users through headers,
 * to test permissions without SSO:
 *   x-dev-user:          user id (default "dev.user")
 *   x-dev-jurisdictions: comma-separated list, e.g. "EMIR,CFTC" (default: all)
 *   x-dev-anonymous:     "true" simulates a request without a session
 */
export class MockAuthProvider implements AuthProvider {
  readonly mode = 'mock' as const;

  async authenticate(request: AuthRequest): Promise<AuthenticatedUser | null> {
    if (header(request, 'x-dev-anonymous') === 'true') return null;

    const id = header(request, 'x-dev-user') || 'dev.user';
    return {
      id,
      displayName: id,
      roles: ['analyst'],
      jurisdictions: parseJurisdictions(header(request, 'x-dev-jurisdictions')),
    };
  }
}

function header(request: AuthRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function parseJurisdictions(raw: string | undefined): Jurisdiction[] {
  if (!raw) return [...JURISDICTIONS];
  return raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is Jurisdiction => JurisdictionSchema.safeParse(item).success);
}
