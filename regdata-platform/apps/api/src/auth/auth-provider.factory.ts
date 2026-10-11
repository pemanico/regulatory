import type { AuthProvider } from './auth.types';
import { MockAuthProvider } from './mock-auth.provider';

/**
 * Escolhe o provider pelo ambiente. O ponto de integração do SSO é aqui:
 * implementar AuthProvider (ex. OIDC) e devolvê-lo no ramo "sso".
 */
export function createAuthProvider(env: NodeJS.ProcessEnv): AuthProvider {
  const mode = env.AUTH_MODE ?? 'mock';

  switch (mode) {
    case 'mock':
      if (env.NODE_ENV === 'production') {
        throw new Error('AUTH_MODE=mock não é permitido com NODE_ENV=production');
      }
      return new MockAuthProvider();
    case 'sso':
      throw new Error('AUTH_MODE=sso ainda não está implementado');
    default:
      throw new Error(`AUTH_MODE desconhecido: ${mode}`);
  }
}
