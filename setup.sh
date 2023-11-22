#!/usr/bin/env bash
set -euC -o pipefail
path_contains() {
  case ":$PATH:" in
  *":${1:-}:"*) return 0 ;;
  *) return 1 ;;
  esac
}
append_path() { p="${1:-}" && ! path_contains "$p" && PATH="${PATH:+$PATH:}$p"; }
has_cmd() { [ -x "$(command -v "$1")" ]; }
log() { printf '%s\n' "$@" || true; }

append_path "./node_modules/.bin"
cd "${0%/*}" || true

if ! has_cmd n; then
  log "Attempting to install n using a package manager!"
  for cmd in "pnpm" "npm" "bun"; do
    has_cmd $cmd || continue
    log "Using $cmd"
    "$cmd" install n
    break
  done
fi

log "Setting up node using n!"
sudo n latest
