import { Module } from '@nestjs/common';
import { DuckDbRunner } from './duckdb-runner';
import { QueryService } from './query.service';

@Module({
  providers: [DuckDbRunner, QueryService],
  exports: [QueryService],
})
export class QueryModule {}
