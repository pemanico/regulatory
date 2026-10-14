import type {
  FieldRuleItem,
  FieldRulesExport,
  FieldRulesUploadDetail,
  FieldRulesUploadSummary,
  MartDefinition,
  ReviewRequest,
  ViewSpecInput,
  ViewSpecValidationResult,
} from '@regdata/contracts';

const DEV_USER_KEY = 'regdata.devUser';

/** Development only: user simulated through the mock auth header. Ignored once SSO is enabled. */
let devUser: string = readDevUser();

function readDevUser(): string {
  try {
    return localStorage.getItem(DEV_USER_KEY) ?? 'dev.user';
  } catch {
    return 'dev.user';
  }
}

export function getDevUser(): string {
  return devUser;
}

export function setDevUser(user: string): void {
  devUser = user.trim() || 'dev.user';
  try {
    localStorage.setItem(DEV_USER_KEY, devUser);
  } catch {
    // Storage may be unavailable; the value still applies to this session.
  }
}

/** Minimal HTTP client. Types come from the contracts shared with the backend. */
async function http<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers: Record<string, string> = { 'x-dev-user': devUser, ...(init?.headers as Record<string, string> | undefined) };
  let body = init?.body;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  const response = await fetch(`/api${path}`, { ...init, headers, body });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return (await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join('; ') : data.message;
    if (message) return message;
  } catch {
    // Fall through to the generic message.
  }
  return `Request failed: ${response.status} ${response.statusText}`;
}

export const api = {
  listMarts: () => http<MartDefinition[]>('/catalog/marts'),
  validateView: (spec: ViewSpecInput) => http<ViewSpecValidationResult>('/views/validate', { method: 'POST', json: spec }),

  uploadFieldRules: (files: File[], metadata: { documentVersion?: string; effectiveFrom?: string }) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    if (metadata.documentVersion) form.append('documentVersion', metadata.documentVersion);
    if (metadata.effectiveFrom) form.append('effectiveFrom', metadata.effectiveFrom);
    return http<FieldRulesUploadDetail>('/field-rules/uploads', { method: 'POST', body: form });
  },
  listFieldRuleUploads: () => http<FieldRulesUploadSummary[]>('/field-rules/uploads'),
  getFieldRuleUpload: (id: string) => http<FieldRulesUploadDetail>(`/field-rules/uploads/${encodeURIComponent(id)}`),
  reviewField: (id: string, fieldId: string, review: ReviewRequest) =>
    http<FieldRuleItem>(`/field-rules/uploads/${encodeURIComponent(id)}/fields/${encodeURIComponent(fieldId)}/review`, {
      method: 'POST',
      json: review,
    }),
  approveCleanFields: (id: string) =>
    http<FieldRulesUploadSummary>(`/field-rules/uploads/${encodeURIComponent(id)}/approve-clean`, { method: 'POST' }),
  exportFieldRules: (id: string, format: 'json' | 'markdown') =>
    http<FieldRulesExport>(`/field-rules/uploads/${encodeURIComponent(id)}/export?format=${format}`),
};
