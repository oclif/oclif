/* eslint-disable unicorn/no-await-expression-member */
import {Errors, Flags} from '@oclif/core'
import chalk from 'chalk'
import {accessSync} from 'node:fs'
import {constants, readdir, writeFile} from 'node:fs/promises'
import {join, resolve, sep} from 'node:path'

import {FlaggablePrompt, GeneratorCommand, exec, makeFlags, readPJSON} from '../generator'
import {validateBin} from '../util'

const validModuleTypes = ['ESM', 'CommonJS']
const validPackageManagers = ['npm', 'yarn', 'pnpm']

const FLAGGABLE_PROMPTS = {
  bin: {
    message: 'Command bin name the CLI will export',
    validate: (d: string) => validateBin(d) || 'Invalid bin name',
  },
  'output-dir': {
    message: 'Directory to build the CLI in',
    validate(d: string) {
      try {
        accessSync(resolve(d), constants.X_OK)
        return true
      } catch {
        return false
      }
    },
  },
  'package-manager': {
    message: 'Select a package manager',
    options: validPackageManagers,
    validate: (d: string) => validPackageManagers.includes(d) || 'Invalid package manager',
  },
} satisfies Record<string, FlaggablePrompt>

export default class Generate extends GeneratorCommand<typeof Generate> {
  static description =
    'This will add the necessary oclif bin files, add oclif config to package.json, and install @oclif/core if needed.'

  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %>',
      description: 'Initialize a new CLI in the current directory with auto-detected module type and package manager',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --output-dir "/path/to/existing/project"',
      description: 'Initialize a new CLI in a different directory',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --module-type "ESM" --package-manager "npm"',
      description: 'Supply answers for specific prompts',
    },
  ]

  static flaggablePrompts = FLAGGABLE_PROMPTS

  static flags = {
    ...makeFlags(FLAGGABLE_PROMPTS),
    'module-type': Flags.option({
      options: validModuleTypes,
    })({}),
  }

  static summary = 'Initialize a new oclif CLI'

  async run(): Promise<void> {
    const outputDir = await this.getFlagOrPrompt({defaultValue: './', name: 'output-dir', type: 'input'})
    const location = resolve(outputDir)

    this.log(`Initializing oclif in ${chalk.green(location)}`)

    const packageJSON = (await readPJSON(location))!
    if (!packageJSON) {
      throw new Errors.CLIError(`Could not find a package.json file in ${location}`)
    }

    const bin = await this.getFlagOrPrompt({
      defaultValue: location.split(sep).at(-1) || '',
      name: 'bin',
      type: 'input',
    })

    let moduleType = this.flags['module-type']
    if (!moduleType || !validModuleTypes.includes(moduleType)) {
      if (packageJSON.type === 'module') {
        moduleType = 'ESM'
      } else if (packageJSON.type === 'commonjs') {
        moduleType = 'CommonJS'
      } else {
        moduleType = await (
          await import('@inquirer/select')
        ).default({
          choices: validModuleTypes.map((type) => ({name: type, value: type})),
          message: 'Select a module type',
        })
      }
    }

    this.log(`Using module type ${chalk.green(moduleType)}`)

    const templateOptions = {moduleType}
    const projectBinPath = join(location, 'bin')
    await this.template(
      join(this.templatesDir, 'src', 'init', 'dev.cmd.ejs'),
      join(projectBinPath, 'dev.cmd'),
      templateOptions,
    )
    await this.template(
      join(this.templatesDir, 'src', 'init', 'dev.js.ejs'),
      join(projectBinPath, 'dev.js'),
      templateOptions,
    )
    await this.template(
      join(this.templatesDir, 'src', 'init', 'run.cmd.ejs'),
      join(projectBinPath, 'run.cmd'),
      templateOptions,
    )
    await this.template(
      join(this.templatesDir, 'src', 'init', 'run.js.ejs'),
      join(projectBinPath, 'run.js'),
      templateOptions,
    )

    const updatedPackageJSON = {
      ...packageJSON,
      bin: {
        ...packageJSON.bin,
        [bin]: './bin/run.js',
      },
      oclif: {
        bin,
        commands: './dist/commands',
        dirname: bin,
        ...packageJSON.oclif,
      },
    }

    await writeFile(join(location, 'package.json'), JSON.stringify(updatedPackageJSON, null, 2))

    const installedDeps = Object.keys(packageJSON.dependencies || {})
    if (!installedDeps.includes('@oclif/core')) {
      let packageManager = this.flags['package-manager']
      if (!packageManager || !validPackageManagers.includes(packageManager)) {
        const rootFiles = await readdir(location)
        if (rootFiles.includes('package-lock.json')) {
          packageManager = 'npm'
        } else if (rootFiles.includes('yarn.lock')) {
          packageManager = 'yarn'
        } else if (rootFiles.includes('pnpm-lock.yaml')) {
          packageManager = 'pnpm'
        } else {
          packageManager = await (
            await import('@inquirer/select')
          ).default({
            choices: validPackageManagers.map((manager) => ({name: manager, value: manager})),
            message: 'Select a package manager',
          })
        }
      }

      await exec(`${packageManager} ${packageManager === 'npm' ? 'install' : 'add'} @oclif/core`, {
        cwd: location,
        silent: false,
      })
    }

    this.log(`\nCreated CLI ${chalk.green(bin)}`)
  }
}
