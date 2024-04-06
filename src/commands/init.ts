/* eslint-disable unicorn/no-await-expression-member */
import {Errors, Flags} from '@oclif/core'
import chalk from 'chalk'
import {existsSync, renameSync, statSync} from 'node:fs'
import {readdir, rm, writeFile} from 'node:fs/promises'
import {join, resolve, sep} from 'node:path'

import {FlaggablePrompt, GeneratorCommand, exec, makeFlags, readPJSON} from '../generator'
import {validateBin} from '../util'

async function clone(repo: string, location: string): Promise<void> {
  try {
    await exec(`git clone https://github.com/oclif/${repo}.git "${location}" --depth=1`)
  } catch (error) {
    const err =
      error instanceof Error
        ? new Errors.CLIError(error)
        : new Errors.CLIError('An error occurred while cloning the template repo')
    throw err
  }
}

const validModuleTypes = ['ESM', 'CommonJS']
const validPackageManagers = ['npm', 'yarn', 'pnpm']

const FLAGGABLE_PROMPTS = {
  bin: {
    message: 'Command bin name the CLI will export:',
    validate: (d: string) => validateBin(d) || 'Invalid bin name',
  },
  'output-dir': {
    message: 'Directory to build the CLI in:',
    validate: (d: string) => existsSync(resolve(d)),
  },
  'package-manager': {
    message: 'Select a package manager:',
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
      defaultValue: location.split(sep).at(-1)!,
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
          message: 'Select a module type:',
        })
      }
    }

    this.log(`Using module type ${chalk.green(moduleType)}`)

    const template = moduleType === 'ESM' ? 'hello-world-esm' : 'hello-world'
    const repoPath = join(location, '_tmp-template')
    await clone(template, repoPath)

    const repoBinPath = join(repoPath, 'bin')
    const binFiles = await readdir(repoBinPath)
    for (const binFile of binFiles) {
      const filePath = join(repoBinPath, binFile)
      if (statSync(filePath).isFile()) {
        renameSync(filePath, join(location, 'bin', binFile))
      }
    }

    await rm(repoPath, {recursive: true})

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
            message: 'Select a package manager:',
          })
        }
      }

      await exec(`${packageManager} install @oclif/core`, {cwd: location, silent: false})
    }

    this.log(`\nCreated CLI ${chalk.green(bin)}`)
  }
}
