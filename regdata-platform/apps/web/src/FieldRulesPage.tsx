import {
  ACTION_TYPES,
  type ConversionIssue,
  type FieldRuleItem,
  type FieldRulesUploadDetail,
  type FieldRulesUploadSummary,
  type ReviewStatus,
} from '@regdata/contracts';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from './api';

type Filter = 'all' | 'errors' | 'warnings' | 'clean' | ReviewStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'errors', label: 'Com erros' },
  { id: 'warnings', label: 'Com avisos' },
  { id: 'clean', label: 'Sem problemas' },
  { id: 'pending', label: 'Por rever' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'rejected', label: 'Rejeitados' },
];

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: 'Por rever',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const ROLE_LABEL = { party_1: 'Parte 1', party_2: 'Parte 2', other: 'Outro' } as const;

/**
 * Upload of the field rules spreadsheets, conversion report and field-by-field review.
 * Only approved fields are exported for indexing in the RAG.
 */
export function FieldRulesPage({ currentUser }: { currentUser: string }) {
  const [uploads, setUploads] = useState<FieldRulesUploadSummary[]>([]);
  const [detail, setDetail] = useState<FieldRulesUploadDetail | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshUploads = useCallback(async () => {
    try {
      setUploads(await api.listFieldRuleUploads());
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    }
  }, []);

  useEffect(() => {
    void refreshUploads();
  }, [refreshUploads]);

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      return await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function openUpload(id: string) {
    const loaded = await run(() => api.getFieldRuleUpload(id));
    if (loaded) {
      setDetail(loaded);
      setSelectedFieldId(loaded.items[0]?.record.fieldId ?? null);
    }
  }

  async function handleUploaded(uploaded: FieldRulesUploadDetail) {
    setDetail(uploaded);
    setSelectedFieldId(uploaded.items[0]?.record.fieldId ?? null);
    setFilter('all');
    await refreshUploads();
  }

  async function review(fieldId: string, decision: 'approved' | 'rejected', comment: string) {
    if (!detail) return;
    const updated = await run(() => api.reviewField(detail.id, fieldId, { decision, comment: comment || undefined }));
    if (updated) {
      const reloaded = await run(() => api.getFieldRuleUpload(detail.id));
      if (reloaded) setDetail(reloaded);
      await refreshUploads();
    }
  }

  async function approveClean() {
    if (!detail) return;
    const summary = await run(() => api.approveCleanFields(detail.id));
    if (summary) {
      const reloaded = await run(() => api.getFieldRuleUpload(detail.id));
      if (reloaded) setDetail(reloaded);
      setNotice(`${summary.counts.approved} campos aprovados no total.`);
      await refreshUploads();
    }
  }

  async function exportApproved(format: 'json' | 'markdown') {
    if (!detail) return;
    const exported = await run(() => api.exportFieldRules(detail.id, format));
    if (!exported) return;
    if (exported.fields === 0) {
      setNotice('Ainda não há campos aprovados para exportar.');
      return;
    }
    const blob = new Blob([exported.content], { type: exported.contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.fileName;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Exportados ${exported.fields} campos aprovados (${exported.fileName}).`);
  }

  const visibleItems = useMemo(() => {
    if (!detail) return [];
    const term = search.trim().toLowerCase();
    return detail.items.filter((item) => {
      const errors = item.issues.some((issue) => issue.severity === 'error');
      const warnings = item.issues.some((issue) => issue.severity === 'warning');
      const matchesFilter =
        filter === 'all' ||
        (filter === 'errors' && errors) ||
        (filter === 'warnings' && warnings) ||
        (filter === 'clean' && item.issues.length === 0) ||
        item.review.status === filter;
      const matchesSearch =
        term === '' ||
        item.record.fieldId.includes(term) ||
        item.record.fieldName.toLowerCase().includes(term) ||
        item.record.bnppFields.some((field) => field.name.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [detail, filter, search]);

  const selected = detail?.items.find((item) => item.record.fieldId === selectedFieldId) ?? null;
  const isUploader = detail?.uploadedBy === currentUser;

  return (
    <>
      <header className="page-header">
        <h1>Regras de validação por campo (EMIR)</h1>
        <p className="muted">
          Carrega as folhas de regras, de estado por action type e de mapping DTCC ↔ BNPP. O sistema converte, verifica e mostra
          os problemas; cada campo é revisto antes de seguir para o RAG.
        </p>
      </header>

      {error && <p className="banner banner-error" role="alert">{error}</p>}
      {notice && <p className="banner banner-ok" role="status">{notice}</p>}

      <div className="layout">
        <UploadForm busy={busy} onUpload={(files, metadata) => run(() => api.uploadFieldRules(files, metadata))} onUploaded={handleUploaded} />

        <section className="card">
          <h2>Uploads recentes</h2>
          {uploads.length === 0 ? (
            <p className="muted">Ainda não há uploads.</p>
          ) : (
            <ul className="upload-list">
              {uploads.map((upload) => (
                <li key={upload.id}>
                  <button
                    type="button"
                    className={`upload-item${detail?.id === upload.id ? ' upload-item-active' : ''}`}
                    onClick={() => void openUpload(upload.id)}
                  >
                    <span className="upload-files">{upload.fileNames.join(', ')}</span>
                    <span className="muted small-text">
                      {formatDateTime(upload.uploadedAt)} · {upload.uploadedBy} · {upload.counts.fields} campos · {upload.counts.approved}{' '}
                      aprovados
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {detail && (
        <>
          <section className="card section-gap">
            <div className="toolbar">
              <div className="chips">
                <Chip label="Campos" value={detail.counts.fields} />
                <Chip label="Com erros" value={detail.counts.withErrors} tone={detail.counts.withErrors > 0 ? 'error' : undefined} />
                <Chip label="Com avisos" value={detail.counts.withWarnings} tone={detail.counts.withWarnings > 0 ? 'warning' : undefined} />
                <Chip label="Por rever" value={detail.counts.pending} />
                <Chip label="Aprovados" value={detail.counts.approved} tone="ok" />
                <Chip label="Rejeitados" value={detail.counts.rejected} />
              </div>
              <div className="toolbar-actions">
                <button type="button" className="button-ghost" disabled={busy || isUploader} onClick={() => void approveClean()}>
                  Aprovar campos sem problemas
                </button>
                <button type="button" className="button-ghost" disabled={busy} onClick={() => void exportApproved('markdown')}>
                  Exportar chunks (Markdown)
                </button>
                <button type="button" className="button-ghost" disabled={busy} onClick={() => void exportApproved('json')}>
                  Exportar registos (JSON)
                </button>
              </div>
            </div>
            {isUploader && (
              <p className="banner banner-warning">
                Carregaste este ficheiro: a revisão tem de ser feita por outro utilizador (4-eyes).
              </p>
            )}
            <p className="muted small-text">
              Blocos de regras: {detail.blockLabels.join(' / ')} · Carregado por {detail.uploadedBy} em {formatDateTime(detail.uploadedAt)}
            </p>
            {detail.uploadIssues.length > 0 && (
              <details className="upload-issues" open={detail.uploadIssues.some((issue) => issue.severity === 'error')}>
                <summary>
                  Problemas do ficheiro ({detail.uploadIssues.length}) — não ligados a um campo convertido
                </summary>
                <IssueList issues={detail.uploadIssues} />
              </details>
            )}
          </section>

          <div className="review-layout section-gap">
            <section className="card">
              <div className="list-controls">
                <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filtro">
                  {FILTERS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Procurar id, campo ou campo BNPP"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Procurar"
                />
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Campo</th>
                      <th>Problemas</th>
                      <th>Revisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <FieldRow
                        key={item.record.fieldId}
                        item={item}
                        selected={item.record.fieldId === selectedFieldId}
                        onSelect={() => setSelectedFieldId(item.record.fieldId)}
                      />
                    ))}
                  </tbody>
                </table>
                {visibleItems.length === 0 && <p className="muted">Nenhum campo com este filtro.</p>}
              </div>
            </section>

            <section className="card">
              {selected ? (
                <FieldDetail key={selected.record.fieldId} item={selected} busy={busy} canReview={!isUploader} onReview={review} />
              ) : (
                <p className="muted">Escolhe um campo para ver o detalhe.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function UploadForm(props: {
  busy: boolean;
  onUpload: (files: File[], metadata: { documentVersion?: string; effectiveFrom?: string }) => Promise<FieldRulesUploadDetail | undefined>;
  onUploaded: (detail: FieldRulesUploadDetail) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [documentVersion, setDocumentVersion] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) return;
    const uploaded = await props.onUpload(files, { documentVersion, effectiveFrom });
    if (uploaded) await props.onUploaded(uploaded);
  }

  return (
    <section className="card">
      <h2>Novo upload</h2>
      <form onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>Ficheiros .xlsx (até 3: regras, action types, mapping; ou um só com as três folhas)</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Versão do documento</span>
            <input value={documentVersion} onChange={(event) => setDocumentVersion(event.target.value)} placeholder="ex. 1.2" />
          </label>
          <label className="field">
            <span>Vigente desde</span>
            <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
        </div>
        <button type="submit" className="button" disabled={props.busy || files.length === 0}>
          {props.busy ? 'A processar…' : 'Carregar e converter'}
        </button>
      </form>
    </section>
  );
}

function FieldRow({ item, selected, onSelect }: { item: FieldRuleItem; selected: boolean; onSelect: () => void }) {
  const errors = item.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = item.issues.filter((issue) => issue.severity === 'warning').length;
  return (
    <tr className={selected ? 'row-selected' : undefined} onClick={onSelect}>
      <td>
        <button type="button" className="link-button" onClick={onSelect}>
          {item.record.fieldId}
        </button>
      </td>
      <td>{item.record.fieldName}</td>
      <td>
        {errors > 0 && <span className="badge badge-deprecated">{errors} erro{errors > 1 ? 's' : ''}</span>}{' '}
        {warnings > 0 && <span className="badge badge-draft">{warnings} aviso{warnings > 1 ? 's' : ''}</span>}
        {errors === 0 && warnings === 0 && <span className="muted">—</span>}
      </td>
      <td>
        <span className={`badge review-${item.review.status}`}>{REVIEW_LABEL[item.review.status]}</span>
      </td>
    </tr>
  );
}

function FieldDetail(props: {
  item: FieldRuleItem;
  busy: boolean;
  canReview: boolean;
  onReview: (fieldId: string, decision: 'approved' | 'rejected', comment: string) => Promise<void>;
}) {
  const { record, issues, chunk, review } = props.item;
  const [comment, setComment] = useState('');
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return (
    <div className="field-detail">
      <h2>
        {record.fieldId} · {record.fieldName}
      </h2>
      <p className="muted small-text">{record.section}</p>

      {issues.length > 0 ? <IssueList issues={issues} /> : <p className="banner banner-ok">Sem problemas de conversão.</p>}

      <h3>Estado por action type</h3>
      <table className="status-grid">
        <thead>
          <tr>
            {ACTION_TYPES.map((type) => (
              <th key={type}>{type}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {ACTION_TYPES.map((type) => {
              const status = record.statusByActionType[type];
              return (
                <td key={type} className={`status status-${status ?? 'missing'}`}>
                  {status ?? '?'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <h3>Campos BNPP</h3>
      {record.bnppFields.length === 0 ? (
        <p className="muted">Sem mapeamento BNPP.</p>
      ) : (
        <ul className="plain-list">
          {record.bnppFields.map((field) => (
            <li key={field.name}>
              <code>{field.name}</code> <span className="muted">({ROLE_LABEL[field.role]})</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Formato</h3>
      <pre className="code">{record.formatLines.join('\n') || '—'}</pre>

      <h3>Condições</h3>
      <p>{record.condition || <span className="muted">—</span>}</p>

      <h3>Códigos de erro</h3>
      <p>{record.errorCodes.length > 0 ? record.errorCodes.map((code) => <code key={code} className="code-chip">{code}</code>) : '—'}</p>

      <h3>Chunk para o RAG</h3>
      <pre className="code">{chunk}</pre>

      <h3>Revisão</h3>
      {review.status !== 'pending' && (
        <p className="muted small-text">
          {REVIEW_LABEL[review.status]} por {review.reviewer} em {review.reviewedAt ? formatDateTime(review.reviewedAt) : '—'}
          {review.comment ? ` · "${review.comment}"` : ''}
        </p>
      )}
      {props.canReview ? (
        <>
          <label className="field">
            <span>Comentário (obrigatório para rejeitar)</span>
            <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <div className="review-actions">
            <button
              type="button"
              className="button"
              disabled={props.busy || hasErrors}
              title={hasErrors ? 'Campos com erros não podem ser aprovados' : undefined}
              onClick={() => void props.onReview(record.fieldId, 'approved', comment)}
            >
              Aprovar
            </button>
            <button
              type="button"
              className="button button-danger"
              disabled={props.busy || comment.trim() === ''}
              onClick={() => void props.onReview(record.fieldId, 'rejected', comment)}
            >
              Rejeitar
            </button>
          </div>
          {hasErrors && <p className="muted small-text">Este campo tem erros: corrige o Excel e volta a carregar.</p>}
        </>
      ) : (
        <p className="muted small-text">A revisão tem de ser feita por outro utilizador (4-eyes).</p>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: ConversionIssue[] }) {
  const ordered = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return (
    <ul className="issue-list">
      {ordered.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
          <strong>{issue.severity === 'error' ? 'Erro' : 'Aviso'}</strong> {issue.message}{' '}
          <span className="muted">[{issue.code}]</span>
          {issue.source && (
            <span className="muted small-text">
              {' '}
              · {issue.source.fileName} › {issue.source.sheetName}, linha {issue.source.row}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'error' | 'warning' }) {
  return (
    <span className={`chip${tone ? ` chip-${tone}` : ''}`}>
      <span className="chip-value">{value}</span> {label}
    </span>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}
