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

# This function is leaked to the shell, this is fine.
has() { command -v "$1" >/dev/null 2>/dev/null; }

dedupe_path() {
  # If perl isn't available, just give up
  has perl || return 0
  PATH=$(perl -e '
use Config; use File::Spec; use Cwd;
foreach my $path (File::Spec->path) {
    my $realpath = File::Spec->file_name_is_absolute($path) && -d $path ? Cwd::realpath($path) : File::Spec->canonpath($path);
    push @res, $realpath unless ($seen{$realpath}++) 
}
print join($main::Config{"path_sep"}, @res);
')
}
# Appends to PATH, if it isn't already there
append_path() {
  case ":$PATH:" in
  *:"$1":*) return 0 ;;
  esac
  PATH="${PATH:+$PATH:}$1"
}
# NOTE: doesn't check if it's already there, to enforce order
prepend_path() { PATH="$1${PATH:+:$PATH}"; }

if [ -z "${USER:-}" ]; then USER="$(id -nu)"; fi
if [ -n "${USER:-}" ]; then export USER; fi

if [ -z "${HOME:-}" ]; then
  home=~ # bash will expand this
  case "$home" in
  /*) HOME=$home ;; # test for expanded dir
  esac
  unset home # don't leak to shell
fi
if [ -z "${HOME:-}" ] && has getent; then
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
unset dir

_cores=$({ nproc || sysctl -n hw.ncpu || getconf _NPROCESSORS_ONLN || echo 1; } 2>/dev/null)
export MAKEFLAGS="-j$_cores"
unset _cores
# Stop less from saving it's history
export LESSHISTFILE=-
# Make search case insensitive -- Support colors
export LESS="-IR"
# Make less show icons in PUA areas
export LESSUTFCHARDEF='E000-F8FF:p,F0000-FFFFD:p,100000-10FFFD:p'
# Move some files from my $HOME directory
export LESSKEY="$XDG_CONFIG_HOME/less/lesskey"
# Allow mouse scolling in journalctl
export SYSTEMD_LESS=RSMK
export GNUPGHOME="$XDG_CONFIG_HOME"/gnupg
export GDBHISTFILE="$XDG_DATA_HOME"/gdb/history
export NODE_REPL_HISTORY="$XDG_STATE_HOME"/node/node_repl_history
export NPM_CONFIG_USERCONFIG="$XDG_CONFIG_HOME"/npm/npmrc
export INPUTRC="$XDG_CONFIG_HOME"/readline/inputrc
export W3M_DIR="$XDG_DATA_HOME"/w3m
export JAVA_TOOL_OPTIONS=-Djava.util.prefs.userRoot="$XDG_CONFIG_HOME"/java
# Allow usage of `has` with non-defined programs
export HAS_ALLOW_UNSAFE=y
export HISTFILE="$XDG_STATE_HOME/${SHELL##*/}_history" # /bash_history
export GTK_USE_PORTAL=1
# set wezterm to be quieter
export WEZTERM_LOG=config=info,warn
# https://github.com/nodejs/node/issues/41145#issuecomment-992948130
# Bun, npm, and node are broken on ipv6. Because of course they are.
export NODE_OPTIONS="--dns-result-order=ipv4first"
# Ideally, gradle.properties should be in $XDG_CONFIG_HOME/gradle, and the rest
# in $XDG_CACHE_HOME/gradle, but that's not a supported option. I don't want
# this in cache so I don't delete the config by accident
export GRADLE_USER_HOME="$XDG_DATA_HOME/gradle"

export WGETRC="$XDG_CONFIG_HOME/wgetrc"
export ASPELL_CONF="per-conf $XDG_CONFIG_HOME/aspell/aspell.conf; personal $XDG_CONFIG_HOME/aspell/en.pws; repl $XDG_CONFIG_HOME/aspell/en.prepl"
export TS_NODE_HISTORY="$XDG_STATE_HOME"/node/ts_node_repl_history
export GTK2_RC_FILES="$XDG_CONFIG_HOME/gtk-2.0/gtkrc"

