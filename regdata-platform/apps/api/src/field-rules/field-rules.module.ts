import { Module } from '@nestjs/common';
import { FieldRulesController } from './field-rules.controller';
import { FieldRulesService } from './field-rules.service';

@Module({
  controllers: [FieldRulesController],
  providers: [FieldRulesService],
})
export class FieldRulesModule {}
