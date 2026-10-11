import type { Jurisdiction } from '@regdata/contracts';

/**
 * Utilizador autenticado. É sempre a identidade do utilizador que circula
 * pelas tools e pela semantic layer: o agente nunca tem mais permissões
 * do que quem pergunta.
 */
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  roles: string[];
  /** Jurisdições cujos dados o utilizador pode ver. */
  jurisdictions: Jurisdiction[];
}

/** Pedido HTTP mínimo de que os providers precisam (independente do Express). */
export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Contrato que o SSO do banco vai implementar. Hoje existe só o mock.
 * Devolve null quando o pedido não está autenticado.
 */
export interface AuthProvider {
  readonly mode: 'mock' | 'sso';
  authenticate(request: AuthRequest): Promise<AuthenticatedUser | null>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
