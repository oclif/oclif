/* eslint-disable unicorn/no-await-expression-member */
import {Args, Errors, Flags} from '@oclif/core'
import chalk from 'chalk'
import {readFile, rm, writeFile} from 'node:fs/promises'
import {join, resolve, sep} from 'node:path'
import validatePkgName from 'validate-npm-package-name'

import {FlaggablePrompt, GeneratorCommand, exec, makeFlags, readPJSON} from '../generator'
import {compact, uniq, validateBin} from '../util'

async function fetchGithubUserFromAPI(): Promise<{login: string; name: string} | undefined> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  if (!token) return

  const {default: got} = await import('got')
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  }

  try {
    const {login, name} = await got('https://api.github.com/user', {headers}).json<{login: string; name: string}>()
    return {login, name}
  } catch {}
}

async function fetchGithubUserFromGit(): Promise<string | undefined> {
  try {
    const result = await exec('git config --get user.name')
    return result.stdout.trim()
  } catch {}
}

async function fetchGithubUser(): Promise<{login?: string; name: string | undefined} | undefined> {
  return (await fetchGithubUserFromAPI()) ?? {name: await fetchGithubUserFromGit()}
}

function determineDefaultAuthor(
  user: {login?: string; name: string | undefined} | undefined,
  defaultValue: string,
): string {
  const {login, name} = user ?? {login: undefined, name: undefined}
  if (name && login) return `${name} @${login}`
  if (name) return name
  if (login) return `@${login}`
  return defaultValue
}

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

const FLAGGABLE_PROMPTS = {
  author: {
    message: 'Author',
    validate: (d) => d.length > 0 || 'Author cannot be empty',
  },
  bin: {
    message: 'Command bin name the CLI will export',
    validate: (d) => validateBin(d) || 'Invalid bin name',
  },
  description: {
    message: 'Description',
    validate: (d) => d.length > 0 || 'Description cannot be empty',
  },
  license: {
    message: 'License',
    validate: (d) => d.length > 0 || 'License cannot be empty',
  },
  'module-type': {
    message: 'Select a module type',
    options: ['CommonJS', 'ESM'],
    validate: (d) => ['CommonJS', 'ESM'].includes(d) || 'Invalid module type',
  },
  name: {
    message: 'NPM package name',
    validate: (d) => validatePkgName(d).validForNewPackages || 'Invalid package name',
  },
  owner: {
    message: 'Who is the GitHub owner of repository (https://github.com/OWNER/repo)',
    validate: (d) => d.length > 0 || 'Owner cannot be empty',
  },
  'package-manager': {
    message: 'Select a package manager',
    options: ['npm', 'yarn', 'pnpm'],
    validate: (d) => ['npm', 'pnpm', 'yarn'].includes(d) || 'Invalid package manager',
  },
  repository: {
    message: 'What is the GitHub name of repository (https://github.com/owner/REPO)',
    validate: (d) => d.length > 0 || 'Repo cannot be empty',
  },
} satisfies Record<string, FlaggablePrompt>

export default class Generate extends GeneratorCommand<typeof Generate> {
  static args = {
    name: Args.string({description: 'Directory name of new project.', required: true}),
  }

