import { useState, type ReactNode } from 'react';
import { getDevUser, setDevUser } from './api';
import { FieldRulesPage } from './FieldRulesPage';
import { ViewBuilderPage } from './ViewBuilderPage';

type PageId = 'field-rules' | 'view-builder';

const PAGES: { id: PageId; label: string }[] = [
  { id: 'field-rules', label: 'Regras de validação' },
  { id: 'view-builder', label: 'Construtor de vistas' },
];

export function App() {
  const [page, setPage] = useState<PageId>('field-rules');
  const [user, setUser] = useState(getDevUser());

  function changeUser(next: string) {
    setDevUser(next);
    setUser(getDevUser());
  }

  return (
    <Shell page={page} onPageChange={setPage} user={user} onUserChange={changeUser}>
      {page === 'field-rules' ? <FieldRulesPage key={user} currentUser={user} /> : <ViewBuilderPage />}
    </Shell>
  );
}

function Shell(props: {
  page: PageId;
  onPageChange: (page: PageId) => void;
  user: string;
  onUserChange: (user: string) => void;
  children: ReactNode;
}) {
  const [draftUser, setDraftUser] = useState(props.user);

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-title">Regulatory Data Platform</span>
          <span className="topbar-subtitle">EMIR · CFTC · MiFID TR</span>
          <form
            className="dev-user"
            onSubmit={(event) => {
              event.preventDefault();
              props.onUserChange(draftUser);
            }}
          >
            <label>
              <span>Utilizador (dev)</span>
              <input value={draftUser} onChange={(event) => setDraftUser(event.target.value)} aria-label="Utilizador de desenvolvimento" />
            </label>
            <button type="submit" className="button-ghost">
              Mudar
            </button>
          </form>
        </div>
        <nav className="tabs" aria-label="Páginas">
          <div className="tabs-inner">
            {PAGES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`tab${props.page === entry.id ? ' tab-active' : ''}`}
                aria-current={props.page === entry.id ? 'page' : undefined}
                onClick={() => props.onPageChange(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <main className="page">{props.children}</main>
    </>
  );
}
