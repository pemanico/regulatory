import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { QueryModule } from '../query/query.module';
import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';

@Module({
  imports: [CatalogModule, QueryModule],
  controllers: [ViewsController],
  providers: [ViewsService],
})
export class ViewsModule {}
