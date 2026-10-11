import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createAuthProvider } from './auth-provider.factory';
import { AuthGuard } from './auth.guard';
import { AUTH_PROVIDER } from './auth.types';

@Global()
@Module({
  providers: [
    { provide: AUTH_PROVIDER, useFactory: () => createAuthProvider(process.env) },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthModule {}
