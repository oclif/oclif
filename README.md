oclif: Open CLI Framework
=========================

Create your own CLI

[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![CircleCI](https://circleci.com/gh/oclif/oclif/tree/master.svg?style=svg)](https://circleci.com/gh/oclif/oclif/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/oclif?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/oclif/branch/master)
[![Codecov](https://codecov.io/gh/oclif/oclif/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/oclif)
[![Greenkeeper](https://badges.greenkeeper.io/oclif/oclif.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/npm/oclif/badge.svg)](https://snyk.io/test/npm/oclif)
[![Downloads/week](https://img.shields.io/npm/dw/oclif.svg)](https://npmjs.org/package/oclif)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/master/package.json)

<!-- toc -->
* [Description](#description)
* [Features](#features)
* [Install](#install)
* [Usage](#usage)
* [Commands](#commands)
* [Examples](#examples)
* [Plugins](#plugins)
* [Building your own plugin](#buildingyourownplugin)
<!-- tocstop -->

# Description

This is a framework for building CLIs in Node.js. This framework was built out of the [Heroku CLI](https://cli.heroku.com) but generalized to build any custom CLI. It's designed both for simple CLIs that can be just a single file with a few flag options, or for very complex CLIs that have many commands (like git or heroku).

Most CLI tools for Node are simple flag parsers but oclif is much more than that—though without the overhead of making simple CLIs quick to write with minimal boilerplate.

# Features

* **Flag/Argument parsing** - No CLI framework would be complete without a flag parser. We've built a custom one from years of experimentation that we feel consistently handles user input flexible enough for the user to be able to easily use the CLI in ways they expect, but without comprisiming strictness guarantees to the developer.
* **CLI Generator** - Run a single command to scaffold out a fully functional CLI and get started quickly. See [Usage](#usage) below.
* **Auto-documentation** - By default you can pass `--help` to the CLI to get help such as flag options and argument information. This information is also automatically placed in the README whenever the npm package of the CLI is published. See the [multi-command CLI example](https://github.com/oclif/example-multi-ts)
* **Advanced plugin capabilility** - Using plugins, users of the CLI can extend it with new functionality, a CLI can be split into modular components, and functionality can be shared amongst multiple CLIs. See [Building your own plugin](#buildingyourownplugin) below.
* **Hooks** - Use lifecycle hooks to run functionality any time a CLI starts, or on custom triggers. Use this whenever custom functionality needs to be shared between various components of the CLI.
* **TypeScript (or not)** - Everything in the core of oclif is written in TypeScript and the generator can build fully configured TypeScript CLIs or just plain JavaScript CLIs. By virtue of static properties in TypeScript the syntax is a bit cleaner in TypeScript—but everything will work no matter which language you choose. If you use plugins support, the CLI will automatically use `ts-node` to run the plugins making it easy and fast to use TypeScript with minimal-to-no boilerplate needed for any oclif CLI.
* **Coming soon: Autocomplete** - Automatically include autocomplete for your CLI. This includes not just command names and flag names, but flag values as well. For example, it's easy to configure the Heroku CLI to have completions for Heroku app names:

```
$ heroku info --app=<tab><tab> # will complete with all the Heroku apps a user has in their account
```

<!-- install -->
# Install

with yarn:
```
$ yarn global add oclif
```

or with npm:
```
$ npm install -g oclif
```
<!-- installstop -->
<!-- usage -->
# Usage

```sh-session
$ oclif COMMAND
running command...
$ oclif (-v|--version|version)
oclif/1.2.4 (linux-x64) node-v9.5.0
$ oclif --help [COMMAND]
USAGE
  $ oclif COMMAND [OPTIONS]
...
```
<!-- usagestop -->
<!-- commands -->
# Commands

* [oclif command NAME [OPTIONS]](#command)
* [oclif help [COMMAND] [OPTIONS]](#help)
* [oclif multi [PATH] [OPTIONS]](#multi)
* [oclif plugin [PATH] [OPTIONS]](#plugin)
* [oclif single [PATH] [OPTIONS]](#single)
## command NAME [OPTIONS]

add a command to an existing CLI or plugin

```
USAGE
  $ oclif command NAME [OPTIONS]

ARGUMENTS
  NAME  name of command

OPTIONS
  --defaults  use defaults for every setting
  --force     overwrite existing files
```

_See code: [src/commands/command.ts](https://github.com/oclif/cli/blob/v1.2.4/src/commands/command.ts)_

## help [COMMAND] [OPTIONS]

display help for oclif

```
USAGE
  $ oclif help [COMMAND] [OPTIONS]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.0.1/src/commands/help.ts)_

## multi [PATH] [OPTIONS]

generate a new multi-command CLI

```
USAGE
  $ oclif multi [PATH] [OPTIONS]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/multi.ts](https://github.com/oclif/cli/blob/v1.2.4/src/commands/multi.ts)_

## plugin [PATH] [OPTIONS]

create a new CLI plugin

```
USAGE
  $ oclif plugin [PATH] [OPTIONS]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/plugin.ts](https://github.com/oclif/cli/blob/v1.2.4/src/commands/plugin.ts)_

## single [PATH] [OPTIONS]

generate a new single-command CLI

```
USAGE
  $ oclif single [PATH] [OPTIONS]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/single.ts](https://github.com/oclif/cli/blob/v1.2.4/src/commands/single.ts)_
<!-- commandsstop -->

# Examples

* [Multi-command CLI (typescript)](https://github.com/oclif/example-multi-ts)
* [Multi-command CLI (javascript)](https://github.com/oclif/example-multi-js)
* [Single-command CLI (typescript)](https://github.com/oclif/example-single-ts)
* [Single-command CLI (javascript)](https://github.com/oclif/example-single-js)
* [Multi-command CLI Plugin (typescript)](https://github.com/oclif/example-single-ts)
* [Multi-command CLI Plugin (javascript)](https://github.com/oclif/example-plugin-js)

# Plugins

* [@oclif/not-found](https://github.com/oclif/not-found) - Display a friendly "did you mean" message if a command is not found.
* [@oclif/plugins](https://github.com/oclif/plugins) - Allow users to add plugins to extend your CLI.
* [@oclif/update](https://github.com/oclif/update) - Add autoupdate support to the CLI.
* [TODO: @oclif/autocomplete](https://github.com/oclif/autocomplete) - Add bash/zsh autocomplete.

# Building your own plugin

Writing code for plugins is essentially the same as writing within a CLI. They can export 3 different types: commands, hooks, and other plugins.

Run `npx oclif plugin mynewplugin` to create a plugin in a new directory. This will come with a sample command called `hello`.
