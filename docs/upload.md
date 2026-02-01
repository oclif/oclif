# `oclif upload`

Upload installable CLI artifacts to AWS S3.

- [`oclif upload deb`](#oclif-upload-deb)
- [`oclif upload macos`](#oclif-upload-macos)
- [`oclif upload tarballs`](#oclif-upload-tarballs)
- [`oclif upload win`](#oclif-upload-win)

## `oclif upload deb`

Upload deb package built with `pack deb`.

```
USAGE
  $ oclif upload deb -r <value> [--dry-run] [--sha <value>]

FLAGS
  -r, --root=<value>  (required) [default: .] Path to oclif CLI root.
      --dry-run       Run the command without uploading to S3.
      --sha=<value>   7-digit short git commit SHA (defaults to current checked out commit).

DESCRIPTION
  Upload deb package built with `pack deb`.
```

_See code: [src/commands/upload/deb.ts](https://github.com/oclif/oclif/blob/4.22.73/src/commands/upload/deb.ts)_

## `oclif upload macos`

Upload macos installers built with `pack macos`.

```
USAGE
  $ oclif upload macos -r <value> [--dry-run] [--sha <value>] [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --targets=<value>  Comma-separated targets to upload (e.g.: darwin-x64,darwin-arm64).
      --dry-run          Run the command without uploading to S3.
      --sha=<value>      7-digit short git commit SHA (defaults to current checked out commit).

DESCRIPTION
  Upload macos installers built with `pack macos`.
```

_See code: [src/commands/upload/macos.ts](https://github.com/oclif/oclif/blob/4.22.73/src/commands/upload/macos.ts)_

## `oclif upload tarballs`

Upload an oclif CLI to S3.

```
USAGE
  $ oclif upload tarballs -r <value> [--dry-run] [--sha <value>] [-t <value>] [--xz]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --targets=<value>  Comma-separated targets to upload (e.g.: linux-arm,win32-x64).
      --dry-run          Run the command without uploading to S3.
      --sha=<value>      7-digit short git commit SHA (defaults to current checked out commit).
      --[no-]xz          Also upload xz.

DESCRIPTION
  Upload an oclif CLI to S3.
```

_See code: [src/commands/upload/tarballs.ts](https://github.com/oclif/oclif/blob/4.22.73/src/commands/upload/tarballs.ts)_

## `oclif upload win`

Upload windows installers built with `pack win`.

```
USAGE
  $ oclif upload win -r <value> [--dry-run] [--sha <value>] [--targets <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
      --dry-run          Run the command without uploading to S3.
      --sha=<value>      7-digit short git commit SHA (defaults to current checked out commit).
      --targets=<value>  Comma-separated targets to pack (e.g.: win32-x64,win32-x86,win32-arm64).

DESCRIPTION
  Upload windows installers built with `pack win`.
```

_See code: [src/commands/upload/win.ts](https://github.com/oclif/oclif/blob/4.22.73/src/commands/upload/win.ts)_
