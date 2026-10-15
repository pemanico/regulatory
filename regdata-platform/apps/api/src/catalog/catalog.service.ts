import { Injectable } from '@nestjs/common';
import type { MartDefinition } from '@regdata/contracts';
import { SEMANTIC_MARTS, toMartDefinition } from '@regdata/query';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CATALOG_FIXTURES } from './catalog.fixtures';

@Injectable()
export class CatalogService {
  private readonly marts: readonly MartDefinition[] = [...CATALOG_FIXTURES, ...SEMANTIC_MARTS.map(toMartDefinition)];

  /** Marts visible to the user, filtered by the jurisdictions they can see. */
  listForUser(user: AuthenticatedUser): MartDefinition[] {
    return this.marts.filter((mart) => user.jurisdictions.includes(mart.jurisdiction));
  }
}
