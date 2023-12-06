#!/usr/bin/env bash
set -euC -o pipefail
root=$(npm prefix) && root=${root%/}
cd "$root"
# shellcheck source=./lib.sh # Note: this assumes the scripts dir is named '/scripts'
. "$root/scripts/lib.sh"

log "Note: this script should be run in the VM!"

if ! grep -q '^flags\s*:.* hypervisor\b' /proc/cpuinfo; then
  err "This machine is not detected as a VM."
  confirm "Really run this script?" || exit
fi

permfile="$root/files/perms.txt"
dirs=(/sbin/ /bin/ /etc/ /boot/) #Note: the trailing slashes are important to dereference links
# only include files. No links!
sudo find "${dirs[@]}" -type f -printf '%m %p\n' >|"$permfile"