# set PATH so it includes system bin (on debian)
append_path "/sbin"
# set PATH so it includes user's private bin if it exists
prepend_path "$HOME/bin"
# set PATH so it includes user's private bin if it exists
prepend_path "$HOME/.local/bin"

if has java; then
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

if [ -d "$XDG_DATA_HOME/gem/ruby/3.0.0/bin" ]; then
  append_path "$XDG_DATA_HOME/gem/ruby/3.0.0/bin"
fi

# allow pnpm bin
export PNPM_HOME="$XDG_DATA_HOME/pnpm"
prepend_path "$PNPM_HOME"

# Cargo and rustup
export RUSTUP_HOME="$XDG_DATA_HOME/rustup"
export CARGO_HOME="$XDG_DATA_HOME/cargo"
prepend_path "$CARGO_HOME/bin"

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
if has go; then
  append_path "$(go env GOPATH)/bin"
else
  append_path "$GOPATH/bin"
fi

if has luarocks; then eval "$(luarocks path --append)" || true; fi

_will_startx=
if has startx && [ -z "$DISPLAY" ] && [ "$TERM" = "linux" ] && [ "$(tty)" = /dev/tty1 ] && [ -z "$SKIP_STARTX_LOGIN" ]; then
  _will_startx=1
fi

if [ -z "$_will_startx" ]; then
  # Saved terminals
  if [ -f ~/.terms ]; then
    printf '%s\n' "Loading saved terminals" >&2
    # Move first to ensure child processes don't try to load it
    # Store in case i need it
    mv -f -- ~/.terms "$XDG_CACHE_HOME"/.terms
    # If it fails, move it back
    bash "$XDG_CACHE_HOME"/.terms || mv -i -- "$XDG_CACHE_HOME"/.terms ~/.terms
  fi

  # if running bash
  if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
      # shellcheck source=/home/aaron/.bashrc
      . "$HOME/.bashrc"
    fi
  fi
fi

dedupe_path

dbus-update-activation-environment --all 2>/dev/null || true
systemctl --user import-environment 2>/dev/null || true

# Startx on tty1 -- tty should not return tty* in an emulator or ssh
if [ -n "$_will_startx" ]; then
  # The command to run. Leave empty to use the default. This should be a absolute path!
  startx_command=''
  # [ -f ~/code/repos/awesome/_scripts/run ] && startx_command+=(~/code/repos/awesome/_scripts/run)
  # LOG_FILE="$HOME/.cache/visual/$(date +"%D-%T.%3N").log"
  LOG_FILE="$HOME/.cache/visual/visual.log"
  mkdir -p -- "$(dirname "$LOG_FILE")"
  # Keep LOG_FILE, LOG_FILE.old, and LOG_FILE.old.1
  [ -f "$LOG_FILE.old.1" ] && \rm -f -- "$LOG_FILE.old.1"
  [ -f "$LOG_FILE.old" ] && \mv -f -- "$LOG_FILE.old" "$LOG_FILE.old.1"
  [ -f "$LOG_FILE" ] && \mv -f -- "$LOG_FILE" "$LOG_FILE.old"

  # shellcheck disable=SC2086 # Sh doesn't allow arrays.
  if has visual; then
    # note: visual -t will complain to stderr if something is wrong.
    # If we can't start an x server, then at least give me a shell!
    if visual -t $startx_command; then
      exec visual $startx_command >|"$LOG_FILE" 2>&1 || true
    fi
  else
    exec startx $startx_command >|"$LOG_FILE" 2>&1 || true
  fi
  unset LOG_FILE startx_command
fi
unset will_startx
unset -f append_path prepend_path dedupe_path

# A variable to use in chezmoi to make sure the user has sourced the profile
export MY_PROFILE_HAS_LOADED=1
