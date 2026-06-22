#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/apps/frontend"
BACKEND="$ROOT/apps/backend"
RESTORE_COMMIT="b240eb5"

restore_from_git() {
  local git_path="$1"
  local target="$2"
  if [ -f "$target" ]; then
    return 0
  fi
  if git -C "$ROOT" show "$RESTORE_COMMIT:$git_path" > "$target" 2>/dev/null; then
    echo "Restored $(basename "$target") from git history"
    return 0
  fi
  return 1
}

copy_if_missing() {
  local target="$1"
  local template="$2"
  if [ ! -f "$target" ]; then
    cp "$template" "$target"
    echo "Created $(basename "$target") from $(basename "$template") — add your real Firebase config"
  fi
}

restore_from_git "apps/frontend/src/lib/firebase.ts" "$FRONTEND/src/lib/firebase.ts" \
  || copy_if_missing "$FRONTEND/src/lib/firebase.ts" "$FRONTEND/src/lib/firebase.example.ts"

restore_from_git "apps/frontend/google-services.json" "$FRONTEND/google-services.json" \
  || copy_if_missing "$FRONTEND/google-services.json" "$FRONTEND/google-services.json.example"

restore_from_git ".firebaserc" "$ROOT/.firebaserc" \
  || copy_if_missing "$ROOT/.firebaserc" "$ROOT/.firebaserc.example"

copy_if_missing "$BACKEND/.env" "$BACKEND/.env.example"

if [ ! -f "$BACKEND/src/config/serviceAccount.json" ]; then
  echo "Missing apps/backend/src/config/serviceAccount.json — download from Firebase Console."
fi

echo "Local config check done."
