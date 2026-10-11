import {
  validateViewSpec,
  type Comparison,
  type MartDefinition,
  type ValidationIssue,
  type ViewSpecInput,
  type ViewSpecValidationResult,
} from '@regdata/contracts';
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

type Placement = 'none' | 'rows' | 'columns';

/**
 * Passo 1: construtor e validador de specs de vista.
 * Mais tarde a spec virá do Metrics agent (linguagem natural) e abrirá o pivot;
 * aqui é construída à mão para testar o contrato de ponta a ponta.
 */
export function App() {
  const [marts, setMarts] = useState<MartDefinition[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [martId, setMartId] = useState('');
  const [metrics, setMetrics] = useState<string[]>([]);
  const [rows, setRows] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [from, setFrom] = useState(() => isoDate(monthsAgo(3)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [comparison, setComparison] = useState<Comparison | ''>('');

  const [serverResult, setServerResult] = useState<ViewSpecValidationResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    api
      .listMarts()
      .then((list) => {
        setMarts(list);
        if (list[0]) selectMart(list[0]);
      })
      .catch((error: unknown) => setLoadError(String(error)));
  }, []);

  const mart = marts.find((candidate) => candidate.id === martId);

  const spec: ViewSpecInput = useMemo(
    () => ({
      specVersion: 1,
      jurisdiction: mart?.jurisdiction ?? 'EMIR',
      martId,
      metrics,
      rows,
      columns,
      filters: [],
      period: { from, to },
      ...(comparison ? { comparison } : {}),
    }),
    [mart, martId, metrics, rows, columns, from, to, comparison],
  );

  const localResult = useMemo(() => validateViewSpec(spec, marts), [spec, marts]);

  // Qualquer alteração invalida o resultado anterior do servidor.
  useEffect(() => {
    setServerResult(null);
    setServerError(null);
  }, [spec]);

  function selectMart(next: MartDefinition) {
    setMartId(next.id);
    const firstCertified = next.metrics.find((metric) => metric.status === 'certified') ?? next.metrics[0];
    setMetrics(firstCertified ? [firstCertified.id] : []);
    setRows([]);
    setColumns([]);
  }

  function toggleMetric(id: string) {
    setMetrics((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]));
  }

  function placeDimension(id: string, placement: Placement) {
    setRows((current) => {
      const without = current.filter((d) => d !== id);
      return placement === 'rows' ? [...without, id] : without;
    });
    setColumns((current) => {
      const without = current.filter((d) => d !== id);
      return placement === 'columns' ? [...without, id] : without;
    });
  }

  async function validateOnServer() {
    setValidating(true);
    setServerError(null);
    try {
      setServerResult(await api.validateView(spec));
    } catch (error) {
      setServerError(String(error));
    } finally {
      setValidating(false);
    }
  }

  if (loadError) {
    return (
      <main className="page">
        <h1>Regulatory Data Platform</h1>
        <p className="banner banner-error">Não foi possível carregar o catálogo: {loadError}</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Regulatory Data Platform</h1>
        <p className="muted">Passo 1 — construtor e validador de specs de vista (catálogo fictício)</p>
      </header>

      <div className="layout">
        <section className="card">
          <h2>Vista</h2>

          <label className="field">
            <span>Data mart</span>
            <select
              value={martId}
              onChange={(event) => {
                const next = marts.find((candidate) => candidate.id === event.target.value);
                if (next) selectMart(next);
              }}
            >
              {marts.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          {mart && <p className="muted small">{mart.businessNeed}</p>}

          {mart && (
            <>
              <fieldset className="field">
                <legend>Métricas</legend>
                {mart.metrics.map((metric) => (
                  <label key={metric.id} className="check">
                    <input type="checkbox" checked={metrics.includes(metric.id)} onChange={() => toggleMetric(metric.id)} />
                    <span>{metric.label}</span>
                    <span className={`badge badge-${metric.status}`}>{statusLabel(metric.status)}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="field">
                <legend>Dimensões</legend>
                {mart.dimensions.map((dimension) => {
                  const placement: Placement = rows.includes(dimension.id)
                    ? 'rows'
                    : columns.includes(dimension.id)
                      ? 'columns'
                      : 'none';
                  return (
                    <label key={dimension.id} className="dimension">
                      <span>{dimension.label}</span>
                      <select
                        value={placement}
                        onChange={(event) => placeDimension(dimension.id, event.target.value as Placement)}
                      >
                        <option value="none">—</option>
                        <option value="rows">Linhas</option>
                        <option value="columns">Colunas</option>
                      </select>
                    </label>
                  );
                })}
              </fieldset>
            </>
          )}

          <div className="field-row">
            <label className="field">
              <span>De</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="field">
              <span>Até</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Comparação</span>
            <select value={comparison} onChange={(event) => setComparison(event.target.value as Comparison | '')}>
              <option value="">Sem comparação</option>
              <option value="previous_period">Período anterior</option>
              <option value="previous_year">Ano anterior</option>
            </select>
          </label>
        </section>

        <section className="card">
          <h2>Spec</h2>
          <pre className="code">{JSON.stringify(spec, null, 2)}</pre>

          <h3>Validação local</h3>
          <ResultView result={localResult} />

          <button type="button" className="button" onClick={validateOnServer} disabled={validating}>
            {validating ? 'A validar…' : 'Validar no servidor'}
          </button>

          {serverError && <p className="banner banner-error">{serverError}</p>}
          {serverResult && (
            <>
              <h3>Validação no servidor</h3>
              <ResultView result={serverResult} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function ResultView({ result }: { result: ViewSpecValidationResult }) {
  return (
    <div>
      {result.valid ? (
        <p className="banner banner-ok">Spec válida</p>
      ) : (
        <IssueList title="Erros" issues={result.errors} tone="error" />
      )}
      {result.warnings.length > 0 && <IssueList title="Avisos" issues={result.warnings} tone="warning" />}
    </div>
  );
}

function IssueList({ title, issues, tone }: { title: string; issues: ValidationIssue[]; tone: 'error' | 'warning' }) {
  return (
    <div className={`banner banner-${tone}`}>
      <strong>{title}</strong>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.path}-${index}`}>
            <code>{issue.path || '(spec)'}</code> {issue.message} <span className="muted">[{issue.code}]</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusLabel(status: MartDefinition['metrics'][number]['status']): string {
  return status === 'certified' ? 'certificada' : status === 'draft' ? 'não certificada' : 'descontinuada';
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months, 1);
  return date;
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
