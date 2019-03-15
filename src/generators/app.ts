// tslint:disable no-floating-promises
// tslint:disable no-console

import {execSync} from 'child_process'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as path from 'path'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')

const nps = require('nps-utils')
const sortPjson = require('sort-pjson')
const fixpack = require('@oclif/fixpack')
const debug = require('debug')('generator-oclif')
const {version} = require('../../package.json')

const isWindows = process.platform === 'win32'
const rmrf = isWindows ? 'rimraf' : 'rm -rf'
const rmf = isWindows ? 'rimraf' : 'rm -f'

let hasYarn = false
try {
  execSync('yarn -v', {stdio: 'ignore'})
  hasYarn = true
} catch {}
// function stringToArray(s: string) {
//   const keywords: string[] = []

//   s.split(',').forEach((keyword: string) => {
//     if (!keyword.length) {
//       return false
//     }

//     return keywords.push(keyword.trim())
//   })

//   return keywords
// }

class App extends Generator {
  options: {
    defaults?: boolean
    mocha: boolean
    circleci: boolean
    appveyor: boolean
    codecov: boolean
    typescript: boolean
    tslint: boolean
    eslint: boolean
    yarn: boolean
    travisci: boolean
  }
  args!: {[k: string]: string}
  type: 'single' | 'multi' | 'plugin' | 'base'
  path: string
  pjson: any
  githubUser: string | undefined
  answers!: {
    name: string
    bin: string
    description: string
    version: string
    github: {repo: string, user: string}
    author: string
    files: string
    license: string
    pkg: string
    typescript: boolean
    tslint: boolean
    eslint: boolean
    mocha: boolean
    ci: {
      circleci: boolean
      appveyor: boolean
      codecov: boolean
      travisci: boolean
    }
  }
  mocha!: boolean
  circleci!: boolean
  appveyor!: boolean
  codecov!: boolean
  ts!: boolean
  tslint!: boolean
  eslint!: boolean
  yarn!: boolean
  travisci!: boolean
  get _ext() { return this.ts ? 'ts' : 'js' }
  get _bin() {
    let bin = this.pjson.oclif && (this.pjson.oclif.bin || this.pjson.oclif.dirname) || this.pjson.name
    if (bin.includes('/')) bin = bin.split('/').pop()
    return bin
  }
  repository?: string

  constructor(args: any, opts: any) {
    super(args, opts)

    this.type = opts.type
    this.path = opts.path
    this.options = {
      defaults: opts.defaults,
      mocha: opts.options.includes('mocha'),
      circleci: opts.options.includes('circleci'),
      appveyor: opts.options.includes('appveyor'),
      codecov: opts.options.includes('codecov'),
      typescript: opts.options.includes('typescript'),
      tslint: opts.options.includes('tslint'),
      eslint: opts.options.includes('eslint'),
      yarn: opts.options.includes('yarn') || hasYarn,
      travisci: opts.options.includes('travisci'),
    }
  }

