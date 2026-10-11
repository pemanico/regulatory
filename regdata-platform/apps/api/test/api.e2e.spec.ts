import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createAuthProvider } from '../src/auth/auth-provider.factory';

const validSpec = {
  specVersion: 1,
  jurisdiction: 'EMIR',
  martId: 'example_emir_validation',
  metrics: ['error_count'],
  rows: ['error_category'],
  columns: ['source_system'],
  period: { from: '2026-07-01', to: '2026-09-30' },
};

describe('API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health é público', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('x-dev-anonymous', 'true')
      .expect(200, { status: 'ok' });
  });

  it('rejeita pedidos sem autenticação', async () => {
    await request(app.getHttpServer()).get('/api/catalog/marts').set('x-dev-anonymous', 'true').expect(401);
  });

  it('GET /api/catalog/marts filtra pelas jurisdições do utilizador', async () => {
    const all = await request(app.getHttpServer()).get('/api/catalog/marts').expect(200);
    expect(all.body.map((m: { id: string }) => m.id)).toEqual(['example_emir_validation', 'example_cftc_recon']);

    const cftcOnly = await request(app.getHttpServer())
      .get('/api/catalog/marts')
      .set('x-dev-jurisdictions', 'CFTC')
      .expect(200);
    expect(cftcOnly.body.map((m: { id: string }) => m.id)).toEqual(['example_cftc_recon']);
  });

  it('POST /api/views/validate aceita uma spec válida', async () => {
    const res = await request(app.getHttpServer()).post('/api/views/validate').send(validSpec).expect(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.spec.filters).toEqual([]);
  });

  it('POST /api/views/validate devolve erros estruturados', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/views/validate')
      .send({ ...validSpec, metrics: ['unknown_metric'] })
      .expect(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors).toEqual([
      expect.objectContaining({ code: 'UNKNOWN_METRIC', path: 'metrics[0]' }),
    ]);
  });

  it('um utilizador sem acesso a EMIR não vê o mart EMIR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/views/validate')
      .set('x-dev-jurisdictions', 'CFTC')
      .send(validSpec)
      .expect(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors[0].code).toBe('UNKNOWN_MART');
  });
});

describe('createAuthProvider', () => {
  it('recusa o mock em produção', () => {
    expect(() => createAuthProvider({ AUTH_MODE: 'mock', NODE_ENV: 'production' })).toThrow();
  });

  it('SSO ainda não implementado falha de forma explícita', () => {
    expect(() => createAuthProvider({ AUTH_MODE: 'sso' })).toThrow(/ainda não está implementado/);
  });
});
