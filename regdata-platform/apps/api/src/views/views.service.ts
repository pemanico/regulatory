import { Injectable } from '@nestjs/common';
import { validateViewSpec, type ViewSpecValidationResult } from '@regdata/contracts';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class ViewsService {
  constructor(private readonly catalog: CatalogService) {}

  /**
   * Valida uma spec contra o catálogo visível para o utilizador.
   * Um mart de uma jurisdição a que o utilizador não tem acesso aparece
   * como desconhecido, tal como um mart que não existe.
   */
  validate(input: unknown, user: AuthenticatedUser): ViewSpecValidationResult {
    return validateViewSpec(input, this.catalog.listForUser(user));
  }
}
