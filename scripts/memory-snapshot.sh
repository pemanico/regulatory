#!/usr/bin/env bash
# Gera um único ficheiro Markdown com CLAUDE.md e docs/brain/, para guardar
# como `claude/memoria-projeto.md` no Project "Agentic Rag".
# Uso: scripts/memory-snapshot.sh [ficheiro-de-saida]
set -euo pipefail

cd "$(dirname "$0")/.."
out="${1:-memoria-projeto.md}"

files=(CLAUDE.md docs/brain/README.md)
while IFS= read -r f; do files+=("$f"); done < <(
  find docs/brain -name '*.md' ! -name README.md ! -name '_template.md' | sort
)
files+=(docs/brain/casos/_template.md docs/brain/marts/_template.md)

{
  echo "# Memória do projeto — Regulatory Data Platform (cópia)"
  echo
  echo "> Cópia de \`CLAUDE.md\` e \`docs/brain/\` do repositório https://github.com/pemanico/regulatory"
  echo "> gerada em $(date +%F) a partir do commit $(git rev-parse --short HEAD 2>/dev/null || echo '?')."
  echo "> A fonte de verdade é o repositório: em caso de diferença, o repositório prevalece."
  for f in "${files[@]}"; do
    echo
    echo "---"
    echo
    echo "<!-- ficheiro: $f -->"
    echo
    sed 's/^# /## /' "$f"
  done
} > "$out"

echo "Gerado: $out"
