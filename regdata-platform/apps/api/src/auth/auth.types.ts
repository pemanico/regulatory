import type { Jurisdiction } from '@regdata/contracts';

/**
 * Authenticated user. The user's identity is always what flows through the
 * tools and the semantic layer: the agent never has more permissions than
 * the person asking.
 */
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  roles: string[];
  /** Jurisdictions whose data the user can see. */
  jurisdictions: Jurisdiction[];
}

/** Minimal HTTP request the providers need (independent of Express). */
export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Contract the bank's SSO will implement. Only the mock exists today.
 * Returns null when the request is not authenticated.
 */
export interface AuthProvider {
  readonly mode: 'mock' | 'sso';
  authenticate(request: AuthRequest): Promise<AuthenticatedUser | null>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
