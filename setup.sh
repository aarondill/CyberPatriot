#!/usr/bin/env bash
set -euC -o pipefail
MIN_NODE_MAJOR=19
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
    # Success! stop!
    if has_cmd n; then break; fi
  done
fi

n=$(command -v n 2>/dev/null || true)
args=(latest)
if [ -x "$n" ]; then
  log "Setting up node using $n!"
  sudo "$n" "${args[@]}"
  exit
fi

log "Could not find n! Using curl to run n from github!"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -fsSL "https://raw.githubusercontent.com/tj/n/master/bin/n" -o "$tmp"
bash -- "$tmp" "${args[@]}"
rm "$tmp"
