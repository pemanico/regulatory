#!/usr/bin/env node
// Fails when application source files contain Portuguese text.
// Rule: source code, comments, UI labels and RAG chunk templates are in English.
// Detection is heuristic: accented Portuguese letters and a list of common Portuguese words.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['apps', 'packages', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.html', '.css', '.example']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage']);

const ACCENTED = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const WORDS = [
  'nao', 'para', 'uma', 'umas', 'uns', 'dos', 'das', 'pelo', 'pela', 'pelos', 'pelas', 'esta', 'este', 'estes',
  'isto', 'ainda', 'quando', 'onde', 'porque', 'depois', 'antes', 'cada', 'todos', 'todas', 'nenhum', 'nenhuma',
  'utilizador', 'utilizadores', 'ficheiro', 'ficheiros', 'campo', 'campos', 'regra', 'regras', 'folha', 'folhas',
  'linha', 'linhas', 'erro', 'erros', 'aviso', 'avisos', 'aprovar', 'aprovado', 'aprovados', 'rejeitar', 'rejeitado',
  'carregar', 'exportar', 'pendente', 'pendentes', 'revisor', 'comentario', 'obrigatorio', 'mapeamento', 'vista',
  'metrica', 'metricas', 'periodo', 'jurisdicao', 'jurisdicoes', 'valor', 'valores', 'sem', 'com', 'tem', 'mostrar',
  'mudar', 'pedido', 'falhou', 'construtor', 'elemento', 'encontrado', 'encontrada', 'escolhe', 'procurar', 'carregado',
  'exemplo', 'teste', 'validar', 'vazio', 'ligado', 'aceita', 'rejeita', 'recusa', 'devolve', 'estado', 'outro', 'outros',
];
const WORD_PATTERN = new RegExp(`(?<![\\w./-])(${WORDS.join('|')})(?![\\w.-])`, 'i');

// Characters that look accented but are fine in English text (dashes, arrows, bullets) are not matched above.
const ALLOW_LINE = /check-language: allow/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(path))) yield path;
  }
}

const findings = [];
for (const base of SCAN_DIRS) {
  let files;
  try {
    files = [...walk(join(ROOT, base))];
  } catch {
    continue;
  }
  for (const file of files) {
    if (file.endsWith('check-language.mjs')) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (ALLOW_LINE.test(line)) return;
        const hit = ACCENTED.exec(line) ?? WORD_PATTERN.exec(line);
        if (hit) findings.push(`${relative(ROOT, file)}:${index + 1}: "${hit[0]}" in: ${line.trim().slice(0, 120)}`);
      });
  }
}

if (findings.length > 0) {
  console.error(`Portuguese text found in ${findings.length} line(s). Source, comments and UI labels must be in English:`);
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}
console.log('Language check passed: no Portuguese text found in source files.');
