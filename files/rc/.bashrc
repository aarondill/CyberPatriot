#! /usr/bin/bash
# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
case $- in
*i*) ;;
*) return ;;
esac

# disable mail checking
unset MAILCHECK

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# make less more friendly for non-text input files, see lesspipe(1)
[ -x "$(command -v lesspipe)" ] && eval "$(SHELL=/bin/sh lesspipe)"

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
  debian_chroot=$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, unless we know we "want" color)
case "$TERM" in
xterm-color | *-256color) color_prompt=yes ;;
esac

# uncomment for a colored prompt, if the terminal has the capability; turned
# off by default to not distract the user: the focus in a terminal window
# should be on the output of commands, not on the prompt
#force_color_prompt=yes

if [ -n "$force_color_prompt" ]; then
  if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
    # We have color support; assume it's compliant with Ecma-48
    # (ISO/IEC-6429). (Lack of such support is extremely rare, and such
    # a case would tend to support setf rather than setaf.)
    color_prompt=yes
  else
    color_prompt=
  fi
fi

if [ "$color_prompt" = yes ]; then
  PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
else
  PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi
unset color_prompt force_color_prompt

# If this is an xterm set the title to user@host:dir
case "$TERM" in
xterm* | rxvt*)
  PS1='\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]$PS1'
  ;;
*) ;;

esac

# enable color support of ls and also add handy aliases
if command -v dircolors &>/dev/null; then
  dircolors_file="${XDG_CONFIG_HOME:-~/.config}"/dircolors
  [ -r "$dircolors_file" ] || dircolors_file=~/.dircolors
  _args=("$dircolors_file")
  [ -r "$dircolors_file" ] || _args=()
  eval "$(dircolors -b "${_args[@]}")"
  unset dircolors_file _args

  alias ls='ls --color=auto'
  alias dir='dir --color=auto'
  alias vdir='vdir --color=auto'

  alias grep='grep --color=auto'
  alias fgrep='fgrep --color=auto'
  alias egrep='egrep --color=auto'
  alias diff='diff --color=auto'
fi

# colored GCC warnings and errors
export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# some more ls aliases
#alias ll='ls -l'
#alias la='ls -A'
#alias l='ls -CF'

# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
  # shellcheck source=/home/aaron/.bash_aliases
  . ~/.bash_aliases
fi

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# # set PATH so it includes user's private bin if it exists
# if [ -d "$HOME/bin" ]; then
#   PATH="$HOME/bin:$PATH"
# fi
#
# # set PATH so it includes user's private bin if it exists
# if [ -d "$HOME/.local/bin" ]; then
#   PATH="$HOME/.local/bin:$PATH"
# fi

# ---------------------------BEGIN CUSTOM CODE---------------------------
# This function is leaked to the shell, this is fine.
has() { command -v "$1" >/dev/null 2>/dev/null; }

# All code above this point is part of the distrobution.
# Any code below is part of my personal installation
#
# Show starship if it's installed
# HACK use env to disable custom ps1
if command -v starship &>/dev/null; then
  # Allow user to override by setting the environment variable to empty string
  export DISABLE_CUSTOM_PS1=${DISABLE_CUSTOM_PS1-1}
fi

# Initialize `~/.bashrc.d`
if [ -d ~/.bashrc.d ]; then
  stty -echo 2>/dev/null # disable keyboard echo until bashrc is done
  shopt -s globstar
  # shellcheck disable=SC1090 # $file is dynamic
  for file in ~/.bashrc.d/** ~/tmp/bashrc ~/.bashrc.tmp; do # read temporary rc to allow user config
    { [ -f "$file" ] && [ -r "$file" ]; } || continue
    case "${file##*/}" in _*) continue ;; esac # Skip files that start with _
    [ -n "$__bashrc_bench" ] || {
      . "$file" || true
      continue
    }
    # For each file, if bench var is assigned, then call time and output benchmark
    TIMEFORMAT="$file: %R" # We can't do TIMEFORMAT='...' time bc that would call /bin/time
    time . "$file" || true
    unset TIMEFORMAT
  done
  # Enable keyboard echo for interactive use
  stty echo 2>/dev/null
fi

# tabtab source for packages
# uninstall by removing these lines
# shellcheck source=/home/aaron/.config/tabtab/bash/__tabtab.bash
if [ -f ~/.config/tabtab/bash/__tabtab.bash ]; then . ~/.config/tabtab/bash/__tabtab.bash; fi

# Bash 5.1 added support for PROMPT_COMMAND as an array.
# If running in a lesser version, concat PROMPT_COMMAND into a single string
# My config assumes that PROMPT_COMMAND can be an array.
if [ "${BASH_VERSINFO[0]}" -lt 5 ] || { [ "${BASH_VERSINFO[0]}" -eq 5 ] && [ "${BASH_VERSINFO[1]}" -lt 1 ]; }; then
  _join_prompt_command() {
    unset -f "${FUNCNAME[0]}" # self destructing function
    local tmp='' elem
    for elem in "${PROMPT_COMMAND[@]}"; do
      tmp+="${elem%;};" # Ensure elem doesn't end in a ';', then add a ';' between elements
    done
    unset -v PROMPT_COMMAND          # remove PROMPT_COMMAND
    declare -g PROMPT_COMMAND="$tmp" # redefine PROMPT_COMMAND as a non-array
  } && _join_prompt_command
fi
export -n PROMPT_COMMAND # This should *not* be exported. Stop subshells from double appending.
# ------------------------------END OF FILE------------------------------
