# `oclif init`

Initialize a new oclif CLI

- [`oclif init`](#oclif-init)

## `oclif init`

Initialize a new oclif CLI

```
USAGE
  $ oclif init [--bin <value>] [--module-type ESM|CommonJS] [--package-manager npm|yarn|pnpm]
    [--topic-separator colons|spaces] [-d <value>] [-y]

FLAGS
  -d, --output-dir=<value>        Directory to initialize the CLI in.
  -y, --yes                       Use defaults for all prompts. Individual flags will override defaults.
      --bin=<value>               Supply answer for prompt: Command bin name the CLI will export
      --module-type=<option>      Supply answer for prompt: Select a module type
                                  <options: ESM|CommonJS>
      --package-manager=<option>  Supply answer for prompt: Select a package manager
                                  <options: npm|yarn|pnpm>
      --topic-separator=<option>  Supply answer for prompt: Select a topic separator
                                  <options: colons|spaces>

DESCRIPTION
  Initialize a new oclif CLI

  This will add the necessary oclif bin files, add oclif config to package.json, and install @oclif/core and ts-node.

EXAMPLES
  Initialize a new CLI in the current directory

    $ oclif init

  Initialize a new CLI in a different directory

    $ oclif init --output-dir "/path/to/existing/project"

  Supply answers for specific prompts

    $ oclif init --topic-separator colons --bin mycli
```

_See code: [src/commands/init.ts](https://github.com/oclif/oclif/blob/4.17.15/src/commands/init.ts)_
