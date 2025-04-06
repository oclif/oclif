# `oclif promote`

Promote CLI builds to a S3 release channel.

- [`oclif promote`](#oclif-promote)

## `oclif promote`

Promote CLI builds to a S3 release channel.

```
USAGE
  $ oclif promote --channel <value> -r <value> --sha <value> --version <value> [-d] [--dry-run]
    [--ignore-missing] [--indexes] [-m] [-a <value>] [-t <value>] [-w] [--xz]

FLAGS
  -a, --max-age=<value>  [default: 86400] Cache control max-age in seconds.
  -d, --deb              Promote debian artifacts.
  -m, --macos            Promote macOS pkg.
  -r, --root=<value>     (required) [default: .] Path to the oclif CLI project root.
  -t, --targets=<value>  Comma-separated targets to promote (e.g.: linux-arm,win32-x64).
  -w, --win              Promote Windows exe.
      --channel=<value>  (required) [default: stable] Channel to promote to.
      --dry-run          Run the command without uploading to S3 or copying versioned tarballs/installers to channel.
      --ignore-missing   Ignore missing tarballs/installers and continue promoting the rest.
      --indexes          Append the promoted urls into the index files.
      --sha=<value>      (required) 7-digit short git commit SHA of the CLI to promote.
      --version=<value>  (required) Semantic version of the CLI to promote.
      --[no-]xz          Also upload xz.

DESCRIPTION
  Promote CLI builds to a S3 release channel.
```

_See code: [src/commands/promote.ts](https://github.com/oclif/oclif/blob/4.17.43/src/commands/promote.ts)_
