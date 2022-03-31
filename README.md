
<img src="https://user-images.githubusercontent.com/449385/38243295-e0a47d58-372e-11e8-9bc0-8c02a6f4d2ac.png" width="260" height="73">


oclif: Node.JS Open CLI Framework
=================================

[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![CircleCI](https://circleci.com/gh/oclif/oclif/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/oclif/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/command.svg)](https://npmjs.org/package/@oclif/core)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/main/package.json)

<!-- toc -->
* [🗒 Description](#-description)
* [🚀 Getting Started Tutorial](#-getting-started-tutorial)
* [✨ Features](#-features)
* [📌 Requirements](#-requirements)
* [📌 Migrating from V1](#-migrating-from-v1)
* [🏗 Usage](#-usage)
* [📚 Examples](#-examples)
* [🔨 Commands](#-commands)
* [🏭 Related Repositories](#-related-repositories)
* [🦔 Learn More](#-learn-more)
* [📣 Feedback](#-feedback)
<!-- tocstop -->

# 🗒 Description

This is a framework for building CLIs in Node.js. This framework was built out of the [Heroku CLI](https://cli.heroku.com) but generalized to build any custom CLI. It's designed both for single-file CLIs with a few flag options, or for very complex CLIs that have subcommands (like git or heroku).

[See the docs for more information](http://oclif.io/docs/introduction).

# 🚀 Getting Started Tutorial

The [Getting Started tutorial](http://oclif.io/docs/introduction) is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

# ✨ Features

* **Flag/Argument parsing** - No CLI framework would be complete without a flag parser. We've built a custom one from years of experimentation that we feel consistently handles user input flexible enough for the user to be able to use the CLI in ways they expect, but without compromising strictness guarantees to the developer.
* **Super Speed** - The overhead for running an oclif CLI command is almost nothing. [It requires very few dependencies](https://www.npmjs.com/package/@oclif/command?activeTab=dependencies) (only 35 dependencies in a minimal setup—including all transitive dependencies). Also, only the command to be executed will be required with node. So large CLIs with many commands will load equally as fast as a small one with a single command.
* **CLI Generator** - Run a single command to scaffold out a fully functional CLI and get started quickly. See [Usage](#-usage) below.
* **Testing Helpers** - We've put a lot of work into making commands easier to test and mock out stdout/stderr. The generator will automatically create [scaffolded tests](https://github.com/oclif/hello-world/blob/main/test/commands/hello.test.ts).
* **Auto-documentation** - By default you can pass `--help` to the CLI to get help such as flag options and argument information. This information is also automatically placed in the README whenever the npm package of the CLI is published. See the [multi-command CLI example](https://github.com/oclif/example-multi-ts)
* **Plugins** - Using [plugins](https://oclif.io/docs/plugins), users of the CLI can extend it with new functionality, a CLI can be split into modular components, and functionality can be shared amongst multiple CLIs. See [Building your own plugin](https://oclif.io/docs/plugins#building-your-own-plugin).
* **Hooks** - Use lifecycle hooks to run functionality any time a CLI starts, or on custom triggers. Use this whenever custom functionality needs to be shared between various components of the CLI.
* **TypeScript** - Everything in the core of oclif is written in TypeScript and the generator will build fully configured TypeScript CLIs. If you use plugins support, the CLI will automatically use `ts-node` to run the plugins enabling you to use TypeScript with minimal-to-no boilerplate needed for any oclif CLI.
* **Auto-updating Installers** - oclif can package your CLI into [different installers](https://oclif.io/docs/releasing) that will not require the user to already have node installed on the machine. These can be made auto-updatable by using [plugin-update](https://github.com/oclif/plugin-update).
* **Everything is Customizable** - Pretty much anything can be swapped out and replaced inside oclif if needed—including the arg/flag parser.
* **Autocomplete** - Automatically include autocomplete for your CLI. This includes not only command names and flag names, but flag values as well. For example, it's possible to configure the Heroku CLI to have completions for Heroku app names:

```
$ heroku info --app=<tab><tab> # will complete with all the Heroku apps a user has in their account
```

# 📌 Requirements

Currently, Node 12+ is supported. We support the [LTS versions](https://nodejs.org/en/about/releases) of Node. You can add the [node](https://www.npmjs.com/package/node) package to your CLI to ensure users are running a specific version of Node.

# 📌 Migrating from V1

If you have been using version 1 of the [`oclif` CLI](https://github.com/oclif/oclif/tree/v1.18.4) there are some important differences to note when using the latest version.

## Breaking Changes

- `oclif multi`, `oclif plugin`, and `oclif single` have all been removed in favor of `oclif generate`, which generates an oclif based CLI using the [hello-world example repo](https://github.com/oclif/hello-world).
  - The reason is that there's not enough of a meaningful difference between a "multi command cli", a "single command cli", and a "plugin" to justify the maintenance cost. The generated CLI can be easily used for any of those use cases.
- `oclif hook` is now `oclif generate:hook`
- `oclif command` is now `oclif generate:command`

## New Commands

Version 2 now includes all the commands from the [`oclif-dev` CLI](https://github.com/oclif/dev-cli). This means that you can now use a single CLI for all your oclif needs. These commands include:
- `oclif manifest`
- `oclif pack`
- `oclif pack:deb`
- `oclif pack:macos`
- `oclif pack:win`
- `oclif upload` (formerly known as `oclif-dev publish`)
- `oclif upload:deb` (formerly known as `oclif-dev publish:deb`)
- `oclif upload:macos` (formerly known as `oclif-dev publish:macos`)
- `oclif upload:win` (formerly known as `oclif-dev publish:win`)
- `oclif readme`


# 🏗 Usage

Creating a CLI:

```sh-session
$ npx oclif generate mynewcli
? npm package name (mynewcli): mynewcli
$ cd mynewcli
$ ./bin/run --version
mynewcli/0.0.0 darwin-x64 node-v9.5.0
$ ./bin/run --help
USAGE
  $ mynewcli [COMMAND]

COMMANDS
  hello
  help   display help for mynewcli

$ ./bin/run hello
hello world from ./src/hello.js!
```

# 📚 Examples

* [Hello-World](https://github.com/oclif/hello-world)
* [Salesforce CLI](https://github.com/salesforcecli/cli)
* [Heroku CLI](https://github.com/heroku/cli)

# 🔨 Commands

<!-- commands -->
* [`oclif generate NAME`](#oclif-generate-name)
* [`oclif generate command NAME`](#oclif-generate-command-name)
* [`oclif generate hook NAME`](#oclif-generate-hook-name)
* [`oclif help [COMMAND]`](#oclif-help-command)
* [`oclif manifest [PATH]`](#oclif-manifest-path)
* [`oclif pack deb`](#oclif-pack-deb)
* [`oclif pack macos`](#oclif-pack-macos)
* [`oclif pack tarballs`](#oclif-pack-tarballs)
* [`oclif pack win`](#oclif-pack-win)
* [`oclif promote`](#oclif-promote)
* [`oclif readme`](#oclif-readme)
* [`oclif upload deb`](#oclif-upload-deb)
* [`oclif upload macos`](#oclif-upload-macos)
* [`oclif upload tarballs`](#oclif-upload-tarballs)
* [`oclif upload win`](#oclif-upload-win)

## `oclif generate NAME`

generate a new CLI

```
USAGE
  $ oclif generate [NAME]

ARGUMENTS
  NAME  directory name of new project

DESCRIPTION
  generate a new CLI

  This will clone the template repo 'oclif/hello-world' and update package properties
```

_See code: [src/commands/generate.ts](https://github.com/oclif/oclif/blob/v2.6.2/src/commands/generate.ts)_

## `oclif generate command NAME`

add a command to an existing CLI or plugin

```
USAGE
  $ oclif generate command [NAME] [--force]

ARGUMENTS
  NAME  name of command

FLAGS
  --force  overwrite existing files

DESCRIPTION
  add a command to an existing CLI or plugin
```

## `oclif generate hook NAME`

add a hook to an existing CLI or plugin

```
USAGE
  $ oclif generate hook [NAME] [--force] [--event <value>]

ARGUMENTS
  NAME  name of hook (snake_case)

FLAGS
  --event=<value>  [default: init] event to run hook on
  --force          overwrite existing files

DESCRIPTION
  add a hook to an existing CLI or plugin
```

## `oclif help [COMMAND]`

Display help for oclif.

```
USAGE
  $ oclif help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for oclif.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.11/src/commands/help.ts)_

## `oclif manifest [PATH]`

generates plugin manifest json

```
USAGE
  $ oclif manifest [PATH]

ARGUMENTS
  PATH  [default: .] path to plugin

DESCRIPTION
  generates plugin manifest json
```

_See code: [src/commands/manifest.ts](https://github.com/oclif/oclif/blob/v2.6.2/src/commands/manifest.ts)_

## `oclif pack deb`

pack CLI into debian package

```
USAGE
  $ oclif pack deb -r <value> [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --tarball=<value>  optionally specify a path to a tarball already generated by NPM

DESCRIPTION
  pack CLI into debian package
```

## `oclif pack macos`

pack CLI into macOS .pkg

```
USAGE
  $ oclif pack macos -r <value> [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --tarball=<value>  optionally specify a path to a tarball already generated by NPM

DESCRIPTION
  pack CLI into macOS .pkg
```

## `oclif pack tarballs`

packages oclif CLI into tarballs

```
USAGE
  $ oclif pack tarballs -r <value> [-t <value>] [--xz] [-l <value>]

FLAGS
  -l, --tarball=<value>  optionally specify a path to a tarball already generated by NPM
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --targets=<value>  comma-separated targets to pack (e.g.: linux-arm,win32-x64)
  --[no-]xz              also build xz

DESCRIPTION
  packages oclif CLI into tarballs

  This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
```

## `oclif pack win`

create windows installer from oclif CLI

```
USAGE
  $ oclif pack win -r <value> [-t <value>]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --tarball=<value>  optionally specify a path to a tarball already generated by NPM

DESCRIPTION
  create windows installer from oclif CLI

  This command requires WINDOWS_SIGNING (prefixed with the name of your executable, e.g. OCLIF_WINDOWS_SIGNING_PASS) to
  be set in the environment
```

## `oclif promote`

promote CLI builds to a S3 release channel

```
USAGE
  $ oclif promote -r <value> --version <value> --sha <value> --channel <value> [-t <value>] [-d] [-m] [-w]
    [-a <value>] [--xz] [--indexes]

FLAGS
  -a, --max-age=<value>  [default: 86400] cache control max-age in seconds
  -d, --deb              promote debian artifacts
  -m, --macos            promote macOS pkg
  -r, --root=<value>     (required) [default: .] path to the oclif CLI project root
  -t, --targets=<value>  comma-separated targets to promote (e.g.: linux-arm,win32-x64)
  -w, --win              promote Windows exe
  --channel=<value>      (required) [default: stable] which channel to promote to
  --indexes              append the promoted urls into the index files
  --sha=<value>          (required) 7-digit short git commit SHA of the CLI to promote
  --version=<value>      (required) semantic version of the CLI to promote
  --[no-]xz              also upload xz

DESCRIPTION
  promote CLI builds to a S3 release channel
```

_See code: [src/commands/promote.ts](https://github.com/oclif/oclif/blob/v2.6.2/src/commands/promote.ts)_

## `oclif readme`

adds commands to README.md in current directory

```
USAGE
  $ oclif readme --dir <value> [--multi]

FLAGS
  --dir=<value>  (required) [default: docs] output directory for multi docs
  --multi        create a different markdown page for each topic

DESCRIPTION
  adds commands to README.md in current directory

  The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:

  # Usage

  <!-- usage -->

  # Commands

  <!-- commands -->

  Customize the code URL prefix by setting oclif.repositoryPrefix in package.json.
```

_See code: [src/commands/readme.ts](https://github.com/oclif/oclif/blob/v2.6.2/src/commands/readme.ts)_

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

## `oclif upload macos`

upload macos installers built with pack:macos

```
USAGE
  $ oclif upload macos -r <value>

FLAGS
  -r, --root=<value>  (required) [default: .] path to oclif CLI root

DESCRIPTION
  upload macos installers built with pack:macos
```

## `oclif upload tarballs`

upload an oclif CLI to S3

```
USAGE
  $ oclif upload tarballs -r <value> [-t <value>] [--xz]

FLAGS
  -r, --root=<value>     (required) [default: .] path to oclif CLI root
  -t, --targets=<value>  comma-separated targets to upload (e.g.: linux-arm,win32-x64)
  --[no-]xz              also upload xz

DESCRIPTION
  upload an oclif CLI to S3

  "aws-sdk" will need to be installed as a devDependency to upload.
```

## `oclif upload win`

upload windows installers built with pack:win

```
USAGE
  $ oclif upload win -r <value>

FLAGS
  -r, --root=<value>  (required) [default: .] path to oclif CLI root

DESCRIPTION
  upload windows installers built with pack:win
```
<!-- commandsstop -->

# 🏭 Related Repositories

* [@oclif/core](https://github.com/oclif/core) - Base library for oclif. This can be used directly without the generator.
* [@oclif/cli-ux](https://github.com/oclif/cli-ux) - Library for common CLI UI utilities.
* [@oclif/test](https://github.com/oclif/test) - Test helper for oclif.

# 🦔 Learn More

* [Salesforce Release Announcement](https://engineering.salesforce.com/open-sourcing-oclif-the-cli-framework-that-powers-our-clis-21fbda99d33a)
* [Heroku Release Announcement](https://blog.heroku.com/open-cli-framework)

# 📣 Feedback

If you have any suggestions or want to let us know what you think of oclif, send us a message at <alm-cli@salesforce.com>
