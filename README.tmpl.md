# CyberPatriot

Scripts for CyberPatriot.

Requires NPM.

- run `./scripts/setup` to ensure proper node and npm versions
- run `npm install` to install dependencies
- run `npm run start` to start the program.

## `./rc.yaml`

This file contains the configuration for the script

### Packages

each field contains an array of packages names that will be installed

- the `*` field contains packages to install on _all_ machines
- each other field is named from `id` in `/etc/os-release` and will only be installed when it matches

### Clone

Each key is a path (relative to HOME). Tilde expansion is allowed.

- `url` is the only required field
- `args` is an array of arguments to pass to the git clone command

`````yaml
  PATH:
    url: "URL"
    args: []
````
`````
