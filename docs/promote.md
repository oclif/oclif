# `oclif promote`

promote CLI builds to a S3 release channel

- [`oclif promote`](#oclif-promote)

## `oclif promote`

promote CLI builds to a S3 release channel

```
USAGE
  $ oclif promote --channel <value> -r <value> --sha <value> --version <value> [-d] [--indexes] [-m] [-a
    <value>] [-t <value>] [-w] [--xz]

FLAGS
  -a, --max-age=<value>  [default: 86400] cache control max-age in seconds
  -d, --deb              promote debian artifacts
  -m, --macos            promote macOS pkg
  -r, --root=<value>     (required) [default: .] path to the oclif CLI project root
  -t, --targets=<value>  comma-separated targets to promote (e.g.: linux-arm,win32-x64)
  -w, --win              promote Windows exe
      --channel=<value>  (required) [default: stable] which channel to promote to
      --indexes          append the promoted urls into the index files
      --sha=<value>      (required) 7-digit short git commit SHA of the CLI to promote
      --version=<value>  (required) semantic version of the CLI to promote
      --[no-]xz          also upload xz

DESCRIPTION
  promote CLI builds to a S3 release channel
```

_See code: [src/commands/promote.ts](https://github.com/oclif/oclif/blob/v4.5.2/src/commands/promote.ts)_
