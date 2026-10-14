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
  { id: 'all', label: 'All' },
  { id: 'errors', label: 'With errors' },
  { id: 'warnings', label: 'With warnings' },
  { id: 'clean', label: 'No issues' },
  { id: 'pending', label: 'To review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: 'To review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const ROLE_LABEL = { party_1: 'Party 1', party_2: 'Party 2', other: 'Other' } as const;

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
      setNotice(`${summary.counts.approved} fields approved in total.`);
      await refreshUploads();
    }
  }

  async function exportApproved(format: 'json' | 'markdown') {
    if (!detail) return;
    const exported = await run(() => api.exportFieldRules(detail.id, format));
    if (!exported) return;
    if (exported.fields === 0) {
      setNotice('There are no approved fields to export yet.');
      return;
    }
    const blob = new Blob([exported.content], { type: exported.contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.fileName;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${exported.fields} approved fields (${exported.fileName}).`);
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
        <h1>Field validation rules (EMIR)</h1>
        <p className="muted">
          Upload the rules, action type status and DTCC ↔ BNPP mapping sheets. The system converts and checks them and shows
          the issues; each field is reviewed before it goes to the RAG.
        </p>
      </header>

      {error && <p className="banner banner-error" role="alert">{error}</p>}
      {notice && <p className="banner banner-ok" role="status">{notice}</p>}

      <div className="layout">
        <UploadForm busy={busy} onUpload={(files, metadata) => run(() => api.uploadFieldRules(files, metadata))} onUploaded={handleUploaded} />

        <section className="card">
          <h2>Recent uploads</h2>
          {uploads.length === 0 ? (
            <p className="muted">No uploads yet.</p>
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
                      {formatDateTime(upload.uploadedAt)} · {upload.uploadedBy} · {upload.counts.fields} fields · {upload.counts.approved}{' '}
                      approved
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
                <Chip label="Fields" value={detail.counts.fields} />
                <Chip label="With errors" value={detail.counts.withErrors} tone={detail.counts.withErrors > 0 ? 'error' : undefined} />
                <Chip label="With warnings" value={detail.counts.withWarnings} tone={detail.counts.withWarnings > 0 ? 'warning' : undefined} />
                <Chip label="To review" value={detail.counts.pending} />
                <Chip label="Approved" value={detail.counts.approved} tone="ok" />
                <Chip label="Rejected" value={detail.counts.rejected} />
              </div>
              <div className="toolbar-actions">
                <button type="button" className="button-ghost" disabled={busy || isUploader} onClick={() => void approveClean()}>
                  Approve fields with no issues
                </button>
                <button type="button" className="button-ghost" disabled={busy} onClick={() => void exportApproved('markdown')}>
                  Export chunks (Markdown)
                </button>
                <button type="button" className="button-ghost" disabled={busy} onClick={() => void exportApproved('json')}>
                  Export records (JSON)
                </button>
              </div>
            </div>
            {isUploader && (
              <p className="banner banner-warning">
                You uploaded this file: the review must be done by another user (four-eyes).
              </p>
            )}
            <p className="muted small-text">
              Rule blocks: {detail.blockLabels.join(' / ')} · Uploaded by {detail.uploadedBy} on {formatDateTime(detail.uploadedAt)}
            </p>
            {detail.uploadIssues.length > 0 && (
              <details className="upload-issues" open={detail.uploadIssues.some((issue) => issue.severity === 'error')}>
                <summary>
                  File issues ({detail.uploadIssues.length}) — not linked to a converted field
                </summary>
                <IssueList issues={detail.uploadIssues} />
              </details>
            )}
          </section>

          <div className="review-layout section-gap">
            <section className="card">
              <div className="list-controls">
                <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter">
                  {FILTERS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Search id, field or BNPP field"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search"
                />
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Field</th>
                      <th>Issues</th>
                      <th>Review</th>
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
                {visibleItems.length === 0 && <p className="muted">No fields match this filter.</p>}
              </div>
            </section>

            <section className="card">
              {selected ? (
                <FieldDetail key={selected.record.fieldId} item={selected} busy={busy} canReview={!isUploader} onReview={review} />
              ) : (
                <p className="muted">Select a field to see its details.</p>
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
      <h2>New upload</h2>
      <form onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>.xlsx files (up to 3: rules, action types, mapping; or one file with the three sheets)</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Document version</span>
            <input value={documentVersion} onChange={(event) => setDocumentVersion(event.target.value)} placeholder="e.g. 1.2" />
          </label>
          <label className="field">
            <span>Effective from</span>
            <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
        </div>
        <button type="submit" className="button" disabled={props.busy || files.length === 0}>
          {props.busy ? 'Processing…' : 'Upload and convert'}
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
        {errors > 0 && <span className="badge badge-deprecated">{errors} error{errors > 1 ? 's' : ''}</span>}{' '}
        {warnings > 0 && <span className="badge badge-draft">{warnings} warning{warnings > 1 ? 's' : ''}</span>}
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

      {issues.length > 0 ? <IssueList issues={issues} /> : <p className="banner banner-ok">No conversion issues.</p>}

      <h3>Status by action type</h3>
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
              if (record.actionTypesNotInSource.includes(type)) {
                return (
                  <td key={type} className="status status-unused" title="Column not in the file; action type not used yet">
                    not used
                  </td>
                );
              }
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

      <h3>BNPP fields</h3>
      {record.bnppFields.length === 0 ? (
        <p className="muted">No BNPP mapping.</p>
      ) : (
        <ul className="plain-list">
          {record.bnppFields.map((field) => (
            <li key={field.name}>
              <code>{field.name}</code> <span className="muted">({ROLE_LABEL[field.role]})</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Format</h3>
      <pre className="code">{record.formatLines.join('\n') || '—'}</pre>

      <h3>Conditions</h3>
      <p>{record.condition || <span className="muted">—</span>}</p>

      <h3>Error codes</h3>
      <p>{record.errorCodes.length > 0 ? record.errorCodes.map((code) => <code key={code} className="code-chip">{code}</code>) : '—'}</p>

      <h3>RAG chunk</h3>
      <pre className="code">{chunk}</pre>

      <h3>Review</h3>
      {review.status !== 'pending' && (
        <p className="muted small-text">
          {REVIEW_LABEL[review.status]} by {review.reviewer} on {review.reviewedAt ? formatDateTime(review.reviewedAt) : '—'}
          {review.comment ? ` · "${review.comment}"` : ''}
        </p>
      )}
      {props.canReview ? (
        <>
          <label className="field">
            <span>Comment (required to reject)</span>
            <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <div className="review-actions">
            <button
              type="button"
              className="button"
              disabled={props.busy || hasErrors}
              title={hasErrors ? 'Fields with errors cannot be approved' : undefined}
              onClick={() => void props.onReview(record.fieldId, 'approved', comment)}
            >
              Approve
            </button>
            <button
              type="button"
              className="button button-danger"
              disabled={props.busy || comment.trim() === ''}
              onClick={() => void props.onReview(record.fieldId, 'rejected', comment)}
            >
              Reject
            </button>
          </div>
          {hasErrors && <p className="muted small-text">This field has errors: fix the Excel file and upload it again.</p>}
        </>
      ) : (
        <p className="muted small-text">The review must be done by another user (four-eyes).</p>
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
          <strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong> {issue.message}{' '}
          <span className="muted">[{issue.code}]</span>
          {issue.source && (
            <span className="muted small-text">
              {' '}
              · {issue.source.fileName} › {issue.source.sheetName}, row {issue.source.row}
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
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}
