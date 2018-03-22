# oclif getting started tutorial

This tutorial is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

## Before you begin

oclif is written in Node. You'll need Node as well as npm, which is a package manager for Javascript and a software registry. 

If you do not have them already, follow the instructions here to install npm and Node together: https://docs.npmjs.com/getting-started/installing-node

## Creating Your First CLI with oclif

Now you're ready to create your first CLI with oclif. There are three stages: CLI creation, command development, and publishing to NPM. 

### CLI Creation

Let's start with a multi-command CLI. You can call your CLI anything you like by replacing `mynewcli` with a name of your choice. The name of your CLI can be anything you like as long as it meets the [npm restrictions](https://docs.npmjs.com/files/package.json#name). 

```sh-session
$ npx oclif multi mynewcli
```

*npx is included in npm and automatically runs and installs the oclif generator.*

Alternatively, to setup without npx:

```sh-session
$ npm install -g oclif
$ oclif multi mynewcli
```

You'll now see some questions asking you to describe various aspects of your CLI. Once you register your CLI with npm, these would feed into the listing for your CLI. For now, feel free to just use the defaults for each option.

For reference, here are the options and what they do:

* **npm package name** the name of the package as it will be listed on npm.
* **command bin name the CLI will export:** the word the user will type to invoke the cli, e.g., “heroku” in the case of the Heroku command line interface. You may use any word here but be careful about using a word that may conflict with commonly used command line terms such as grep. In the case of conflict, the terminal will use what is loaded in the path sooner.
* **description** this description is part of the npm package details. This description will stay local until you publish to npm
* **author: The author is listed when you register your CLI on NPM
* **version** each time you publish a new version this number will automatically increment.
* **license** MIT License is set as default
* **node version supported** *oclif only supports versions of Node greater than 8.0, which is the default set here
* **github owner of repository (https://github.com/OWNER/repo)** owner of the Github repo
* **github name of repository (https://github.com/owner/REPO)** name of the Github repo

When your CLI is ready, you'll see a message ending with the following: 

```
Created mynewcli in /Users/nsamsami/mynewcli
```

Your CLI has been created locally and the relevant code is in the `mynewcli` directory. You can go over there by running:

```sh-session
$ cd mynewcli
```

For trying your CLI locally, `$ ./bin/run` is the equivalent of the command `$ mynewcli` when users install your CLI. You can now run the CLI which includes one "hello world" command:

```sh-session
$ ./bin/run hello
hello world from ./src/commands/hello.ts!
$ ./bin/run help
USAGE
  $ mynewcli [COMMAND]

COMMANDS
  hello  describe the command here
  help   display help for mynewcli
$ ./bin/run help hello
describe the command here

USAGE
  $ mynewcli hello [FILE]

OPTIONS
  -f, --force
  -n, --name=name  name to print

EXAMPLES
  $ example-multi-ts hello
  hello world from ./src/hello.ts!
```

To run `$ mynewcli` instead of `$ ./bin/run` you'll need to link your CLI locally using npm:

```sh-session
$ npm link
$ mynewcli
USAGE
...
```

### Command Development

Create a new command called "goodbye" either by moving `./src/commands/hello.ts` to `./src/commands/goodbye.ts` or by running the command generator with `npx oclif command goodbye`. Open `./src/commands/goodbye.ts` and replace it with the following

```js
import {Command} from '@oclif/command'
export class GoodbyeCommand extends Command {
  async run() {
    console.log('goodbye, world!')
  }
}
```

<!-- TODO: link to command API reference -->

### Publishing to npm

When you're ready to release your CLI, simply publish to npm:

```sh-session
$ npm publish
$ npm install -g mynewcli
$ mynewcli
# OR
$ npx mynewcli
```

*You'll need to [register with npm](https://www.npmjs.com/signup) and have verified your email address in order to publish.*
*You'll also need to select a package name for your CLI that is not already in use. (Note: if you attempt to publish under an existing package name, npm will have restricted publishing to the user associated with that package, so you will see a permission error.)*
