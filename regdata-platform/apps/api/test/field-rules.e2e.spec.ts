import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Builds a FICTITIOUS workbook with the same layout as the real spreadsheets. */
async function buildWorkbook(options: { emptyTableOnSecondActionRow?: boolean } = {}): Promise<Buffer> {
  const workbook = new Workbook();

  const rules = workbook.addWorksheet('Rules');
  rules.addRow(['Table', 'Item', 'Section', 'Field', 'Format', 'Conditions', 'Error codes']);
  rules.addRow(['9', 1, 'Section 9a – Example information', 'Example code', 'ISO 4217', '1. Shall be populated.\n2. Refer to field 9.2.', '1. EX-VR-9001-01\n2. EX-VR-9001-02']);
  rules.addRow([9, 2, 'Section 9a - Example information', 'Example type', '4 alphabetical characters', 'Shall contain an allowed value.', '1. EX-VR-9002-01']);

  const actions = workbook.addWorksheet('ActionTypes');
  actions.addRow(['Table', 'Item', 'Section', 'Field', 'NEWT', 'MODI', 'VALU', 'CORR', 'TERM', 'EROR', 'REVI', 'POSC']);
  actions.addRow([9, 1, 'Section 9a - Example information', 'Example code', 'M', 'M', '-', 'M', '-', '-', 'M', 'C']);
  actions.addRow([options.emptyTableOnSecondActionRow ? '' : 9, 2, 'Section 9a - Example information', 'Example type', 'C', 'C', '-', 'C', '-', '-', 'C', 'O']);

  const mapping = workbook.addWorksheet('Mapping');
  mapping.addRow(['DTCC Report', 'BNPP']);
  mapping.addRow(['Example code', 'P1_EX_CODE, P2_EX_CODE,']);
  mapping.addRow(['Example type', 'X_EX_TYPE']);

  return Buffer.from((await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

describe('Field rules upload and review', () => {
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

  function upload(buffer: Buffer, user = 'uploader') {
    return request(app.getHttpServer())
      .post('/api/field-rules/uploads')
      .set('x-dev-user', user)
      .field('documentVersion', '1.0')
      .field('effectiveFrom', '2026-01-01')
      .attach('files', buffer, 'example-rules.xlsx');
  }

  it('converts an uploaded workbook', async () => {
    const res = await upload(await buildWorkbook()).expect(201);
    expect(res.body.counts).toMatchObject({ fields: 2, pending: 2, approved: 0, uploadIssues: 0 });
    expect(res.body.items.map((item: { record: { fieldId: string } }) => item.record.fieldId)).toEqual(['9.1', '9.2']);

    const first = res.body.items[0];
    expect(first.record.statusByActionType).toEqual({ NEWT: 'M', MODI: 'M', VALU: 'NA', CORR: 'M', TERM: 'NA', EROR: 'NA', REVI: 'M', POSC: 'C' });
    expect(first.record.errorCodes).toEqual(['EX-VR-9001-01', 'EX-VR-9001-02']);
    expect(first.record.document).toEqual({ version: '1.0', effectiveFrom: '2026-01-01' });
    expect(first.chunk).toContain('RULES_LEG_1:\n  BNPP_Field: P1_EX_CODE');
    expect(first.chunk).toContain('RULES_LEG_2:\n  BNPP_Field: P2_EX_CODE');
  });

  it('rejects non-xlsx files and requests without files', async () => {
    await request(app.getHttpServer())
      .post('/api/field-rules/uploads')
      .attach('files', Buffer.from('a,b'), 'rules.csv')
      .expect(400);
    await request(app.getHttpServer()).post('/api/field-rules/uploads').expect(400);
  });

  it('applies four-eyes and blocks approval of fields with errors', async () => {
    const res = await upload(await buildWorkbook({ emptyTableOnSecondActionRow: true })).expect(201);
    const id = res.body.id;
    expect(res.body.uploadIssues.map((issue: { code: string }) => issue.code)).toContain('MISSING_TABLE');

    await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/fields/9.1/review`)
      .set('x-dev-user', 'uploader')
      .send({ decision: 'approved' })
      .expect(403);

    const approved = await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/fields/9.1/review`)
      .set('x-dev-user', 'reviewer')
      .send({ decision: 'approved' })
      .expect(200);
    expect(approved.body.review).toMatchObject({ status: 'approved', reviewer: 'reviewer' });

    await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/fields/9.2/review`)
      .set('x-dev-user', 'reviewer')
      .send({ decision: 'approved' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/fields/9.2/review`)
      .set('x-dev-user', 'reviewer')
      .send({ decision: 'rejected' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/fields/9.2/review`)
      .set('x-dev-user', 'reviewer')
      .send({ decision: 'rejected', comment: 'Table missing in the Excel file' })
      .expect(200);
  });

  it('exports approved fields only', async () => {
    const res = await upload(await buildWorkbook()).expect(201);
    const id = res.body.id;

    const bulk = await request(app.getHttpServer())
      .post(`/api/field-rules/uploads/${id}/approve-clean`)
      .set('x-dev-user', 'reviewer')
      .expect(200);
    // 9.1 references a field inside the file and has no issues; 9.2 has none either.
    expect(bulk.body.counts.approved).toBe(2);

    const json = await request(app.getHttpServer())
      .get(`/api/field-rules/uploads/${id}/export?format=json`)
      .set('x-dev-user', 'reviewer')
      .expect(200);
    expect(json.body.fields).toBe(2);
    expect(JSON.parse(json.body.content)[0].fieldId).toBe('9.1');

    const markdown = await request(app.getHttpServer())
      .get(`/api/field-rules/uploads/${id}/export?format=markdown`)
      .set('x-dev-user', 'reviewer')
      .expect(200);
    expect(markdown.body.content).toContain('FIELD_ID: 9.2');

    await request(app.getHttpServer()).get(`/api/field-rules/uploads/${id}/export?format=pdf`).expect(400);
  });

  it('denies users without EMIR access', async () => {
    await request(app.getHttpServer())
      .get('/api/field-rules/uploads')
      .set('x-dev-jurisdictions', 'CFTC')
      .expect(403);
  });
});
