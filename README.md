<img src="https://user-images.githubusercontent.com/449385/38243295-e0a47d58-372e-11e8-9bc0-8c02a6f4d2ac.png" width="260" height="73">

# `oclif` CLI

[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![Downloads/week](https://img.shields.io/npm/dw/oclif.svg)](https://npmjs.org/package/oclif/oclif)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/main/package.json)

<!-- toc -->

- [`oclif` CLI](#oclif-cli)
- [🗒 Description](#-description)
- [🚀 Getting Started Tutorial](#-getting-started-tutorial)
- [📌 Requirements](#-requirements)
- [📌 Migrating from V1](#-migrating-from-v1)
- [🏗 Usage](#-usage)
- [📚 Examples](#-examples)
- [🔨 Commands](#-commands)
- [Command Topics](#command-topics)
- [🚀 Contributing](#-contributing)
- [🏭 Related Repositories](#-related-repositories)
- [🦔 Learn More](#-learn-more)
<!-- tocstop -->

# 🗒 Description

This is the `oclif` CLI for the [Open CLI Framework](https://github.com/oclif/core), that supports the development of oclif plugins and CLIs.

[See the docs for more information](https://oclif.io).

# 🚀 Getting Started Tutorial

The [Getting Started tutorial](https://oclif.io/docs/introduction) is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

See [Usage](#-usage) below for an overview of the `oclif` CLI.

# 📌 Requirements

Currently, Node 18+ is supported. We support the [LTS versions](https://nodejs.org/en/about/releases) of Node. You can add the [node](https://www.npmjs.com/package/node) package to your CLI to ensure users are running a specific version of Node.

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
$ ./bin/run.js --version
mynewcli/0.0.0 darwin-x64 node-v9.5.0
$ ./bin/run.js --help
USAGE
  $ mynewcli [COMMAND]

COMMANDS
  hello
  help   display help for mynewcli

$ ./bin/run.js hello world
hello world! (./src/commands/hello/world.ts)
```

# 📚 Examples

- [Hello-World](https://github.com/oclif/hello-world)
- [Salesforce CLI](https://github.com/salesforcecli/cli)
- [Heroku CLI](https://github.com/heroku/cli)

# 🔨 Commands

<!-- commands -->

# Command Topics

- [`oclif generate`](docs/generate.md) - Generate a new CLI
- [`oclif help`](docs/help.md) - Display help for oclif.
- [`oclif init`](docs/init.md) - Initialize a new oclif CLI
- [`oclif manifest`](docs/manifest.md) - Generates plugin manifest json (oclif.manifest.json).
- [`oclif pack`](docs/pack.md) - Package an oclif CLI into installable artifacts.
- [`oclif promote`](docs/promote.md) - Promote CLI builds to a S3 release channel.
- [`oclif readme`](docs/readme.md) - Adds commands to README.md in current directory.
- [`oclif upload`](docs/upload.md) - Upload installable CLI artifacts to AWS S3.

<!-- commandsstop -->

# 🚀 Contributing

See the [contributing guide](./CONTRIBUTING.md).

# 🏭 Related Repositories

- [@oclif/core](https://github.com/oclif/core) - Base library for oclif. This can be used directly without the generator.
- [@oclif/test](https://github.com/oclif/test) - Test helper for oclif.

# 🦔 Learn More

- [Salesforce Release Announcement](https://engineering.salesforce.com/open-sourcing-oclif-the-cli-framework-that-powers-our-clis-21fbda99d33a)
- [Heroku Release Announcement](https://blog.heroku.com/open-cli-framework)
