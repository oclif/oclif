# `oclif pack`

Package an oclif CLI into installable artifacts.

- [`oclif pack deb`](#oclif-pack-deb)
- [`oclif pack macos`](#oclif-pack-macos)
- [`oclif pack tarballs`](#oclif-pack-tarballs)
- [`oclif pack win`](#oclif-pack-win)

## `oclif pack deb`

Pack CLI into debian package.

```
USAGE
  $ oclif pack deb -r <value> [-z gzip|none|xz|zstd] [--prune-lockfiles | -t <value>] [--sha <value>]

FLAGS
  -r, --root=<value>          (required) [default: .] Path to oclif CLI root.
  -t, --tarball=<value>       Optionally specify a path to a tarball already generated by NPM.
  -z, --compression=<option>  Override the default compression used by dpkg-deb.
                              <options: gzip|none|xz|zstd>
      --prune-lockfiles       remove lockfiles in the tarball.
      --sha=<value>           7-digit short git commit SHA (defaults to current checked out commit).

DESCRIPTION
  Pack CLI into debian package.

  Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.

FLAG DESCRIPTIONS
  -z, --compression=gzip|none|xz|zstd  Override the default compression used by dpkg-deb.

    For more details see the `-Zcompress-type` section at https://man7.org/linux/man-pages/man1/dpkg-deb.1.html
```

_See code: [src/commands/pack/deb.ts](https://github.com/oclif/oclif/blob/4.22.5/src/commands/pack/deb.ts)_

## `oclif pack macos`

Pack CLI into macOS .pkg

```
USAGE
  $ oclif pack macos -r <value> [--prune-lockfiles | -t <value>] [--sha <value>] [--targets <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --tarball=<value>  Optionally specify a path to a tarball already generated by NPM.
      --prune-lockfiles  remove lockfiles in the tarball.
      --sha=<value>      7-digit short git commit SHA (defaults to current checked out commit).
      --targets=<value>  Comma-separated targets to pack (e.g.: darwin-x64,darwin-arm64).

DESCRIPTION
  Pack CLI into macOS .pkg

  Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.
```

_See code: [src/commands/pack/macos.ts](https://github.com/oclif/oclif/blob/4.22.5/src/commands/pack/macos.ts)_

## `oclif pack tarballs`

Package oclif CLI into tarballs.

```
USAGE
  $ oclif pack tarballs -r <value> [--parallel] [--prune-lockfiles] [--sha <value>] [-l <value>] [-t <value>] [--xz]

FLAGS
  -l, --tarball=<value>  Optionally specify a path to a tarball already generated by NPM.
  -r, --root=<value>     (required) [default: .] Path to oclif CLI root.
  -t, --targets=<value>  Comma-separated targets to pack (e.g.: linux-arm,win32-x64).
      --parallel         Build tarballs in parallel.
      --prune-lockfiles  remove lockfiles in the tarball.
      --sha=<value>      7-digit short git commit SHA (defaults to current checked out commit).
      --[no-]xz          Also build xz.

DESCRIPTION
  Package oclif CLI into tarballs.

  This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.

  Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.
```

_See code: [src/commands/pack/tarballs.ts](https://github.com/oclif/oclif/blob/4.22.5/src/commands/pack/tarballs.ts)_

## `oclif pack win`

Create windows installer from oclif CLI

```
USAGE
  $ oclif pack win -r <value> [--defender-exclusion checked|unchecked|hidden] [--prune-lockfiles | -t <value>]
    [--sha <value>] [--targets <value>]

FLAGS
  -r, --root=<value>                 (required) [default: .] Path to oclif CLI root.
  -t, --tarball=<value>              Optionally specify a path to a tarball already generated by NPM.
      --defender-exclusion=<option>  [default: checked] Set to "checked" or "unchecked" to set the default value for the
                                     checkbox.  Set to "hidden" to hide the option (will let defender do its thing).
                                     <options: checked|unchecked|hidden>
      --prune-lockfiles              remove lockfiles in the tarball.
      --sha=<value>                  7-digit short git commit SHA (defaults to current checked out commit).
      --targets=<value>              Comma-separated targets to pack (e.g.: win32-x64,win32-x86,win32-arm64).

DESCRIPTION
  Create windows installer from oclif CLI

  You need to have 7zip, nsis (makensis), and grep installed on your machine in order to run this command.

  This command will produce unsigned installers unless you supply WINDOWS_SIGNING_PASS (prefixed with the name of your
  executable, e.g. OCLIF_WINDOWS_SIGNING_PASS) in the environment and have set the windows.name and windows.keypath
  properties in your package.json's oclif property.

  Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.

FLAG DESCRIPTIONS
  --defender-exclusion=checked|unchecked|hidden

    Set to "checked" or "unchecked" to set the default value for the checkbox.  Set to "hidden" to hide the option (will
    let defender do its thing).

    There is no way to set a hidden checkbox with "true" as a default...the user can always allow full security
```

_See code: [src/commands/pack/win.ts](https://github.com/oclif/oclif/blob/4.22.5/src/commands/pack/win.ts)_
