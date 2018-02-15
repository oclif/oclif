oclif: Open CLI Framework
=========================

[![Join the chat at https://gitter.im/oclif/oclif](https://badges.gitter.im/oclif/oclif.svg)](https://gitter.im/oclif/oclif?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Create your own CLI

[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![CircleCI](https://circleci.com/gh/oclif/oclif/tree/master.svg?style=svg)](https://circleci.com/gh/oclif/oclif/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/oclif?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/oclif/branch/master)
[![Codecov](https://codecov.io/gh/oclif/oclif/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/oclif)
[![Greenkeeper](https://badges.greenkeeper.io/oclif/oclif.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/oclif/oclif/badge.svg)](https://snyk.io/test/github/oclif/oclif)
[![Downloads/week](https://img.shields.io/npm/dw/oclif.svg)](https://npmjs.org/package/oclif)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/master/package.json)

<!-- toc -->
* [Description](#description)
* [Features](#features)
* [Requirements](#requirements)
* [Install](#install)
* [CLI Types](#cli-types)
* [Usage](#usage)
* [Command Options](#command-options)
* [Examples](#examples)
* [Topics](#topics)
* [Plugins](#plugins)
* [Building your own plugin](#building-your-own-plugin)
* [Commands](#commands)
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
* **Coming soon: man pages** - In addition to in-CLI help through `--help` and the README markdown help generation, the CLI can also automatically create man pages for all of its commands.

```
$ heroku info --app=<tab><tab> # will complete with all the Heroku apps a user has in their account
```

# Requirements

Only Node 8+ is supported. Node 6 will be out of LTS in April of 2019 and we will not support it ever. At that point we will continue to support the current LTS version of node.

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

# CLI Types

With oclif you can create 2 different CLI types, single and multi.

Single CLIs are like `ls` or `cat`. They can accept arguments and flags. Single CLIs can optionally be just be a single file.

Multi CLIs are like `git` or `heroku`. They have subcommands that are themselves single CLI commands. In the `package.json` there is a field `oclif.commands` that points to a directory. This directory contains all the subcommands for the CLI. For example, if you wanted a CLI called `mycli` with the commands `mycli create` and `mycli destroy`, you would have a project like the following:

```
package.json
src/
└── commands
    ├── create.ts
    └── destroy.ts
```

Multi-command CLIs may also include [plugins](#plugins).

See below for information on [nesting commands within topics](#topics).

# Usage

Creating a single-command CLI:

```sh-session
$ oclif single mynewcli
? npm package name (mynewcli): mynewcli
$ cd mynewcli
$ ./bin/run
hello world from ./src/index.js!
```

Creating a multi-command CLI:

```sh-session
$ oclif multi mynewcli
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

# Command Options

A basic command looks like the following:

```js
import Command from '@oclif/command'

export default class extends Command {
  static description = 'description of this example command'

  async run() {
    console.log('running my command')
  }
}
```

The only part that is required is the run function. Accept user input with arguments and flag options.

## Arguments

Arguments are positional arguments passed to the command. For example, if this command was run with `mycli arg1 arg2` it would be declared like this:

```js
import Command from '@oclif/command'

export class MyCLI extends Command {
  static args = [
    {name: 'firstArg'},
    {name: 'secondArg'},
  ]

  async run() {
    // can get args as an object
    const {args} = this.parse(MyCLI)
    console.log(`running my command with args: ${args.firstArg}, ${args.secondArg}`)
    // can also get the args as an array
    const {argv} = this.parse(MyCLI)
    console.log(`running my command with args: ${argv[0]}, ${argv[1]}`)
  }
}
```

Here are the options arguments can have:
```js
static args = [
  {
    name: 'file',                  // name of arg to show in help and reference with args[name]
    required: false,               // make the arg required with `required: true`
    description: 'file to output', // help description
    // hidden: true,               // hide this flag from help
    // parse: input => 'output',   // instead of the user input, return a differnt value
    // default: 'world',           // default value if no arg input
    // options: ['a', 'b'],        // only allow input to be from a discrete set
  }
]
```

## Flag Options

Flag options are non-positional arguments passed to the command. For example, if this command was run with `mycli --force --output=./myfile` (= is optional) it would be declared like this:

```js
import Command, {flags} from '@oclif/command'

export class MyCLI extends Command {
  static flags = {
    // can pass either --force or -f
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
  }

  async run() {
    const {flags} = this.parse(MyCLI)
    if (flags.force) console.log('--force is set')
    if (flags.file) console.log(`--file is: ${flags.file}`)
  }
}
```

Here are the options flags can have:

```js
static flags = [
  name: flags.string({
    char: 'n',                    // shorter flag version
    description: 'name to print', // help description for flag
    hidden: false,                // hide from help
    multiple: false,              // allow setting this flag multiple times
    // options: ['a', 'b'],       // only allow the value to be from a discrete set
    // parse: input => 'output',  // instead of the user input, return a differnt value
    // default: 'world',          // default value if flag not passed
    // required: false,           // make flag required (this is not common and you should probably use an argument instead)
  }),

  // flag with no value (-f, --force)
  force: flags.boolean({
    char: 'f',
    // by default boolean flags may also be reversed with `--no-` (in this case: `--no-force`)
    // the flag will be set to false if reversed
    // set this to false to disable this functionality
    // allowNo: false,
  }),
]
```

# Examples

* [Multi-command CLI (typescript)](https://github.com/oclif/example-multi-ts)
* [Multi-command CLI (javascript)](https://github.com/oclif/example-multi-js)
* [Single-command CLI (typescript)](https://github.com/oclif/example-single-ts)
* [Single-command CLI (javascript)](https://github.com/oclif/example-single-js)
* [Multi-command CLI Plugin (typescript)](https://github.com/oclif/example-single-ts)
* [Multi-command CLI Plugin (javascript)](https://github.com/oclif/example-plugin-js)

# Topics

As CLIs grow it can be useful to nest commands within topics. This is supported simply by placing commands in subdirectories. For example, with the Heroku CLI we have a topic `heroku config` with commands like `heroku config`, `heroku config:set` and `heroku config:get`. The directory structure looks like this:

```
package.json
src/
└── commands
    └── config
        ├── index.ts
        ├── set.ts
        └── get.ts
```

# Plugins

* [@oclif/not-found](https://github.com/oclif/not-found) - Display a friendly "did you mean" message if a command is not found.
* [@oclif/plugins](https://github.com/oclif/plugins) - Allow users to add plugins to extend your CLI.
* [@oclif/update](https://github.com/oclif/update) - Add autoupdate support to the CLI.
* [TODO: @oclif/autocomplete](https://github.com/oclif/autocomplete) - Add bash/zsh autocomplete.

# Building your own plugin

Writing code for plugins is essentially the same as writing within a CLI. They can export 3 different types: commands, hooks, and other plugins.

Run `npx oclif plugin mynewplugin` to create a plugin in a new directory. This will come with a sample command called `hello`.

<!-- commands -->
# Commands

* [oclif command NAME](#command)
* [oclif help [COMMAND]](#help)
* [oclif multi [PATH]](#multi)
* [oclif plugin [PATH]](#plugin)
* [oclif single [PATH]](#single)
## command NAME

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

_See code: [src/commands/command.ts](https://github.com/oclif/cli/blob/v1.2.9/src/commands/command.ts)_

## help [COMMAND]

display help for oclif

```
USAGE
  $ oclif help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.0.2/src/commands/help.ts)_

## multi [PATH]

generate a new multi-command CLI

```
USAGE
  $ oclif multi [PATH]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/multi.ts](https://github.com/oclif/cli/blob/v1.2.9/src/commands/multi.ts)_

## plugin [PATH]

create a new CLI plugin

```
USAGE
  $ oclif plugin [PATH]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/plugin.ts](https://github.com/oclif/cli/blob/v1.2.9/src/commands/plugin.ts)_

## single [PATH]

generate a new single-command CLI

```
USAGE
  $ oclif single [PATH]

OPTIONS
  --defaults         use defaults for every setting
  --force            overwrite existing files
  --options=options  (typescript|semantic-release|mocha)
```

_See code: [src/commands/single.ts](https://github.com/oclif/cli/blob/v1.2.9/src/commands/single.ts)_
<!-- commandsstop -->
