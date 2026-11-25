#!/usr/bin/env bash
# Applique les scripts supabase/ (sauf 08, propre au temps réel de Supabase) sur une base vide, puis les vérifications.
set -euo pipefail
cd "$(dirname "$0")"
export PGOPTIONS="-c client_min_messages=warning"
P="psql -v ON_ERROR_STOP=1 -q -X"
$P -f 00_supabase_simule.sql
for f in ../../supabase/[0-9]*.sql; do
  case "$f" in *08_*) continue;; esac
  sed -E '/create extension if not exists (pg_net|pg_cron)/d' "$f" | $P
done
$P -f verifications.sql >/dev/null
echo "SQL : toutes les vérifications passent"
