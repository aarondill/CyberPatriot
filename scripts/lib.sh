###
### $PATH utils
###

path_contains() {
  case ":$PATH:" in
  *":${1:-}:"*) return 0 ;;
  *) return 1 ;;
  esac
}
append_path() { local p="${1:-}" && ! path_contains "$p" && PATH="${PATH:+$PATH:}$p"; }
prepend_path() { local p="${1:-}" && ! path_contains "$p" && PATH="$p${PATH:+:$PATH}"; }

###
### Command utils
###

# Returns the path of the command
cmd_path() { command -v -- "$1"; }
# returns 0 if all cmds are available, 1 otherwise
# has_cmd apt ls git
has_cmd() {
  declare -i failed=0 # declare=local
  local cmd
  for cmd; do
    command -v "$cmd" &>/dev/null || {
      failed=1 && break # stop when one is not found
    }
  done
  return "$failed"
}

# usage: has_cmd <cmds>...
# Find the first available command in a list and print it.
# example: nodejs=$(first_cmd node nodejs)
first_cmd() {
  local cmd cmds=("$@")
  if [ "${#cmds}" -eq 0 ] && ! [ -t 0 ]; then # if none given, and stdin is not a terminal
    readarray -t cmds                         # then split stdin by newline
  fi
  for cmd in "${cmds[@]}"; do
    if has_cmd "$cmd"; then
      printf '%s' "$cmd"
      return 0
    fi
  done
  return 1
}

###
### Output utils
###

# COLOR vars to keep from branching to tput repeatedly
RED_COLOR=''
BLUE_COLOR=''
GREEN_COLOR=''
BOLD_COLOR=''
RESET_COLOR=''
if has_cmd tput && [ -z "${NO_COLOR:-}" ]; then
  RED_COLOR="$(tput setaf 1 2>/dev/null)"
  BLUE_COLOR="$(tput setaf 6 2>/dev/null)"
  GREEN_COLOR="$(tput setaf 2 2>/dev/null)"
  BOLD_COLOR="$(tput bold 2>/dev/null)"
  RESET_COLOR="$(tput sgr0 2>/dev/null)"
fi

# usage: wait_key [prompt] [timeout]
# default prompt: 'Press enter to continue'
wait_key() {
  local REPLY args=() # $REPLY to discard input
  args+=(-p "${1:-Press enter to continue}")
  [ -z "${2:-}" ] || args+=(-t "$2") # optional timeout
  args+=(-s)                         # do not echo input coming from a terminal
  read -r "${args[@]}" REPLY
}
# log "hello world"
log() { printf "${BLUE_COLOR}${BOLD_COLOR}%s\n${RESET_COLOR}" "$@" || true; }
# err "goodbye world" -- shows in bold red - Use $THIS to show `script: error`
err() { printf "${THIS:+$THIS:}${RED_COLOR}${BOLD_COLOR}%s\n${RESET_COLOR}" "$@" >&2 || true; }
# debug "debug message"
debug() { printf "${RED_COLOR}${BOLD_COLOR}DEBUG: %s\n${RESET_COLOR}" "$@" >&2 || true; }
# success - no arguments
success() { printf "${GREEN_COLOR}${BOLD_COLOR}%s${RESET_COLOR}\n" "Success!" || true; }
# Usage: abort msg code
abort() { err "$1" && exit "${2:-1}"; }
# verbose echo do something -> echo do something\ndo something
verbose() {
  declare -i i=0
  local a
  for a in "$@"; do
    i=$((i + 1))
    printf "'%s'" "$a"
    # print a seperating space if not last
    if [ "$i" -lt "$#" ]; then printf ' '; fi
  done
  printf '\n'
  "$@" # run the input
}

###
### Text utils
###

# lower <<<"HELLO" -> "hello"
lower() { local t && t="$(cat -)" && printf '%s' "${t,,}"; }
# first_lower <<<"HELLO" -> "hELLO"
first_lower() { local t && t="$(cat -)" && printf '%s' "${t,}"; }
# upper <<<"hello" -> "HELLO"
upper() { local t && t="$(cat -)" && printf '%s' "${t^^}"; }
# first_upper <<<"hello" -> "Hello"
first_upper() { local t && t="$(cat -)" && printf '%s' "${t^}"; }

###
### Miscellaneous utils
###

# download -p <URL> [output] outputs to stdout if output is not specified
# if -p is passed, the command will output progress information to stderr.
# This is for the user, not to parse.
# this should output *only* the contents and should follow redirects.
function download() {
  local progress=0 cmd=()
  local non_options=()
  while [ "$#" -gt 0 ]; do
    case "$1" in
    "-p") progress=1 ;;
    --) non_options+=("${@:2}") && break ;;
    -?*) abort "Unknown option: $1" ;;
    *) non_options+=("$1") ;;
    esac
    shift
  done
  set -- "${non_options[@]}"

  local url="$1" output="$2"
  [ -n "$url" ] || abort "'download' requires a URL argument." 1
  case "$(first_cmd curl wget)" in
  curl)
    cmd=(curl -SfL -o "${output:-"-"}")
    [ "$progress" -eq 1 ] || cmd+=(-s)
    ;;
  wget)
    cmd=(wget -O "${output:-"-"}")
    [ "$progress" -eq 1 ] || cmd+=(-q)
    ;;
  *) abort "'download' requires 'curl' or 'wget'." 1 ;;
  esac
  cmd+=(-- "$url")

  "${cmd[@]}"
}
