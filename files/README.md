This directory is _only_ supported on Unix (Linux) systems.

A set of files to control the VM

## `./rc/`

`./rc/` contains files that will be copied under "$HOME" in the VM.
Note: use the script at `/scripts/update-rc.sh` to update these files based on the current user's home directory

## `./perms.txt`

A list of permissions to files. Generate this with `/scripts/update-perms-file.sh` in a (fresh) VM
Each file will be listed (relative to root) and if it exists on the VM, and the permissions of the file differ, they will be changed to the ones specified
Note: If the file doesn't exist on the machine, the line will be ignored

`0000 FILE-NAME-HERE`

## `./root/`

A directory containing files to copy to the VM.

## `./root/perms.txt`

A specialized version of the above file that will be processed _after_ copying `./root/*`
Use this command to generate it from the files in `./root/**`:
This file will not be copied to the machine.

```bash
> ( cd "$(npm prefix)/files/root" && find . -mindepth 1 -printf  '%m %p\n' ) >| "$(npm prefix)/files/root/perms.txt"
```
