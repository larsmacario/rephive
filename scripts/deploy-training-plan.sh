#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_REF="jnspiqnlwbsobqctmfnk"
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "${HOME}/.supabase/access-token" ]; then
  export SUPABASE_ACCESS_TOKEN="$(cat "${HOME}/.supabase/access-token")"
fi
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Bitte zuerst: npx supabase login"
  echo "Oder: export SUPABASE_ACCESS_TOKEN=<dein-token>"
  exit 1
fi
npx supabase@latest functions deploy generate-training-plan --project-ref "$PROJECT_REF"
echo "Deploy abgeschlossen."
