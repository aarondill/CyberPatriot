#!/usr/bin/env sh
# vim:set ft=sh:
# Purly visual shebang
# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

path_contains() {
  case ":$PATH:" in
  *":${1:-}:"*) return 0 ;;
  *) return 1 ;;
  esac
}
append_path() { p="${1:-}" && ! path_contains "$p" && PATH="${PATH:+$PATH:}$p"; }
prepend_path() { p="${1:-}" && ! path_contains "$p" && PATH="$p${PATH:+:$PATH}"; }

if [ -z "${USER:-}" ]; then USER="$(id -nu)"; fi
if [ -n "${USER:-}" ]; then export USER; fi

if [ -z "${HOME:-}" ]; then
  home=~ # bash will expand this
  case "$home" in
  /*) HOME=$home ;; # test for expanded dir
  esac
  unset home # don't leak to shell
fi
if [ -z "${HOME:-}" ] && command -v getent >/dev/null 2>&1; then
  HOME="$(getent passwd "$USER" | cut -d: -f6)" # use getent
fi
if [ -n "${HOME:-}" ]; then export HOME; fi

export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_STATE_HOME="$HOME/.local/state"
export XDG_CACHE_HOME="$HOME/.cache"
for dir in "$XDG_CACHE_HOME" "$XDG_STATE_HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME"; do
  if ! [ -d "$dir" ]; then mkdir -p -- "$dir"; fi
done

# Stop less from saving it's history
export LESSHISTFILE=-
# Make search case insensitive
export LESS="-I"
# Make less show icons in PUA areas
export LESSUTFCHARDEF='E000-F8FF:p,F0000-FFFFD:p,100000-10FFFD:p'
# Move some files from my $HOME directory
export LESSKEY="$XDG_CONFIG_HOME/less/lesskey"
export GNUPGHOME="$XDG_CONFIG_HOME"/gnupg
export NODE_REPL_HISTORY="$XDG_STATE_HOME"/node/node_repl_history
export NPM_CONFIG_USERCONFIG="$XDG_CONFIG_HOME"/npm/npmrc
export INPUTRC="$XDG_CONFIG_HOME"/readline/inputrc
export W3M_DIR="$XDG_DATA_HOME"/w3m
export _JAVA_OPTIONS=-Djava.util.prefs.userRoot="$XDG_CONFIG_HOME"/java
# Allow usage of `has` with non-defined programs
export HAS_ALLOW_UNSAFE=y
export HISTFILE="$XDG_STATE_HOME/${SHELL##*/}_history" # /bash_history
export GTK_USE_PORTAL=1
# set wezterm to be quieter
export WEZTERM_LOG=config=info,warn
# https://github.com/nodejs/node/issues/41145#issuecomment-992948130
# Bun, npm, and node are broken on ipv6. Because of course they are.
export NODE_OPTIONS="--dns-result-order=ipv4first"

export WGETRC="$XDG_CONFIG_HOME/wgetrc"
export ASPELL_CONF="per-conf $XDG_CONFIG_HOME/aspell/aspell.conf; personal $XDG_CONFIG_HOME/aspell/en.pws; repl $XDG_CONFIG_HOME/aspell/en.prepl"
export TS_NODE_HISTORY="$XDG_STATE_HOME"/node/ts_node_repl_history
export GTK2_RC_FILES="$XDG_CONFIG_HOME/gtk-2.0/gtkrc"

# set PATH so it includes system bin (on debian)
prepend_path "/sbin"
# set PATH so it includes user's private bin if it exists
prepend_path "$HOME/bin"
# set PATH so it includes user's private bin if it exists
prepend_path "$HOME/.local/bin"

if command -v "java" >/dev/null 2>/dev/null; then
  java_home=$(realpath -- "$(command -v -- java)")
  java_home=${java_home%/*} java_home=${java_home%/*} # $(dirname $(dirname $java_home))
  JAVA_HOME="$java_home"
  unset java_home
fi
if ! [ -d "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm ]; then
  # set JAVA_HOME to latest jvm available
  # use sort -V to sort versions. only available in core-utils-7
  # Remove trailing NULL byte with tr -d to avoid bash warning
  JAVA_HOME="$(find /usr/lib/jvm -maxdepth 1 -type d -print0 | sort -zV | tail -zn1 | tr -d '\0')"
  export JAVA_HOME
  # removed because should be linked to /usr/bin/*
  # prepend_path "$JAVA_HOME/bin"
fi

# allow npm bin
# My own variable, for symetry with PNPM_HOME
export NPM_HOME="$XDG_DATA_HOME/npm"
prepend_path "$NPM_HOME/bin"

# allow pnpm bin
export PNPM_HOME="$XDG_DATA_HOME/pnpm"
prepend_path "$PNPM_HOME"

# Cargo and rustup
export RUSTUP_HOME="$XDG_DATA_HOME/rustup"
export CARGO_HOME="$XDG_DATA_HOME/cargo"
append_path "$CARGO_HOME/bin"

export BUN_INSTALL="$XDG_DATA_HOME/bun"
export BUN_INSTALL_CACHE_DIR="$XDG_CACHE_HOME/bun"
export BUN_COMPLETION="$BUN_INSTALL/complete.bash"
append_path "$BUN_INSTALL/bin"
# shellcheck source=/home/aaron/.local/share/bun/complete.bash
if [ -f "$BUN_COMPLETION" ]; then . "$BUN_COMPLETION"; fi

# include flatpaks in path. (Have org.example.app names)
append_path "/var/lib/flatpak/exports/bin"

# include go in path
append_path "/usr/local/go/bin"
export GOPATH="$XDG_DATA_HOME/go"
if command -v go >/dev/null 2>/dev/null; then
  append_path "$(go env GOPATH)/bin"
else
  append_path "$GOPATH/bin"
fi

# if running bash
if [ -n "$BASH_VERSION" ]; then
  # include .bashrc if it exists
  if [ -f "$HOME/.bashrc" ]; then
    # shellcheck source=/home/aaron/.bashrc
    . "$HOME/.bashrc"
  fi
fi

# A variable to use in chezmoi to make sure the user has sourced the profile
export MY_PROFILE_HAS_LOADED=1
