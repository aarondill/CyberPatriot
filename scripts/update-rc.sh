#!/usr/bin/env bash
set -euC -o pipefail
shopt -s nullglob # *not-exists* = ""
shopt -s globstar # **
shopt -s dotglob  # * includes dotfiles

root=$(npm prefix) && root=${root%/}
cd "$root"
# shellcheck source=./lib.sh # Note: this assumes the scripts dir is named '/scripts'
. "$root/scripts/lib.sh"

rcdir="$root/files/rc"
for f in "$rcdir/"**; do
  ! [ -d "$f" ] || continue   # Skip directories
  homepath=~/"${f#"$rcdir/"}" # Strip $rcdir and prefix with $HOME
  if ! [ -f "$homepath" ]; then
    err "$homepath does not exist!"
    rm -i -- "$f"
    dirname=$(dirname -- "$f")
    dirname="${dirname#"$rcdir/"}"                   # ensure that we don't try to remove $rcdir
    (cd "$rcdir" && rmdir -p "$dirname" 2>/dev/null) # Remove empty parent directories
  fi
  if cmp -s "$f" "$homepath"; then continue; fi # Same. Skip.
  if has_cmd diff less; then
    diff_opts=()
    if diff --help | grep -q -- '--color'; then diff_opts+=(--color=always); fi
    # Show user interactive diff
    {
      printf "%s -> %s\n" "$f" "$homepath"
      diff "${diff_opts[@]}" -- "$f" "$homepath" || [ "$?" -eq 1 ] # diff exits with 1
    } | less -R
  fi
  # Note: cp -i so the user gets prompted on each file
  # cp -Pp -R is posix for cp --archive
  cp -pP -i -- "$homepath" "$f"
done
