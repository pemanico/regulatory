import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_PROVIDER, type AuthProvider } from './auth.types';
import type { RequestWithUser } from './current-user.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Global guard: every endpoint requires authentication, except those marked with @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = await this.authProvider.authenticate(request);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}
