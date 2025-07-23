# `oclif generate`

Generate a new CLI

- [`oclif generate NAME`](#oclif-generate-name)
- [`oclif generate command NAME`](#oclif-generate-command-name)
- [`oclif generate hook NAME`](#oclif-generate-hook-name)

## `oclif generate NAME`

Generate a new CLI

```
USAGE
  $ oclif generate NAME [--author <value>] [--bin <value>] [--description <value>] [--license <value>]
    [--module-type CommonJS|ESM] [--name <value>] [--owner <value>] [--package-manager npm|yarn|pnpm] [--repository
    <value>] [-n] [-d <value>] [-y]

ARGUMENTS
  NAME  Directory name of new project.

FLAGS
  -d, --output-dir=<value>        Directory to build the CLI in.
  -n, --dry-run                   Print the files that would be created without actually creating them.
  -y, --yes                       Use defaults for all prompts. Individual flags will override defaults.
      --author=<value>            Supply answer for prompt: Author
      --bin=<value>               Supply answer for prompt: Command bin name the CLI will export
      --description=<value>       Supply answer for prompt: Description
      --license=<value>           Supply answer for prompt: License
      --module-type=<option>      Supply answer for prompt: Select a module type
                                  <options: CommonJS|ESM>
      --name=<value>              Supply answer for prompt: NPM package name
      --owner=<value>             Supply answer for prompt: Who is the GitHub owner of repository
                                  (https://github.com/OWNER/repo)
      --package-manager=<option>  Supply answer for prompt: Select a package manager
                                  <options: npm|yarn|pnpm>
      --repository=<value>        Supply answer for prompt: What is the GitHub name of repository
                                  (https://github.com/owner/REPO)

DESCRIPTION
  Generate a new CLI

  This will generate a fully functional oclif CLI that you can build on. It will prompt you for all the necessary
  information to get started. If you want to skip the prompts, you can pass the --yes flag to accept the defaults for
  all prompts. You can also pass individual flags to set specific values for prompts.

  Head to oclif.io/docs/introduction to learn more about building CLIs with oclif.

EXAMPLES
  Generate a new CLI with prompts for all properties

    $ oclif generate my-cli

  Automatically accept default values for all prompts

    $ oclif generate my-cli --yes

  Supply answers for specific prompts

    $ oclif generate my-cli --module-type CommonJS --author "John Doe"

  Supply answers for specific prompts and accept default values for the rest

    $ oclif generate my-cli --module-type CommonJS --author "John Doe" --yes
```

_See code: [src/commands/generate.ts](https://github.com/oclif/oclif/blob/4.22.1/src/commands/generate.ts)_

## `oclif generate command NAME`

Add a command to an existing CLI or plugin.

```
USAGE
  $ oclif generate command NAME [--commands-dir <value>] [--force]

ARGUMENTS
  NAME  name of command

FLAGS
  --commands-dir=<value>  [default: src/commands] The directory to create the command in.
  --force                 Overwrite existing files.

DESCRIPTION
  Add a command to an existing CLI or plugin.
```

_See code: [src/commands/generate/command.ts](https://github.com/oclif/oclif/blob/4.22.1/src/commands/generate/command.ts)_

## `oclif generate hook NAME`

Add a hook to an existing CLI or plugin.

```
USAGE
  $ oclif generate hook NAME [--event <value>] [--force]

ARGUMENTS
  NAME  Name of hook (snake_case).

FLAGS
  --event=<value>  [default: init] Event to run hook on.
  --force          Overwrite existing files.

DESCRIPTION
  Add a hook to an existing CLI or plugin.
```

_See code: [src/commands/generate/hook.ts](https://github.com/oclif/oclif/blob/4.22.1/src/commands/generate/hook.ts)_
