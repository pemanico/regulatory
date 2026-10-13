import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { FieldRulesModule } from './field-rules/field-rules.module';
import { HealthController } from './health/health.controller';
import { ViewsModule } from './views/views.module';

@Module({
  imports: [AuthModule, CatalogModule, ViewsModule, FieldRulesModule],
  controllers: [HealthController],
})
export class AppModule {}
