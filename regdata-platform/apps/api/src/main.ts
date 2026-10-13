import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

type ProcessWithEnvFile = NodeJS.Process & { loadEnvFile?: (path?: string) => void };

/**
 * Loads apps/api/.env with Node's built-in loader (Node >= 20.12), without extra packages.
 * Variables already set in the environment are not overridden.
 */
function loadLocalEnv(): void {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const loader = (process as ProcessWithEnvFile).loadEnvFile;
  if (!loader) {
    Logger.warn(`Ficheiro ${envPath} ignorado: requer Node.js >= 20.12.`, 'Bootstrap');
    return;
  }
  loader(envPath);
  Logger.log(`Configuração lida de ${envPath}`, 'Bootstrap');
}

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API a correr em http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
