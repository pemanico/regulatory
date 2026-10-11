import { JURISDICTIONS, JurisdictionSchema, type Jurisdiction } from '@regdata/contracts';
import type { AuthenticatedUser, AuthProvider, AuthRequest } from './auth.types';

/**
 * Autenticação de desenvolvimento. Simula utilizadores através de headers,
 * para testar permissões sem SSO:
 *   x-dev-user:          id do utilizador (default "dev.user")
 *   x-dev-jurisdictions: lista separada por vírgulas, ex. "EMIR,CFTC" (default: todas)
 *   x-dev-anonymous:     "true" simula um pedido sem sessão
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
