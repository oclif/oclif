
<img src="https://user-images.githubusercontent.com/449385/38243295-e0a47d58-372e-11e8-9bc0-8c02a6f4d2ac.png" width="260" height="73">  


oclif: Node.JS Open CLI Framework
=================================

[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/oclif)
[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![CircleCI](https://circleci.com/gh/oclif/oclif/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/oclif/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/oclif?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/oclif/branch/master)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/command.svg)](https://npmjs.org/package/@oclif/command)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/master/package.json)

<!-- toc -->
* [🗒 Description](#-description)
* [🚀 Getting Started Tutorial](#-getting-started-tutorial)
* [✨ Features](#-features)
* [📌 Requirements](#-requirements)
* [🌈 CLI Types](#-cli-types)
* [🏗 Usage](#-usage)
* [📚 Examples](#-examples)
* [🔨 Commands](#-commands)
* [🏭 Related Repositories](#-related-repositories)
* [🦔 Learn More](#-learn-more)
* [📣 Feedback](#-feedback)
<!-- tocstop -->

# 🗒 Description

This is a framework for building CLIs in Node.js. This framework was built out of the [Heroku CLI](https://cli.heroku.com) but generalized to build any custom CLI. It's designed both for simple CLIs that can be just a single file with a few flag options, or for very complex CLIs that have subcommands (like git or heroku).

[See the docs for more information](http://oclif.io/docs/introduction).

# 🚀 Getting Started Tutorial

The [Getting Started tutorial](http://oclif.io/docs/introduction) is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

# ✨ Features

* **Flag/Argument parsing** - No CLI framework would be complete without a flag parser. We've built a custom one from years of experimentation that we feel consistently handles user input flexible enough for the user to be able to easily use the CLI in ways they expect, but without comprisiming strictness guarantees to the developer.
* **Super Speed** - The overhead for running an oclif CLI command is almost nothing. [It requires very few dependencies](https://www.npmjs.com/package/@oclif/command?activeTab=dependencies) (only 35 dependencies in a minimal setup—including all transitive dependencies). Also, only the command to be executed will be required with node. So large CLIs with many commands will load just as fast as a small one with a single command.
* **CLI Generator** - Run a single command to scaffold out a fully functional CLI and get started quickly. See [Usage](#-usage) below.
* **Testing Helpers** - We've put a lot of work into making commands easily testable and easy to mock out stdout/stderr. The generator will automatically create [scaffolded tests](https://github.com/oclif/example-multi-ts/blob/master/test/commands/hello.test.ts).
* **Auto-documentation** - By default you can pass `--help` to the CLI to get help such as flag options and argument information. This information is also automatically placed in the README whenever the npm package of the CLI is published. See the [multi-command CLI example](https://github.com/oclif/example-multi-ts)
* **Plugins** - Using [plugins](https://oclif.io/docs/plugins), users of the CLI can extend it with new functionality, a CLI can be split into modular components, and functionality can be shared amongst multiple CLIs. See [Building your own plugin](https://oclif.io/docs/plugins#building-your-own-plugin).
* **Hooks** - Use lifecycle hooks to run functionality any time a CLI starts, or on custom triggers. Use this whenever custom functionality needs to be shared between various components of the CLI.
* **TypeScript (or not)** - Everything in the core of oclif is written in TypeScript and the generator can build fully configured TypeScript CLIs or just plain JavaScript CLIs. By virtue of static properties in TypeScript the syntax is a bit cleaner in TypeScript—but everything will work no matter which language you choose. If you use plugins support, the CLI will automatically use `ts-node` to run the plugins making it easy and fast to use TypeScript with minimal-to-no boilerplate needed for any oclif CLI.
* **Auto-updating Installers** - oclif can package your CLI into [different installers](https://oclif.io/docs/releasing) that will not require the user to already have node installed on the machine. These can be made auto-updatable by using [plugin-update](https://github.com/oclif/plugin-update).
* **Everything is Customizable** - Pretty much anything can be swapped out and replaced inside oclif if needed—including the arg/flag parser.
* **Autocomplete** - Automatically include autocomplete for your CLI. This includes not just command names and flag names, but flag values as well. For example, it's easy to configure the Heroku CLI to have completions for Heroku app names:
<!--* **Coming soon: man pages** - In addition to in-CLI help through `-help` and the README markdown help generation, the CLI can also automatically create man pages for all of its commands.-->

```
$ heroku info --app=<tab><tab> # will complete with all the Heroku apps a user has in their account
```

# 📌 Requirements

Currently, Node 8+ is supported. We support the [LTS versions](https://nodejs.org/en/about/releases) of Node. You can add the [node](https://www.npmjs.com/package/node) package to your CLI to ensure users are running a specific version of Node.

# 🌈 CLI Types

With oclif you can create 2 different CLI types, single and multi.

Single CLIs are like `ls` or `cat`. They can accept arguments and flags. Single CLIs can [optionally be just be a single file](https://github.com/oclif/command).

Multi CLIs are like `git` or `heroku`. They have subcommands that are themselves single CLIs. In the `package.json` there is a field `oclif.commands` that points to a directory. This directory contains all the subcommands for the CLI. For example, if you had a CLI called `mycli` with the commands `mycli create` and `mycli destroy`, you would have a project like the following:

```
package.json
src/
└── commands/
    ├── create.ts
    └── destroy.ts
```

Multi-command CLIs may also include [plugins](https://oclif.io/docs/plugins).

# 🏗 Usage

Creating a single-command CLI:

```sh-session
$ npx oclif single mynewcli
? npm package name (mynewcli): mynewcli
$ cd mynewcli
$ ./bin/run
hello world from ./src/index.js!
```

Creating a multi-command CLI:

```sh-session
$ npx oclif multi mynewcli
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

* TypeScript
  * [Multi-command CLI](https://github.com/oclif/example-multi-ts)
  * [Single-command CLI](https://github.com/oclif/example-single-ts)
  * [Multi-command CLI Plugin](https://github.com/oclif/example-plugin-ts)
* JavaScript
  * [Multi-command CLI](https://github.com/oclif/example-multi-js)
  * [Single-command CLI](https://github.com/oclif/example-single-js)
  * [Multi-command CLI Plugin](https://github.com/oclif/example-plugin-js)

# 🔨 Commands

<!-- commands -->
* [`oclif command NAME`](#oclif-command-name)
* [`oclif help [COMMAND]`](#oclif-help-command)
* [`oclif hook NAME`](#oclif-hook-name)
* [`oclif multi [PATH]`](#oclif-multi-path)
* [`oclif plugin [PATH]`](#oclif-plugin-path)
* [`oclif single [PATH]`](#oclif-single-path)

## `oclif command NAME`

add a command to an existing CLI or plugin

```
USAGE
  $ oclif command NAME

ARGUMENTS
  NAME  name of command

OPTIONS
  --defaults  use defaults for every setting
  --force     overwrite existing files
```

_See code: [src/commands/command.ts](https://github.com/oclif/oclif/blob/v1.13.6/src/commands/command.ts)_

## `oclif help [COMMAND]`

display help for oclif

```
USAGE
  $ oclif help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_

## `oclif hook NAME`

add a hook to an existing CLI or plugin

```
USAGE
  $ oclif hook NAME

ARGUMENTS
  NAME  name of hook (snake_case)

OPTIONS
  --defaults     use defaults for every setting
  --event=event  [default: init] event to run hook on
  --force        overwrite existing files
```

_See code: [src/commands/hook.ts](https://github.com/oclif/oclif/blob/v1.13.6/src/commands/hook.ts)_

## `oclif multi [PATH]`

generate a new multi-command CLI

```
USAGE
  $ oclif multi [PATH]

ARGUMENTS
  PATH  path to project, defaults to current directory

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (yarn|typescript|tslint|mocha)
```

_See code: [src/commands/multi.ts](https://github.com/oclif/oclif/blob/v1.13.6/src/commands/multi.ts)_

## `oclif plugin [PATH]`

create a new CLI plugin

```
USAGE
  $ oclif plugin [PATH]

ARGUMENTS
  PATH  path to project, defaults to current directory

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (yarn|typescript|tslint|mocha)
```

_See code: [src/commands/plugin.ts](https://github.com/oclif/oclif/blob/v1.13.6/src/commands/plugin.ts)_

## `oclif single [PATH]`

generate a new single-command CLI

```
USAGE
  $ oclif single [PATH]

ARGUMENTS
  PATH  path to project, defaults to current directory

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (yarn|typescript|tslint|mocha)
```

_See code: [src/commands/single.ts](https://github.com/oclif/oclif/blob/v1.13.6/src/commands/single.ts)_
<!-- commandsstop -->

# 🏭 Related Repositories

* [@oclif/command](https://github.com/oclif/command) - Base command for oclif. This can be used directly without the generator.
* [@oclif/config](https://github.com/oclif/config) - Most of the core setup for oclif lives here.
* [@oclif/errors](https://github.com/oclif/errors) - Renders and logs errors from commands.
* [@oclif/cli-ux](https://github.com/oclif/cli-ux) - Library for common CLI UI utilities.
* [@oclif/test](https://github.com/oclif/test) - Test helper for oclif.

# 🦔 Learn More

* [Salesforce Release Announcement](https://engineering.salesforce.com/open-sourcing-oclif-the-cli-framework-that-powers-our-clis-21fbda99d33a)
* [Heroku Release Announcement](https://blog.heroku.com/open-cli-framework)

# 📣 Feedback

If you have any suggestions or just want to let us know what you think of oclif, send us a message at <heroku-cli@salesforce.com>
