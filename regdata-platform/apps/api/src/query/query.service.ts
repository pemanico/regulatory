import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ViewResult, ViewSpec } from '@regdata/contracts';
import { CompileError, parseBindings, runView, type BindingsFile, type MartBinding, type SemanticMart } from '@regdata/query';
import { DuckDbRunner } from './duckdb-runner';

/** Folder of the API package (apps/api), from src/query or dist/query. */
const API_ROOT = resolve(__dirname, '..', '..');

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);
  private bindings?: BindingsFile;

  constructor(private readonly runner: DuckDbRunner) {}

  async run(spec: ViewSpec, mart: SemanticMart): Promise<ViewResult> {
    const binding = this.bindingFor(mart.id);
    try {
      return await runView(spec, mart, binding, this.runner);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof CompileError) throw new InternalServerErrorException(`Query compilation failed: ${message}`);
      this.logger.error(`Query on mart ${mart.id} failed: ${message}`);
      throw new InternalServerErrorException(`Query on mart ${mart.id} failed: ${message}`);
    }
  }

  private bindingFor(martId: string): MartBinding {
    const binding = this.loadBindings().marts[martId];
    if (!binding) {
      throw new ServiceUnavailableException(
        `Mart ${martId} is not configured on this server: add it to the bindings file set in QUERY_BINDINGS_FILE.`,
      );
    }
    return binding;
  }

  /** Reads QUERY_BINDINGS_FILE once (path relative to apps/api, or absolute). */
  private loadBindings(): BindingsFile {
    if (this.bindings) return this.bindings;
    const configured = process.env.QUERY_BINDINGS_FILE?.trim();
    if (!configured) {
      this.bindings = { marts: {} };
      return this.bindings;
    }
    const path = isAbsolute(configured) ? configured : resolve(API_ROOT, configured);
    if (!existsSync(path)) {
      throw new ServiceUnavailableException(`Bindings file not found: ${path} (QUERY_BINDINGS_FILE).`);
    }
    try {
      this.bindings = parseBindings(JSON.parse(readFileSync(path, 'utf8')));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(`Cannot read bindings file ${path}: ${message}`);
    }
    this.logger.log(`Bindings read from ${path}: ${Object.keys(this.bindings.marts).join(', ') || 'no marts'}`);
    return this.bindings;
  }
}
