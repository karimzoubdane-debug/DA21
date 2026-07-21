#!/usr/bin/env bash
# Claude Mastery ÔÇö standard skills (Niveau A : ├®pingl├® + int├¿gre + trac├®)
set -euo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
LOG_DIR="$ROOT/.claude/logs"; LOG="$LOG_DIR/skills-install.log"
STAMP="$(date -u +%FT%TZ)"; mkdir -p "$LOG_DIR"
log() { printf '%s [claude-mastery] %s\n' "$STAMP" "$*" | tee -a "$LOG"; }
if ! command -v npx >/dev/null 2>&1; then log "npx absent ÔÇö installation ignor├®e (no-op)"; exit 0; fi
if [ -f "$ROOT/skills-lock.json" ]; then
  if timeout 90 npx --yes skills experimental_install >>"$LOG" 2>&1; then
    log "OK ÔÇö skills r├®tablis depuis skills-lock.json (hashes v├®rifi├®s)"
  else rc=$?; log "├ëCHEC experimental_install (rc=$rc) ÔÇö session poursuivie sans blocage"; fi
else
  if timeout 90 npx --yes skills add naiersaidane/claude-mastery --yes >>"$LOG" 2>&1; then
    log "OK ÔÇö pack ajout├® (amor├ºage) ; commiter skills-lock.json pour figer l'int├®grit├®"
  else rc=$?; log "├ëCHEC add (rc=$rc) ÔÇö session poursuivie sans blocage"; fi
fi
exit 0