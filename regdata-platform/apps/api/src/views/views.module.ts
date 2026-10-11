import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';

@Module({
  imports: [CatalogModule],
  controllers: [ViewsController],
  providers: [ViewsService],
})
export class ViewsModule {}
