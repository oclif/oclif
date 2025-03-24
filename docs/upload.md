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
  $ oclif upload deb -r <value> [--dry-run]

FLAGS
  -r, --root=<value>  (required) [default: .] Path to oclif CLI root.
      --dry-run       Run the command without uploading to S3.

DESCRIPTION
  Upload deb package built with `pack deb`.
```

_See code: [src/commands/upload/deb.ts](https://github.com/oclif/oclif/blob/4.17.41/src/commands/upload/deb.ts)_

## `oclif upload macos`

Upload macos installers built with `pack macos`.

```
USAGE
  $ oclif upload macos -r <value> [--dry-run] [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --targets=<value>  Comma-separated targets to upload (e.g.: darwin-x64,darwin-arm64).
      --dry-run          Run the command without uploading to S3.

DESCRIPTION
  Upload macos installers built with `pack macos`.
```

_See code: [src/commands/upload/macos.ts](https://github.com/oclif/oclif/blob/4.17.41/src/commands/upload/macos.ts)_

## `oclif upload tarballs`

Upload an oclif CLI to S3.

```
USAGE
  $ oclif upload tarballs -r <value> [--dry-run] [-t <value>] [--xz]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --targets=<value>  Comma-separated targets to upload (e.g.: linux-arm,win32-x64).
      --dry-run          Run the command without uploading to S3.
      --[no-]xz          Also upload xz.

DESCRIPTION
  Upload an oclif CLI to S3.
```

_See code: [src/commands/upload/tarballs.ts](https://github.com/oclif/oclif/blob/4.17.41/src/commands/upload/tarballs.ts)_

## `oclif upload win`

Upload windows installers built with `pack win`.

```
USAGE
  $ oclif upload win -r <value> [--dry-run] [--targets <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
      --dry-run          Run the command without uploading to S3.
      --targets=<value>  Comma-separated targets to pack (e.g.: win32-x64,win32-x86,win32-arm64).

DESCRIPTION
  Upload windows installers built with `pack win`.
```

_See code: [src/commands/upload/win.ts](https://github.com/oclif/oclif/blob/4.17.41/src/commands/upload/win.ts)_
