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
  dircolors_file="${XDG_CONFIG_HOME:-$HOME/.config}"/dircolors
  if [ -r "$dircolors_file" ]; then
    eval "$(dircolors -b "$dircolors_file")"
  elif [ -r ~/.dircolors ]; then
    eval "$(dircolors -b ~/.dircolors)"
  else
    eval "$(dircolors -b)"
  fi
  unset dircolors_file
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

will_startx() { command -v startx &>/dev/null && [ -z "$DISPLAY" ] && [ "$TERM" = "linux" ] && [ "$(tty)" = /dev/tty1 ] && [ -z "$SKIP_STARTX_LOGIN" ]; }
# All code above this point is part of the distrobution.
# Any code below is part of my personal installation
#
# Show starship if it's installed
# HACK use env to disable custom ps1
if command -v starship &>/dev/null; then
  # Allow user to override by setting the environment variable to empty string
  export DISABLE_CUSTOM_PS1=${DISABLE_CUSTOM_PS1-1}
fi

# HACK: Stop neofetch from starting on tty when starting WM. This decreases initial login time.
# This doesn't leak bc it's not exported and if will_startx then this bash instance is replaced with startx
if will_startx; then export NONEOFETCH=1; fi

# Initialize `~/.bashrc.d`
if [ -d "$HOME/.bashrc.d/" ]; then
  # Find all files not starting with _, and sort, ensuring base lang
  readarray -d '' files < <(find "$HOME/.bashrc.d/" -type f -not -name "_*" -print0 | LC_ALL=C sort -z)
  # disable keyboard echo until bashrc is done
  stty -echo 2>/dev/null
  for file in "${files[@]}" ~/tmp/bashrc; do # read temporary rc to allow user config
    [ -r "$file" ] || continue
    # For each file, if bench var is assigned,
    # then call time and output benchmark
    # shellcheck disable=SC1090 # Don't even try to follow this loop
    if [ -n "$__bashrc_bench" ]; then
      TIMEFORMAT="$file: %R"
      time . "$file"
      unset TIMEFORMAT
    else
      . "$file"
    fi
  done
  # Enable keyboard echo for interactive use
  stty echo 2>/dev/null
fi

# tabtab source for packages
# uninstall by removing these lines
# shellcheck source=/home/aaron/.config/tabtab/bash/__tabtab.bash
if [ -f ~/.config/tabtab/bash/__tabtab.bash ]; then . ~/.config/tabtab/bash/__tabtab.bash; fi

# Startx on tty1 -- tty should not return tty* in an emulator or ssh
if will_startx; then
  # The command to run. Leave empty to use the default. This should be a absolute path!
  startx_command=()
  # startx_command+=(~/code/repos/awesome/_scripts/run)
  # LOG_FILE="$HOME/.cache/visual/$(date +"%D-%T.%3N").log"
  LOG_FILE="$HOME/.cache/visual/visual.log"
  mkdir -p -- "$(dirname "$LOG_FILE")"
  # Keep LOG_FILE, LOG_FILE.old, and LOG_FILE.old.1
  [ -f "$LOG_FILE.old.1" ] && \rm -f -- "$LOG_FILE.old.1"
  [ -f "$LOG_FILE.old" ] && \mv -f -- "$LOG_FILE.old" "$LOG_FILE.old.1"
  [ -f "$LOG_FILE" ] && \mv -f -- "$LOG_FILE" "$LOG_FILE.old"

  if command -v visual &>/dev/null; then
    exec visual "${startx_command[@]}" >|"$LOG_FILE" 2>&1 || true
  else
    exec startx "${startx_command[@]}" >|"$LOG_FILE" 2>&1 || true
  fi
  unset LOG_FILE startx_command
fi
unset -f will_startx

# Bash 5.1 added support for PROMPT_COMMAND as an array.
# If running in a lesser version, concat PROMPT_COMMAND into a single string
# My config assumes that PROMPT_COMMAND can be an array.
if [ "${BASH_VERSINFO[0]}" -lt 5 ] || { [ "${BASH_VERSINFO[0]}" -eq 5 ] && [ "${BASH_VERSINFO[1]}" -lt 1 ]; }; then
  _join_prompt_command() {
    unset -f _join_prompt_command # self destructing function
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
