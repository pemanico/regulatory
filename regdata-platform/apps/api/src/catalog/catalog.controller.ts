import { Controller, Get } from '@nestjs/common';
import type { MartDefinition } from '@regdata/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('marts')
  listMarts(@CurrentUser() user: AuthenticatedUser): MartDefinition[] {
    return this.catalog.listForUser(user);
  }
}
