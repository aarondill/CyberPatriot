#!/usr/bin/env bash
set -euC -o pipefail
MIN_NODE_MAJOR=18
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

if has_cmd node; then
  node_version="$(node --version)"
  log "Node version $node_version is currently installed"
  node_major="${node_version%%.*}"
  node_major="${node_major#v}"
  if [ -n "$node_major" ] && [ "$node_major" -ge "$MIN_NODE_MAJOR" ]; then
    log "Node v$node_major is >= $MIN_NODE_MAJOR! We have achieved setup."
    exit 0
  fi
  log "Node version is not high enough."
fi

if ! has_cmd n; then
  log "Attempting to install n using a package manager!"
  for cmd in "pnpm" "npm" "bun"; do
    has_cmd $cmd || continue
    log "Using $cmd"
    "$cmd" install n
    break
  done
fi

if ! has_cmd n; then
  log "Could not find n! Please install n or a package manager!" >&2
  exit 1
fi

log "Setting up node using n!"
n=$(command -v n)
sudo "$n" latest
