import { Injectable } from '@nestjs/common';
import { validateViewSpec, type ViewSpecValidationResult } from '@regdata/contracts';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class ViewsService {
  constructor(private readonly catalog: CatalogService) {}

  /**
   * Validates a spec against the catalog visible to the user.
   * A mart from a jurisdiction the user cannot access shows as unknown,
   * just like a mart that does not exist.
   */
  validate(input: unknown, user: AuthenticatedUser): ViewSpecValidationResult {
    return validateViewSpec(input, this.catalog.listForUser(user));
  }
}
