import type { MartDefinition, ViewSpecInput, ViewSpecValidationResult } from '@regdata/contracts';

/** Cliente HTTP mínimo. Os tipos vêm dos contratos partilhados com o backend. */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`Pedido ${path} falhou: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export const api = {
  listMarts: () => http<MartDefinition[]>('/catalog/marts'),
  validateView: (spec: ViewSpecInput) =>
    http<ViewSpecValidationResult>('/views/validate', { method: 'POST', body: JSON.stringify(spec) }),
};
