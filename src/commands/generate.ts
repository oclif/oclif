/* eslint-disable unicorn/no-await-expression-member */
import {Args, Errors, Flags} from '@oclif/core'
import chalk from 'chalk'
import {existsSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import {join, resolve, sep} from 'node:path'
import validatePkgName from 'validate-npm-package-name'

import {FlaggablePrompt, GeneratorCommand, exec, makeFlags} from '../generator'
import {validateBin} from '../util'

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

    if (existsSync(location)) {
      throw new Errors.CLIError(`The directory ${location} already exists.`)
    }

    const moduleType = await this.getFlagOrPrompt({
      defaultValue: 'ESM',
      name: 'module-type',
      type: 'select',
    })

    // console.log(sharedFiles)
    // console.log(moduleSpecificFiles)

    // const template = moduleType === 'ESM' ? 'hello-world-esm' : 'hello-world'
    // await clone(template, location)
    // await rm(join(location, '.git'), {force: true, recursive: true})
    // We just cloned the template repo so we're sure it has a package.json
    // const packageJSON = (await readPJSON(location))!

    const githubUser = await fetchGithubUser()

    const name = await this.getFlagOrPrompt({defaultValue: this.args.name, name: 'name', type: 'input'})
    const bin = await this.getFlagOrPrompt({defaultValue: name, name: 'bin', type: 'input'})
    const description = await this.getFlagOrPrompt({
      defaultValue: 'A new CLI generated with oclif',
      name: 'description',
      type: 'input',
    })
    const author = await this.getFlagOrPrompt({
      defaultValue: determineDefaultAuthor(githubUser, 'Your Name Here'),
      name: 'author',
      type: 'input',
    })

    const license = await this.getFlagOrPrompt({
      defaultValue: 'MIT',
      name: 'license',
      type: 'input',
    })

    const owner = await this.getFlagOrPrompt({
      defaultValue: githubUser?.login ?? location.split(sep).at(-2) ?? 'Your Name Here',
      name: 'owner',
      type: 'input',
    })

    const repository = await this.getFlagOrPrompt({
      defaultValue: name.split('/').at(-1) ?? name,
      name: 'repository',
      type: 'input',
    })

    const packageManager = await this.getFlagOrPrompt({
      defaultValue: 'npm',
      name: 'package-manager',
      type: 'select',
    })

    const sharedFiles = (
      await readdir(join(this.templatesDir, 'cli', 'shared'), {recursive: true, withFileTypes: true})
    )
      .filter((f) => f.isFile() && f.name.endsWith('.ejs'))
      .map((f) => ({
        destination: join(
          f.path.replace(join(this.templatesDir, 'cli', 'shared'), location),
          f.name.replace('.ejs', ''),
        ),
        name: f.name,
        src: join(f.path, f.name),
      }))

    const moduleSpecificFiles = (
      await readdir(join(this.templatesDir, 'cli', moduleType.toLowerCase()), {recursive: true, withFileTypes: true})
    )
      .filter((f) => f.isFile() && f.name.endsWith('.ejs'))
      .map((f) => ({
        destination: join(
          f.path.replace(join(this.templatesDir, 'cli', moduleType.toLowerCase()), location),
          f.name.replace('.ejs', ''),
        ),
        name: f.name,
        src: join(f.path, f.name),
      }))

    await Promise.all(
      [...sharedFiles, ...moduleSpecificFiles].map(async (file) => {
        switch (file.name) {
          case 'package.json.ejs': {
            const data = {
              author,
              bin,
              description,
              license,
              moduleType,
              name,
              owner,
              pkgManagerScript: packageManager === 'yarn' ? 'yarn' : `${packageManager} run`,
              repository,
            }
            await this.template(file.src, file.destination, data)

            break
          }

          case '.gitignore.ejs': {
            await this.template(file.src, file.destination, {packageManager})

            break
          }

          case 'README.md.ejs': {
            await this.template(file.src, file.destination, {description, name, repository})

            break
          }

          case 'onPushToMain.yml.ejs':
          case 'onRelease.yml.ejs':
          case 'test.yml.ejs': {
            await this.template(file.src, file.destination, {
              exec: packageManager === 'yarn' ? packageManager : `${packageManager} exec`,
              install: packageManager === 'yarn' ? packageManager : `${packageManager} install`,
              packageManager,
              run: packageManager === 'yarn' ? packageManager : `${packageManager} run`,
            })

            break
          }

          default: {
            await this.template(file.src, file.destination)
          }
        }
      }),
    )

    if (process.platform !== 'win32') {
      await Promise.all([
        exec(`chmod +x ${join(location, 'bin', 'run.js')}`),
        exec(`chmod +x ${join(location, 'bin', 'dev.js')}`),
      ])
    }

    await exec(`${packageManager} install`, {cwd: location, silent: false})
    await exec(`${packageManager} run build`, {cwd: location, silent: false})
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
