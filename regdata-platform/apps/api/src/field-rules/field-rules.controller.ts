import { Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type {
  FieldRuleItem,
  FieldRulesExport,
  FieldRulesUploadDetail,
  FieldRulesUploadSummary,
} from '@regdata/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { FieldRulesService, MAX_FILES, MAX_FILE_BYTES, type UploadedSpreadsheet } from './field-rules.service';

@Controller('field-rules/uploads')
export class FieldRulesController {
  constructor(private readonly fieldRules: FieldRulesService) {}

  /** Multipart upload: "files" (1–3 .xlsx), optional "documentVersion" and "effectiveFrom". */
  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, { limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES } }))
  upload(
    @UploadedFiles() files: UploadedSpreadsheet[] | undefined,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldRulesUploadDetail> {
    return this.fieldRules.createUpload(files, body, user);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): FieldRulesUploadSummary[] {
    return this.fieldRules.list(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): FieldRulesUploadDetail {
    return this.fieldRules.get(id, user);
  }

  @Post(':id/fields/:fieldId/review')
  @HttpCode(200)
  review(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): FieldRuleItem {
    return this.fieldRules.review(id, fieldId, body, user);
  }

  @Post(':id/approve-clean')
  @HttpCode(200)
  approveClean(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): FieldRulesUploadSummary {
    return this.fieldRules.approveClean(id, user);
  }

  @Get(':id/export')
  export(@Param('id') id: string, @Query('format') format: string | undefined, @CurrentUser() user: AuthenticatedUser): FieldRulesExport {
    return this.fieldRules.export(id, format, user);
  }
}
