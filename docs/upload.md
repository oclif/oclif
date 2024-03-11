# `oclif upload`

upload installable CLI artifacts to AWS S3

- [`oclif upload deb`](#oclif-upload-deb)
- [`oclif upload macos`](#oclif-upload-macos)
- [`oclif upload tarballs`](#oclif-upload-tarballs)
- [`oclif upload win`](#oclif-upload-win)

## `oclif upload deb`

upload deb package built with pack:deb

```
USAGE
  $ oclif upload deb -r <value>

FLAGS
  -r, --root=<value>  (required) [default: .] path to oclif CLI root

DESCRIPTION
  upload deb package built with pack:deb
```

_See code: [src/commands/upload/deb.ts](https://github.com/oclif/oclif/blob/v4.5.2/src/commands/upload/deb.ts)_

## `oclif upload macos`

upload macos installers built with pack:macos

```
USAGE
  $ oclif upload macos -r <value> [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --targets=<value>  comma-separated targets to upload (e.g.: darwin-x64,darwin-arm64)

DESCRIPTION
  upload macos installers built with pack:macos
```

_See code: [src/commands/upload/macos.ts](https://github.com/oclif/oclif/blob/v4.5.2/src/commands/upload/macos.ts)_

## `oclif upload tarballs`

upload an oclif CLI to S3

```
USAGE
  $ oclif upload tarballs -r <value> [-t <value>] [--xz]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --targets=<value>  comma-separated targets to upload (e.g.: linux-arm,win32-x64)
      --[no-]xz          also upload xz

DESCRIPTION
  upload an oclif CLI to S3

  "aws-sdk" will need to be installed as a devDependency to upload.
```

_See code: [src/commands/upload/tarballs.ts](https://github.com/oclif/oclif/blob/v4.5.2/src/commands/upload/tarballs.ts)_

## `oclif upload win`

upload windows installers built with pack:win

```
USAGE
  $ oclif upload win -r <value> [--targets <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
      --targets=<value>  comma-separated targets to pack (e.g.: win32-x64,win32-x86)

DESCRIPTION
  upload windows installers built with pack:win
```

_See code: [src/commands/upload/win.ts](https://github.com/oclif/oclif/blob/v4.5.2/src/commands/upload/win.ts)_