  static description = `This will clone the template repo and update package properties. For CommonJS, the 'oclif/hello-world' template will be used and for ESM, the 'oclif/hello-world-esm' template will be used.`

  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> my-cli',
      description: 'Generate a new CLI with prompts for all properties',
    },
    {
      command: '<%= config.bin %> <%= command.id %> my-cli --yes',
      description: 'Automatically accept default values for all prompts',
    },
    {
      command: '<%= config.bin %> <%= command.id %> my-cli --module-type CommonJS --author "John Doe"',
      description: 'Supply answers for specific prompts',
    },
    {
      command: '<%= config.bin %> <%= command.id %> my-cli --module-type CommonJS --author "John Doe" --yes',
      description: 'Supply answers for specific prompts and accept default values for the rest',
    },
  ]

  static flaggablePrompts = FLAGGABLE_PROMPTS

  static flags = {
    ...makeFlags(FLAGGABLE_PROMPTS),
    'output-dir': Flags.directory({
      char: 'd',
      description: 'Directory to build the CLI in.',
    }),
    yes: Flags.boolean({
      aliases: ['defaults'],
      char: 'y',
      description: 'Use defaults for all prompts. Individual flags will override defaults.',
    }),
  }

  static summary = 'Generate a new CLI'

  async run(): Promise<void> {
    const location = this.flags['output-dir'] ? join(this.flags['output-dir'], this.args.name) : resolve(this.args.name)
    this.log(`Generating ${this.args.name} in ${chalk.green(location)}`)

    const moduleType = await this.getFlagOrPrompt({
      defaultValue: 'ESM',
      name: 'module-type',
      type: 'select',
    })

    const template = moduleType === 'ESM' ? 'hello-world-esm' : 'hello-world'
    await clone(template, location)
    await rm(join(location, '.git'), {force: true, recursive: true})
    // We just cloned the template repo so we're sure it has a package.json
    const packageJSON = (await readPJSON(location))!

    const githubUser = await fetchGithubUser()

    const name = await this.getFlagOrPrompt({defaultValue: this.args.name, name: 'name', type: 'input'})
    const bin = await this.getFlagOrPrompt({defaultValue: name, name: 'bin', type: 'input'})
    const description = await this.getFlagOrPrompt({
      defaultValue: packageJSON.description,
      name: 'description',
      type: 'input',
    })
    const author = await this.getFlagOrPrompt({
      defaultValue: determineDefaultAuthor(githubUser, packageJSON.author),
      name: 'author',
      type: 'input',
    })

    const license = await this.getFlagOrPrompt({
      defaultValue: packageJSON.license,
      name: 'license',
      type: 'input',
    })

    const owner = await this.getFlagOrPrompt({
      defaultValue: githubUser?.login ?? location.split(sep).at(-2) ?? packageJSON.author,
      name: 'owner',
      type: 'input',
    })

    const repository = await this.getFlagOrPrompt({
      defaultValue: (name ?? packageJSON.repository ?? packageJSON.name).split('/').at(-1) ?? name,
      name: 'repository',
      type: 'input',
    })

    const packageManager = await this.getFlagOrPrompt({
      defaultValue: 'npm',
      name: 'package-manager',
      type: 'select',
    })

    const updatedPackageJSON = {
      ...packageJSON,
      author,
      bin: {[bin]: './bin/run.js'},
      bugs: `https://github.com/${owner}/${repository}/issues`,
      description,
      homepage: `https://github.com/${owner}/${repository}`,
      license,
      name,
      oclif: {
        ...packageJSON.oclif,
        bin,
        dirname: bin,
      },
      repository: `${owner}/${repository}`,
    }

    if (packageManager !== 'yarn') {
      const scripts = (updatedPackageJSON.scripts || {}) as Record<string, string>
      updatedPackageJSON.scripts = Object.fromEntries(
        Object.entries(scripts).map(([k, v]) => [k, v.replace('yarn', `${packageManager} run`)]),
      )
    }

    const {default: sortPackageJson} = await import('sort-package-json')
    await writeFile(join(location, 'package.json'), JSON.stringify(sortPackageJson(updatedPackageJSON), null, 2))
    await rm(join(location, 'LICENSE'))

    const existing = (await readFile(join(location, '.gitignore'), 'utf8')).split('\n')
    const updated =
      uniq(
        compact([
          '*-debug.log',
          '*-error.log',
          'node_modules',
          '/tmp',
          '/dist',
          '/lib',
          ...(packageManager === 'yarn'
            ? [
                '/package-lock.json',
                '.pnp.*',
                '.yarn/*',
                '!.yarn/patches',
                '!.yarn/plugins',
                '!.yarn/releases',
                '!.yarn/sdks',
                '!.yarn/versions',
              ]
            : ['/yarn.lock']),
          ...existing,
        ]),
      )
        .sort()
        .join('\n') + '\n'

    await writeFile(join(location, '.gitignore'), updated)

    if (packageManager !== 'yarn') {
      await rm(join(location, 'yarn.lock'))
    }

    await exec(`${packageManager} install`, {cwd: location, silent: false})
    await exec(`${join(location, 'node_modules', '.bin', 'oclif')} readme`, {
      cwd: location,
      // When testing this command in development, you get noisy compilation errors as a result of running
      // this in a spawned process. Setting the NODE_ENV to production will silence these warnings. This
      // doesn't affect the behavior of the command in production since the NODE_ENV is already set to production
      // in that scenario.
      env: {...process.env, NODE_ENV: 'production'},
      silent: false,
    })

    this.log(`\nCreated ${chalk.green(name)}`)
  }
}
