# oclif getting started tutorial

This tutorial is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

## Before you begin

oclif is written in Node. You'll need Node as well as npm, which is a package manager for Javascript and a software registry. 

If you do not have them already, follow the instructions here to install npm and Node together: https://docs.npmjs.com/getting-started/installing-node

## Creating Your First CLI with oclif

Now you're ready to create your first CLI with oclif. There are three stages: CLI creation, command development, and publishing to NPM. 

### CLI Creation

Let's start with the single-command CLI as that is the simplest. You can call your CLI anything you like by replacing “mynewcli” with a word of your choice. The name of your CLI can be anything you like as long as it meets the [npm restrictions](https://docs.npmjs.com/files/package.json#name). 

```sh-session
$ npx oclif single mynewcli
```

*npx is included in npm and automatically runs and installs the oclif generator. *

Alternatively, to setup without npx:

```sh-session
$ npm install -g oclif
$ oclif single mynewcli
```

You'll now see some questions asking you to describe various aspects of your CLI. Once you register your CLI with npm, these would feed into the listing for your CLI. For now, feel free to just leave these blanks and press “enter” for each one, which will set everything to default values. 

**? npm package name** *the name of the package as it will be listed on npm. *

? **command bin name the CLI will export:** *the word the user will type to invoke the cli, e.g., “heroku” in the case of the Heroku command line interface. You may use any word here but be careful about using a word that may conflict with commonly used command line terms such as grep. In the case of conflict, the terminal will use what is loaded in the path sooner. *

? **description** *this description is part of the npm package details. This description will stay local until you publish to npm*

? **author: ***The author is l**isted when you register your CLI on NPM*

? **version** *each time you publish a new version this number will automatically increment. *

? **license** *MIT License is set as default *

? **node version supported** *oclif may only support versions of Node greater than 8.0, which is the default set here*

? **github owner of repository (https://github.com/OWNER/repo)** *owner of the Github repo*

? **github name of repository (https://github.com/owner/REPO)** *name of the Github repo *

? **optional components to include** 

Next you'll be asked if you want to use mocha, typescript or semantic release. In this tutorial I'm going to use mocha as that is the simplest Javascript framework. 

When your CLI is ready, you'll see a message ending with the following: 

`Created mynewcli in /Users/nsamsami/mynewcli`

Your CLI has been created locally and the relevant code is in the mynewcli folder in your cur folder. You can go over there by running

```sh-session
$ cd mynewcli
```

For trying your cli locally,  “./bin/run” is the equivalent of the command “mynewcli”. You'll see placeholder output. 

```sh-session
$ ./bin/run
hello world from ./src/index.ts!
```

To run mynewcli instead of ./bin/run you'll need to publish your CLI locally using npm. 

```sh-session
$ npm install -g .
```

Now you can test your CLI by running mynewcli

```sh-session
$ mynewcli
hello world from /Users/nsamsami/mynewcli/src/index.ts
```

### Command Development

In this step you'll take control of the CLI command you have at your disposal. Open the ./src/index.ts fil in a text editor (such as Sublime or TextEdit) 

This index file is where the code for your commands lives. A basic command in js looks like this: 

```js
import {Command} from '@oclif/command'
export class MyCommand extends Command {
  static description = 'description of this example command'
  
  async run() {
    console.log('running my command')
  }
}
```

A basic flag in TypeScript looks like this: 

```js
import {Command, flags} from '@oclif/command'
export class MyCommand extends Command {
  static flags = {
    // add --version flag to show CLI version
    version: flags.version(),
    // add --help flag to show CLI version
    help: flags.help(),
    name: flags.string({char: 'n', description: 'name to print'}),
    location: flags.string({char: 'l', description: 'location to print'}),
  }
  async run() {
    console.log('running my command')
  }
}
```

You can add flags or arguments. 

For example, you can add a new flag that allows the user to set location.  


```js
const name = ` flags.name || 'world'`
const location = flags.location || 'location'`
```

### Publishing to npm

To publish to npm, just run:

```sh-session
$ npm publish
```

You'll need to [register with npm](https://www.npmjs.com/signup) and have verified your email address in order to publish. 

You'll also need to select a package name for your CLI that is not already in use. (Note: if you attempt to publish under an existing package name, npm will have restricted publishing to the user associated with that package, so you will see a permission error.) 

After you have published, anyone can install your CLI with the following:

```sh-session
$ npm install -g mynewcli
$ mynewcli --help
```
