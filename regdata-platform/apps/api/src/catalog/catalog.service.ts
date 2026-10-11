import { Injectable } from '@nestjs/common';
import type { MartDefinition } from '@regdata/contracts';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CATALOG_FIXTURES } from './catalog.fixtures';

@Injectable()
export class CatalogService {
  private readonly marts: readonly MartDefinition[] = CATALOG_FIXTURES;

  /** Marts visíveis para o utilizador, filtrados pelas jurisdições que pode ver. */
  listForUser(user: AuthenticatedUser): MartDefinition[] {
    return this.marts.filter((mart) => user.jurisdictions.includes(mart.jurisdiction));
  }
}
