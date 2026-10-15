import { BadRequestException, Injectable } from '@nestjs/common';
import { validateViewSpec, type ViewResult, type ViewSpecValidationResult } from '@regdata/contracts';
import { SEMANTIC_MARTS } from '@regdata/query';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from '../catalog/catalog.service';
import { QueryService } from '../query/query.service';

@Injectable()
export class ViewsService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly query: QueryService,
  ) {}

  /**
   * Validates a spec against the catalog visible to the user.
   * A mart from a jurisdiction the user cannot access shows as unknown,
   * just like a mart that does not exist.
   */
  validate(input: unknown, user: AuthenticatedUser): ViewSpecValidationResult {
    return validateViewSpec(input, this.catalog.listForUser(user));
  }

  /** Validates, compiles and runs a spec. The SQL comes from the compiler, never from an LLM. */
  async run(input: unknown, user: AuthenticatedUser): Promise<ViewResult> {
    const validation = this.validate(input, user);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Invalid view spec', errors: validation.errors });
    }
    const mart = SEMANTIC_MARTS.find((candidate) => candidate.id === validation.spec.martId);
    if (!mart) {
      throw new BadRequestException(`Mart ${validation.spec.martId} cannot be queried yet: it has no semantic model.`);
    }
    return this.query.run(validation.spec, mart);
  }
}
