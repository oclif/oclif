import {Errors, Flags} from '@oclif/core'
import {green} from 'ansis'
import {readdir, writeFile} from 'node:fs/promises'
import {join, resolve, sep} from 'node:path'

import {exec, FlaggablePrompt, GeneratorCommand, makeFlags, readPJSON} from '../generator'
import {validateBin} from '../util'

const VALID_MODULE_TYPES = ['ESM', 'CommonJS'] as const
type ModuleType = (typeof VALID_MODULE_TYPES)[number]

const VALID_PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm'] as const
type PackageManager = (typeof VALID_PACKAGE_MANAGERS)[number]

function isPackageManager(d: string): d is PackageManager {
  return VALID_PACKAGE_MANAGERS.includes(d as PackageManager)
}

function isModuleType(d: string): d is ModuleType {
  return VALID_MODULE_TYPES.includes(d as ModuleType)
}

const FLAGGABLE_PROMPTS = {
  bin: {
    message: 'Command bin name the CLI will export',
    validate: (d) => validateBin(d) || 'Invalid bin name',
  },
  'module-type': {
    message: 'Select a module type',
    options: VALID_MODULE_TYPES,
    validate: (d) => isModuleType(d) || 'Invalid module type',
  },
  'package-manager': {
    message: 'Select a package manager',
    options: VALID_PACKAGE_MANAGERS,
    validate: (d) => isPackageManager(d) || 'Invalid package manager',
  },
  'topic-separator': {
    message: 'Select a topic separator',
    options: ['colons', 'spaces'],
    validate: (d) => d === 'colons' || d === 'spaces' || 'Invalid topic separator',
  },
} satisfies Record<string, FlaggablePrompt>

export default class Generate extends GeneratorCommand<typeof Generate> {
  static description =
    'This will add the necessary oclif bin files, add oclif config to package.json, and install @oclif/core and ts-node.'
  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %>',
      description: 'Initialize a new CLI in the current directory',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --output-dir "/path/to/existing/project"',
      description: 'Initialize a new CLI in a different directory',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --topic-separator colons --bin mycli',
      description: 'Supply answers for specific prompts',
    },
  ]
  static flaggablePrompts = FLAGGABLE_PROMPTS
  static flags = {
    ...makeFlags(FLAGGABLE_PROMPTS),
    'output-dir': Flags.directory({
      char: 'd',
      description: 'Directory to initialize the CLI in.',
      exists: true,
    }),
    yes: Flags.boolean({
      aliases: ['defaults'],
      char: 'y',
      description: 'Use defaults for all prompts. Individual flags will override defaults.',
    }),
  }
  static summary = 'Initialize a new oclif CLI'

  async run(): Promise<void> {
    const outputDir = this.flags['output-dir'] ?? process.cwd()
    const location = resolve(outputDir)

    this.log(`Initializing oclif in ${green(location)}`)

    const packageJSON = (await readPJSON(location))!
    if (!packageJSON) {
      throw new Errors.CLIError(`Could not find a package.json file in ${location}`)
    }

    const bin = await this.getFlagOrPrompt({
      defaultValue: location.split(sep).at(-1) || '',
      name: 'bin',
      type: 'input',
    })

    const topicSeparator = await this.getFlagOrPrompt({
      defaultValue: 'spaces',
      name: 'topic-separator',
      type: 'select',
    })

    const moduleType = await this.getFlagOrPrompt({
      defaultValue: packageJSON.type === 'module' ? 'ESM' : 'CommonJS',
      async maybeOtherValue() {
        return packageJSON.type === 'module' ? 'ESM' : packageJSON.type === 'commonjs' ? 'CommonJS' : undefined
      },
      name: 'module-type',
      type: 'select',
    })

    const packageManager = await this.getFlagOrPrompt({
      defaultValue: 'npm',
      async maybeOtherValue() {
        const rootFiles = await readdir(location)
        if (rootFiles.includes('package-lock.json')) {
          return 'npm'
        }

        if (rootFiles.includes('yarn.lock')) {
          return 'yarn'
        }

        if (rootFiles.includes('pnpm-lock.yaml')) {
          return 'pnpm'
        }
      },
      name: 'package-manager',
      type: 'select',
    })

    this.log(`Using module type ${green(moduleType)}`)
    this.log(`Using package manager ${green(packageManager)}`)

    const projectBinPath = join(location, 'bin')
    const templateBinPath = join(this.templatesDir, 'cli', moduleType.toLowerCase(), 'bin')
    await this.template(join(templateBinPath, 'dev.cmd.ejs'), join(projectBinPath, 'dev.cmd'))
    await this.template(join(templateBinPath, 'dev.js.ejs'), join(projectBinPath, 'dev.js'))
    await this.template(join(templateBinPath, 'run.cmd.ejs'), join(projectBinPath, 'run.cmd'))
    await this.template(join(templateBinPath, 'run.js.ejs'), join(projectBinPath, 'run.js'))

    if (process.platform !== 'win32') {
      await exec(`chmod +x "${join(projectBinPath, 'run.js')}"`)
      await exec(`chmod +x "${join(projectBinPath, 'dev.js')}"`)
    }

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
        topicSeparator: topicSeparator === 'colons' ? ':' : ' ',
        ...packageJSON.oclif,
      },
    }

    await writeFile(join(location, 'package.json'), JSON.stringify(updatedPackageJSON, null, 2))

    const installedDeps = Object.keys(packageJSON.dependencies ?? {})
    if (!installedDeps.includes('@oclif/core')) {
      this.log('Installing @oclif/core')
      await exec(`${packageManager} ${packageManager === 'yarn' ? 'add' : 'install'} @oclif/core`, {
        cwd: location,
        silent: false,
      })
    }

    const allInstalledDeps = new Set([...installedDeps, ...Object.keys(packageJSON.devDependencies ?? {})])
    if (!allInstalledDeps.has('ts-node')) {
      this.log('Installing ts-node')
      await exec(`${packageManager} ${packageManager === 'yarn' ? 'add --dev' : 'install --save-dev'} ts-node`, {
        cwd: location,
        silent: false,
      })
    }

    if (!allInstalledDeps.has('@types/node')) {
      this.log('@types/node')
      await exec(
        `${packageManager} ${packageManager === 'yarn' ? 'add --dev' : 'install --save-dev'} @types/node@^18`,
        {
          cwd: location,
          silent: false,
        },
      )
    }

    this.log(`\nCreated CLI ${green(bin)}`)
  }
}
