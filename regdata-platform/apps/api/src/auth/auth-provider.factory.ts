import type { AuthProvider } from './auth.types';
import { MockAuthProvider } from './mock-auth.provider';

/**
 * Picks the provider from the environment. This is the SSO integration point:
 * implement AuthProvider (e.g. OIDC) and return it in the "sso" branch.
 */
export function createAuthProvider(env: NodeJS.ProcessEnv): AuthProvider {
  const mode = env.AUTH_MODE ?? 'mock';

  switch (mode) {
    case 'mock':
      if (env.NODE_ENV === 'production') {
        throw new Error('AUTH_MODE=mock is not allowed with NODE_ENV=production');
      }
      return new MockAuthProvider();
    case 'sso':
      throw new Error('AUTH_MODE=sso is not implemented yet');
    default:
      throw new Error(`AUTH_MODE desconhecido: ${mode}`);
  }
}