  async prompting() {
    let msg
    switch (this.type) {
    case 'single':
      msg = 'Time to build a single-command CLI with oclif!'
      break
    case 'multi':
      msg = 'Time to build a multi-command CLI with oclif!'
      break
    default:
      msg = `Time to build a oclif ${this.type}!`
    }
    this.log(yosay(`${msg} Version: ${version}`))

    if (this.path) {
      this.destinationRoot(path.resolve(this.path))
      process.chdir(this.destinationRoot())
    }
    this.githubUser = await this.user.github.username().catch(debug)
    this.pjson = {
      scripts: {},
      engines: {},
      devDependencies: {},
      dependencies: {},
      oclif: {},
      ...this.fs.readJSON('package.json', {}),
    }
    let repository = this.destinationRoot().split(path.sep).slice(-2).join('/')
    if (this.githubUser) repository = `${this.githubUser}/${repository.split('/')[1]}`
    const defaults = {
      name: this.determineAppname().replace(/ /g, '-'),
      version: '0.0.0',
      license: 'MIT',
      author: this.githubUser ? `${this.user.git.name()} @${this.githubUser}` : this.user.git.name(),
      dependencies: {},
      repository,
      ...this.pjson,
      engines: {
        node: '>=8.0.0',
        ...this.pjson.engines,
      },
      options: this.options,
    }
    this.repository = defaults.repository
    if (this.repository && (this.repository as any).url) {
      this.repository = (this.repository as any).url
    }
    if (this.options.defaults) {
      this.answers = defaults
    } else {
      this.answers = await this.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'npm package name',
          default: defaults.name,
          when: !this.pjson.name,
        },
        {
          type: 'input',
          name: 'bin',
          message: 'command bin name the CLI will export',
          default: (answers: any) => (answers.name || this._bin).split('/').pop(),
          when: ['single', 'multi'].includes(this.type) && !this.pjson.oclif.bin,
        },
        {
          type: 'input',
          name: 'description',
          message: 'description',
          default: defaults.description,
          when: !this.pjson.description,
        },
        {
          type: 'input',
          name: 'author',
          message: 'author',
          default: defaults.author,
          when: !this.pjson.author,
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
          when: !this.pjson.license,
        },
        {
          type: 'input',
          name: 'github.user',
          message: 'Who is the GitHub owner of repository (https://github.com/OWNER/repo)',
          default: repository.split('/').slice(0, -1).pop(),
          when: !this.pjson.repository,
        },
        {
          type: 'input',
          name: 'github.repo',
          message: 'What is the GitHub name of repository (https://github.com/owner/REPO)',
          default: (answers: any) => (this.pjson.repository || answers.name || this.pjson.name).split('/').pop(),
          when: !this.pjson.repository,
        },
        {
          type: 'list',
          name: 'pkg',
          message: 'Select a package manager',
          choices: [
            {name: 'npm', value: 'npm'},
            {name: 'yarn', value: 'yarn'},
          ],
          default: () => this.options.yarn || hasYarn ? 1 : 0,
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'TypeScript',
          default: () => true
        },
        {
          type: 'confirm',
          name: 'tslint',
          message: 'Use tslint (linter for TypeScript)',
          when: (answers: any) => answers.typescript,
          default: (answers: any) => answers.typescript
        },
        {
          type: 'confirm',
          name: 'eslint',
          message: 'Use eslint (linter for JavaScript)',
          when: (answers: any) => !answers.typescript,
          default: (answers: any) => !answers.typescript
        },
        {
          type: 'confirm',
          name: 'mocha',
          message: 'Use mocha (testing framework)',
          default: () => true
        },
        {
          type: 'checkbox',
          name: 'ci',
          message: 'Add CI service config',
          choices: [
            {name: 'circleci (continuous integration/delivery service)', value: 'circleci'},
            {name: 'appveyor (continuous integration/delivery service)', value: 'appveyor'},
            {name: 'codecov (online code coverage report viewer)', value: 'codecov'},
            {name: 'travisci (continuous integration/delivery service)', value: 'travisci'},
          ],
          filter: ((arr: string[]) => _.keyBy(arr)) as any,
        },
      ]) as any
    }
    debug(this.answers)
    if (!this.options.defaults) {
      this.options = {
        ...this.answers.ci,
        mocha: this.answers.mocha,
        tslint: this.answers.tslint,
        eslint: this.answers.eslint,
        typescript: this.answers.typescript,
        yarn: this.answers.pkg === 'yarn',
      }
    }
    this.ts = this.options.typescript
    this.tslint = this.options.tslint
    this.yarn = this.options.yarn
    this.mocha = this.options.mocha
    this.circleci = this.options.circleci
    this.appveyor = this.options.appveyor
    this.codecov = this.options.codecov
    this.eslint = this.options.eslint
    this.travisci = this.options.travisci

    this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.engines.node = defaults.engines.node
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.files = this.answers.files || defaults.files || [(this.ts ? '/lib' : '/src')]
    this.pjson.license = this.answers.license || defaults.license
    this.repository = this.pjson.repository = this.answers.github ? `${this.answers.github.user}/${this.answers.github.repo}` : defaults.repository
    if (this.tslint) {
      this.pjson.scripts.posttest = `tslint -p ${this.mocha ? 'test' : '.'} -t stylish`
    }
    if (this.eslint) {
      this.pjson.scripts.posttest = 'eslint .'
    }
    if (this.mocha) {
      this.pjson.scripts.test = `nyc ${this.ts ? '--extension .ts ' : ''}mocha --forbid-only "test/**/*.test.${this._ext}"`
    } else {
      this.pjson.scripts.test = 'echo NO TESTS'
    }
    if (this.ts) {
      this.pjson.scripts.prepack = nps.series(`${rmrf} lib`, 'tsc -b')
    }
    if (['plugin', 'multi'].includes(this.type)) {
      this.pjson.scripts.prepack = nps.series(this.pjson.scripts.prepack, 'oclif-dev manifest', 'oclif-dev readme')
      this.pjson.scripts.postpack = `${rmf} oclif.manifest.json`
      this.pjson.scripts.version = nps.series('oclif-dev readme', 'git add README.md')
      this.pjson.files.push('/oclif.manifest.json')
      this.pjson.files.push('/npm-shrinkwrap.json')
    }
    if (this.type === 'plugin' && hasYarn) {
      // for plugins, add yarn.lock file to package so we can lock plugin dependencies
      this.pjson.files.push('/yarn.lock')
    }
    this.pjson.keywords = defaults.keywords || [this.type === 'plugin' ? 'oclif-plugin' : 'oclif']
    this.pjson.homepage = defaults.homepage || `https://github.com/${this.pjson.repository}`
    this.pjson.bugs = defaults.bugs || `https://github.com/${this.pjson.repository}/issues`

    if (['single', 'multi'].includes(this.type)) {
      this.pjson.oclif.bin = this.answers.bin || this._bin
      this.pjson.bin = this.pjson.bin || {}
      this.pjson.bin[this.pjson.oclif.bin] = './bin/run'
      this.pjson.files.push('/bin')
    } else if (this.type === 'plugin') {
      this.pjson.oclif.bin = 'oclif-example'
    }
    if (this.type !== 'plugin') {
      this.pjson.main = defaults.main || (this.ts ? 'lib/index.js' : 'src/index.js')
      if (this.ts) {
        this.pjson.types = defaults.types || 'lib/index.d.ts'
      }
    }
  }

  writing() {
    this.sourceRoot(path.join(__dirname, '../../templates'))

    switch (this.type) {
    case 'multi':
    case 'plugin':
      this.pjson.oclif = {
        commands: `./${this.ts ? 'lib' : 'src'}/commands`,
          // hooks: {init: `./${this.ts ? 'lib' : 'src'}/hooks/init`},
        ...this.pjson.oclif,
      }
      break
    default:
    }
    if (this.type === 'plugin' && !this.pjson.oclif.devPlugins) {
      this.pjson.oclif.devPlugins = [
        '@oclif/plugin-help',
      ]
    }
    if (this.type === 'multi' && !this.pjson.oclif.plugins) {
      this.pjson.oclif.plugins = [
        '@oclif/plugin-help',
      ]
    }

    if (this.pjson.oclif && Array.isArray(this.pjson.oclif.plugins)) {
      this.pjson.oclif.plugins.sort()
    }

    if (this.ts) {
      if (this.tslint) {
        this.fs.copyTpl(this.templatePath('tslint.json'), this.destinationPath('tslint.json'), this)
      }
      this.fs.copyTpl(this.templatePath('tsconfig.json'), this.destinationPath('tsconfig.json'), this)
      if (this.mocha) {
        this.fs.copyTpl(this.templatePath('test/tsconfig.json'), this.destinationPath('test/tsconfig.json'), this)
      }
    }
    if (this.eslint) {
      this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
      const eslintignore = this._eslintignore()
      if (eslintignore.trim()) this.fs.write(this.destinationPath('.eslintignore'), this._eslintignore())
    }
    if (this.mocha) {
      this.fs.copyTpl(this.templatePath('test/mocha.opts'), this.destinationPath('test/mocha.opts'), this)
    }
    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('@oclif/fixpack/config.json'))
    }
    if (_.isEmpty(this.pjson.oclif)) delete this.pjson.oclif
    this.pjson.files = _.uniq((this.pjson.files || []).sort())
    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    this.fs.copyTpl(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'), this)
    if (this.circleci) {
      this.fs.copyTpl(this.templatePath('circle.yml.ejs'), this.destinationPath('.circleci/config.yml'), this)
    }
    if (this.appveyor) {
      this.fs.copyTpl(this.templatePath('appveyor.yml.ejs'), this.destinationPath('appveyor.yml'), this)
    }
    if (this.travisci) {
      this.fs.copyTpl(this.templatePath('travis.yml.ejs'), this.destinationPath('.travis.yml'), this)
    }

    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), this)
    if (this.pjson.license === 'MIT' && (this.pjson.repository.startsWith('oclif') || this.pjson.repository.startsWith('heroku'))) {
      this.fs.copyTpl(this.templatePath('LICENSE.mit'), this.destinationPath('LICENSE'), this)
    }

    this.fs.write(this.destinationPath('.gitignore'), this._gitignore())

    switch (this.type) {
    case 'single':
      this._writeSingle()
      break
    case 'plugin':
      this._writePlugin()
      break
    case 'multi':
      this._writeMulti()
      break
    default:
      this._writeBase()
    }
  }

  install() {
    const dependencies: string[] = []
    const devDependencies: string[] = []
    switch (this.type) {
    case 'base': break
    case 'single':
      dependencies.push(
          '@oclif/config@^1',
          '@oclif/command@^1',
          '@oclif/plugin-help@^2',
        )
      break
    case 'plugin':
      dependencies.push(
          '@oclif/command@^1',
          '@oclif/config@^1',
        )
      devDependencies.push(
          '@oclif/dev-cli@^1',
          '@oclif/plugin-help@^2',
          'globby@^8',
        )
      break
    case 'multi':
      dependencies.push(
          '@oclif/config@^1',
          '@oclif/command@^1',
          '@oclif/plugin-help@^2',
        )
      devDependencies.push(
          '@oclif/dev-cli@^1',
          'globby@^8',
        )
    }
    if (this.mocha) {
      devDependencies.push(
        'mocha@^5',
        'nyc@^13',
        'chai@^4',
      )
      if (this.type !== 'base') devDependencies.push(
        '@oclif/test@^1',
      )
    }
    if (this.ts) {
      dependencies.push(
        'tslib@^1',
      )
      devDependencies.push(
        '@types/node@^10',
        'typescript@^3.3',
        'ts-node@^8',
      )
      if (this.mocha) {
        devDependencies.push(
          '@types/chai@^4',
          '@types/mocha@^5',
        )
      }
      if (this.tslint) {
        devDependencies.push(
          '@oclif/tslint@^3',
          'tslint@^5',
        )
      }
    }
    if (this.eslint) {
      devDependencies.push(
        'eslint@^5.13',
        'eslint-config-oclif@^3.1',
      )
    }
    if (isWindows) devDependencies.push('rimraf')
    let yarnOpts = {} as any
    if (process.env.YARN_MUTEX) yarnOpts.mutex = process.env.YARN_MUTEX
    const install = (deps: string[], opts: object) => this.yarn ? this.yarnInstall(deps, opts) : this.npmInstall(deps, opts)
    const dev = this.yarn ? {dev: true} : {'save-dev': true}
    const save = this.yarn ? {} : {save: true}
    return Promise.all([
      install(devDependencies, {...yarnOpts, ...dev, ignoreScripts: true}),
      install(dependencies, {...yarnOpts, ...save}),
    ]).then(() => {
      // if (!this.yarn) {
      //   return this.spawnCommand('npm', ['shrinkwrap'])
      // }
    })
  }

  end() {
    if (['plugin', 'multi'].includes(this.type)) {
      this.spawnCommandSync(path.join('.', 'node_modules/.bin/oclif-dev'), ['readme'])
    }
    console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
  }

  private _gitignore(): string {
    const existing = this.fs.exists(this.destinationPath('.gitignore')) ? this.fs.read(this.destinationPath('.gitignore')).split('\n') : []
    return _([
      '*-debug.log',
      '*-error.log',
      'node_modules',
      '/tmp',
      '/dist',
      '/.nyc_output',
      this.yarn ? '/package-lock.json' : '/yarn.lock',
      this.ts && '/lib',
    ])
      .concat(existing)
      .compact()
      .uniq()
      .sort()
      .join('\n') + '\n'
  }

  private _eslintignore(): string {
    const existing = this.fs.exists(this.destinationPath('.eslintignore')) ? this.fs.read(this.destinationPath('.eslintignore')).split('\n') : []
    return _([
      this.ts && '/lib',
    ])
      .concat(existing)
      .compact()
      .uniq()
      .sort()
      .join('\n') + '\n'
  }

  private _writeBase() {
    if (!fs.existsSync('src')) {
      this.fs.copyTpl(this.templatePath(`base/src/index.${this._ext}`), this.destinationPath(`src/index.${this._ext}`), this)
    }
    if (this.mocha && !fs.existsSync('test')) {
      this.fs.copyTpl(this.templatePath(`base/test/index.test.${this._ext}`), this.destinationPath(`test/index.test.${this._ext}`), this)
    }
  }

  private _writePlugin() {
    const bin = this._bin
    const cmd = `${bin} hello`
    const opts = {...this as any, _, bin, cmd}
    this.fs.copyTpl(this.templatePath('plugin/bin/run'), this.destinationPath('bin/run'), opts)
    this.fs.copyTpl(this.templatePath('bin/run.cmd'), this.destinationPath('bin/run.cmd'), opts)
    const commandPath = this.destinationPath(`src/commands/hello.${this._ext}`)
    if (!fs.existsSync('src/commands')) {
      this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), commandPath, {...opts, name: 'hello', path: commandPath.replace(process.cwd(), '.')})
    }
    if (this.ts && this.type !== 'multi') {
      this.fs.copyTpl(this.templatePath('plugin/src/index.ts'), this.destinationPath('src/index.ts'), opts)
    }
    if (this.mocha && !fs.existsSync('test')) {
      this.fs.copyTpl(this.templatePath(`test/command.test.${this._ext}.ejs`), this.destinationPath(`test/commands/hello.test.${this._ext}`), {...opts, name: 'hello'})
    }
  }

  private _writeSingle() {
    const bin = this._bin
    const opts = {...this as any, _, bin, cmd: bin, name: this.pjson.name}
    this.fs.copyTpl(this.templatePath(`single/bin/run.${this._ext}`), this.destinationPath('bin/run'), opts)
    this.fs.copyTpl(this.templatePath('bin/run.cmd'), this.destinationPath('bin/run.cmd'), opts)
    const commandPath = this.destinationPath(`src/index.${this._ext}`)
    if (!this.fs.exists(`src/index.${this._ext}`)) {
      this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), this.destinationPath(`src/index.${this._ext}`), {...opts, path: commandPath.replace(process.cwd(), '.')})
    }
    if (this.mocha && !this.fs.exists(`test/index.test.${this._ext}`)) {
      this.fs.copyTpl(this.templatePath(`test/command.test.${this._ext}.ejs`), this.destinationPath(`test/index.test.${this._ext}`), opts)
    }
  }

  private _writeMulti() {
    this._writePlugin()
    this.fs.copyTpl(this.templatePath('bin/run'), this.destinationPath('bin/run'), this)
    this.fs.copyTpl(this.templatePath('bin/run.cmd'), this.destinationPath('bin/run.cmd'), this)
    if (!this.fs.exists(`src/index.${this._ext}`)) {
      this.fs.copyTpl(this.templatePath(`multi/src/index.${this._ext}`), this.destinationPath(`src/index.${this._ext}`), this)
    }
  }
}

export = App
