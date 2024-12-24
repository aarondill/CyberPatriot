<!-- This file is generated from README.tmpl.md -->
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

### Lines of code
<sup><sub>Generated at commit 8c9bfaea643e229860acb93a4b3a08706c1142fa</sub></sup>
cloc|github.com/AlDanial/cloc v 1.96
--- | ---

Language|files|blank|comment|code
:-------|-------:|-------:|-------:|-------:
Text|2|0|0|3262
TypeScript|31|164|171|1500
Bourne Again Shell|41|219|449|1239
Bourne Shell|5|54|115|332
JavaScript|3|15|42|282
JSON|3|0|0|88
Markdown|3|37|1|78
YAML|2|1|5|62
--------|--------|--------|--------|--------
SUM:|90|490|783|6843
