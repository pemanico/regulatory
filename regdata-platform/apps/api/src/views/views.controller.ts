import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { ViewSpecValidationResult } from '@regdata/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ViewsService } from './views.service';

@Controller('views')
export class ViewsController {
  constructor(private readonly views: ViewsService) {}

  /**
   * Responde sempre 200 com { valid, errors | spec, warnings }:
   * uma spec inválida é um resultado normal, não um erro do pedido.
   */
  @Post('validate')
  @HttpCode(200)
  validate(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser): ViewSpecValidationResult {
    return this.views.validate(body, user);
  }
}
