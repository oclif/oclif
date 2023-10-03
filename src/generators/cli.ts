import {execSync} from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as Generator from 'yeoman-generator'
import {compact, isEmpty, uniq} from '../util'

const debug = require('debug')('generator-oclif')
const {version} = require('../../package.json')

let hasYarn = false
try {
  execSync('yarn -v', {stdio: 'ignore'})
  hasYarn = true
} catch {}

export default class CLI extends Generator {
  options: {
    defaults?: boolean
    force: boolean
    yarn: boolean
  }

  name: string

  pjson!: any

  githubUser: string | undefined

  answers!: {
    name: string
    bin: string
    description: string
    version: string
    github: {repo: string; user: string}
    author: string
    files: string
    license: string
    pkg: string
    typescript: boolean
    eslint: boolean
    mocha: boolean
    ci: {
      circleci: boolean
      appveyor: boolean
      travisci: boolean
    }
  }

  yarn!: boolean

  repository?: string

  constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts)

    this.name = opts.name
    this.options = {
      defaults: opts.defaults,
      force: opts.force,
      yarn: hasYarn,
    }
  }

  // eslint-disable-next-line complexity
  async prompting(): Promise<void> {
    const msg = 'Time to build an oclif CLI!'

    this.log(`${msg} Version: ${version}`)

    const {moduleType} = this.options.defaults
      ? {moduleType: 'cjs'}
      : await this.prompt([
          {
            type: 'list',
            name: 'moduleType',
            message: 'Select a module type',
            choices: [
              {name: 'CommonJS', value: 'cjs'},
              {name: 'ESM', value: 'esm'},
            ],
            default: 'cjs',
          },
        ])

    const repo = moduleType === 'esm' ? 'hello-world-esm' : 'hello-world'
    execSync(`git clone https://github.com/oclif/${repo}.git "${path.resolve(this.name)}" --depth=1`)
    fs.rmSync(`${path.resolve(this.name, '.git')}`, {recursive: true})

    const templateUsesJsScripts = fs.existsSync(path.resolve(this.name, 'bin', 'run.js'))

    this.destinationRoot(path.resolve(this.name))
    this.env.cwd = this.destinationPath()

    this.githubUser = await this.user.github.username().catch(debug)
    // establish order of properties in the resulting package.json
    this.pjson = {
      name: '',
      version: '',
      description: '',
      author: '',
      bin: '',
      homepage: '',
      license: '',
      main: '',
      repository: '',
      files: [],
      dependencies: {},
      devDependencies: {},
      oclif: {},
      scripts: {},
      engines: {},
      ...(this.fs.readJSON(path.join(this.env.cwd, 'package.json'), {}) as Record<string, unknown>),
    }
    let repository = this.destinationRoot().split(path.sep).slice(-2).join('/')
    if (this.githubUser) repository = `${this.githubUser}/${repository.split('/')[1]}`
    const defaults = {
      ...this.pjson,
      bin: this.name,
      name: this.name ? this.name.replaceAll(' ', '-') : this.determineAppname().replaceAll(' ', '-'),
      version: '0.0.0',
      license: 'MIT',
      author: this.githubUser ? `${this.user.git.name()} @${this.githubUser}` : this.user.git.name(),
      dependencies: {},
      repository,
      engines: {
        node: '>=18.0.0',
        ...this.pjson.engines,
      },
      options: this.options,
    }
    this.repository = defaults.repository
    if (this.repository && (this.repository as any).url) {
      this.repository = (this.repository as any).url
    }

    this.answers = this.options.defaults
      ? defaults
      : await this.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'npm package name',
            default: defaults.name,
          },
          {
            type: 'input',
            name: 'bin',
            message: 'command bin name the CLI will export',
            default: (answers: any) => answers.name,
          },
          {
            type: 'input',
            name: 'description',
            message: 'description',
            default: defaults.description,
          },
          {
            type: 'input',
            name: 'author',
            message: 'author',
            default: defaults.author,
          },
          {
            type: 'input',
            name: 'version',
            message: 'version',
            default: defaults.version,
            when: !this.pjson.version,
          },
          {
            type: 'input',
            name: 'license',
            message: 'license',
            default: defaults.license,
          },
          {
            type: 'input',
            name: 'github.user',
            message: 'Who is the GitHub owner of repository (https://github.com/OWNER/repo)',
            default: repository.split('/').slice(0, -1).pop(),
          },
          {
            type: 'input',
            name: 'github.repo',
            message: 'What is the GitHub name of repository (https://github.com/owner/REPO)',
            default: (answers: any) => (answers.name || this.pjson.repository || this.pjson.name).split('/').pop(),
          },
          {
            type: 'list',
            name: 'pkg',
            message: 'Select a package manager',
            choices: [
              {name: 'npm', value: 'npm'},
              {name: 'yarn', value: 'yarn'},
            ],
            default: () => (this.options.yarn || hasYarn ? 1 : 0),
          },
        ])

    debug(this.answers)
    if (!this.options.defaults) {
      this.options = {
        ...this.answers.ci,
        yarn: this.answers.pkg === 'yarn',
        force: true,
      }
    }

    this.yarn = this.options.yarn
    this.env.options.nodePackageManager = this.yarn ? 'yarn' : 'npm'

    this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.engines.node = defaults.engines.node
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.files = this.answers.files || defaults.files || '/lib'
    this.pjson.license = this.answers.license || defaults.license
    // eslint-disable-next-line no-multi-assign
    this.repository = this.pjson.repository = this.answers.github
      ? `${this.answers.github.user}/${this.answers.github.repo}`
      : defaults.repository

    this.pjson.homepage = `https://github.com/${this.repository}`
    this.pjson.bugs = `https://github.com/${this.repository}/issues`

    this.pjson.oclif.bin = this.answers.bin
    this.pjson.oclif.dirname = this.answers.bin
    this.pjson.bin = {}
    this.pjson.bin[this.pjson.oclif.bin] = `./bin/run${templateUsesJsScripts ? '.js' : ''}`

    if (!this.options.yarn) {
      const scripts = (this.pjson.scripts || {}) as Record<string, string>
      this.pjson.scripts = Object.fromEntries(
        Object.entries(scripts).map(([k, v]) => [k, v.replace('yarn', 'npm run')]),
      )
    }
  }

  writing(): void {
    if (this.pjson.oclif && Array.isArray(this.pjson.oclif.plugins)) {
      this.pjson.oclif.plugins.sort()
    }

    if (isEmpty(this.pjson.oclif)) delete this.pjson.oclif
    this.pjson.files = uniq((this.pjson.files || []).sort())
    this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson)

    this.fs.write(this.destinationPath('.gitignore'), this._gitignore())
    this.fs.delete(this.destinationPath('LICENSE'))
  }

  end(): void {
    this.spawnCommandSync(this.env.options.nodePackageManager, ['run', 'build'], {cwd: this.env.cwd})
    this.spawnCommandSync(path.join(this.env.cwd, 'node_modules', '.bin', 'oclif'), ['readme'], {
      cwd: this.env.cwd,
      // When testing this command in development, you get noisy compilation errors as a result of running
      // this in a spawned process. Setting the NODE_ENV to production will silence these warnings. This
      // doesn't affect the behavior of the command in production since the NODE_ENV is already set to production
      // in that scenario.
      env: {...process.env, NODE_ENV: 'production'},
    })

    console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
  }

  private _gitignore(): string {
    const existing = this.fs.exists(this.destinationPath('.gitignore'))
      ? this.fs.read(this.destinationPath('.gitignore')).split('\n')
      : []

    return (
      uniq(
        compact([
          '*-debug.log',
          '*-error.log',
          'node_modules',
          '/tmp',
          '/dist',
          this.yarn ? '/package-lock.json' : '/yarn.lock',
          '/lib',
          ...existing,
        ]),
      )
        .sort()
        .join('\n') + '\n'
    )
  }
}
