#!/usr/bin/env bash
# Runs a command; on failure, publishes the last lines of its output as a GitHub
# annotation, so failures can be read through the API without downloading logs.
# Usage: run-and-annotate.sh <title> <command...>
set -uo pipefail

title="$1"
shift
log="$(mktemp)"

"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  tail -n 120 "$log" \
    | sed -e 's/\x1b\[[0-9;]*[A-Za-z]//g' \
    | awk 'BEGIN { ORS = "%0A" } { gsub(/%/, "%25"); gsub(/\r/, "%0D"); print }' \
    | { printf '::error title=%s failed::' "$title"; cat; echo; }
fi

exit "$status"
