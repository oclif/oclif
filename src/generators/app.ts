// tslint:disable no-floating-promises
// tslint:disable no-console

import * as fs from 'fs'
import * as _ from 'lodash'
import * as path from 'path'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')

const nps = require('nps-utils')
const sortPjson = require('sort-pjson')
const fixpack = require('fixpack')
const debug = require('debug')('generator-anycli')
const {version} = require('../../package.json')

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
    'semantic-release': boolean
    typescript: boolean
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
    engines: {node: string}
    github: {repo: string, user: string}
    author: string
    files: string
    license: string
    options: {
      mocha: boolean
      typescript: boolean
      'semantic-release': boolean
    }
  }
  mocha!: boolean
  semantic_release!: boolean
  ts!: boolean
  get _ext() { return this.ts ? 'ts' : 'js' }
  get _bin() {
    let bin = this.pjson.anycli && (this.pjson.anycli.bin || this.pjson.anycli.dirname) || this.pjson.name
    if (bin.includes('/')) bin = bin.split('/').pop()
    return bin
  }

  constructor(args: any, opts: any) {
    super(args, opts)

    this.type = opts.type
    this.path = opts.path
    this.options = {
      defaults: opts.defaults,
      mocha: opts.options.includes('mocha'),
      'semantic-release': opts.options.includes('semantic-release'),
      typescript: opts.options.includes('typescript'),
    }
  }

  async prompting() {
    let msg
    switch (this.type) {
      case 'single':
        msg = 'Time to build a single command CLI with anycli!'
        break
      case 'multi':
        msg = 'Time to build a multi command CLI with anycli!'
        break
      default:
        msg = `Time to build a anycli ${this.type}!`
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
      anycli: {},
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
    try {
      let yml = this.fs.read('.circleci/config.yml')
      this.options['semantic-release'] = yml.includes('semantic-release')
    } catch { }
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
          when: ['single', 'multi'].includes(this.type) && !this.pjson.anycli.bin,
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
          name: 'engines.node',
          message: 'node version supported',
          default: defaults.engines.node,
          when: !this.pjson.engines.node,
        },
        {
          type: 'input',
          name: 'github.user',
          message: 'github owner of repository (https://github.com/OWNER/repo)',
          default: defaults.repository.split('/').slice(0, -1).pop(),
          when: !this.pjson.repository,
        },
        {
          type: 'input',
          name: 'github.repo',
          message: 'github name of repository (https://github.com/owner/REPO)',
          default: (answers: any) => (this.pjson.repository || answers.name || this.pjson.name).split('/').pop(),
          when: !this.pjson.repository,
        },
        {
          type: 'checkbox',
          name: 'options',
          message: 'components to include',
          choices: [
            {name: 'mocha', checked: !!this.pjson.devDependencies.mocha},
            {name: 'typescript', checked: !!this.pjson.devDependencies.typescript},
            {name: 'semantic-release', checked: this.options['semantic-release']},
          ],
          filter: ((arr: string[]) => _.keyBy(arr)) as any,
        },
        // {
        //   type: 'string',
        //   name: 'files',
        //   message: 'npm files to pack',
        //   default: (answers: any) => answers.options.typescript ? '/lib' : '/src',
        //   filter: stringToArray as any,
        // },
      ]) as any
    }
    debug(this.answers)
    this.options = this.answers.options
    this.ts = this.options.typescript
    this.mocha = this.options.mocha
    this.semantic_release = this.options['semantic-release']

    this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.engines.node = this.answers.engines ? this.answers.engines.node : defaults.engines.node
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.files = this.answers.files || defaults.files || [(this.ts ? '/lib' : '/src')]
    this.pjson.license = this.answers.license || defaults.license
    this.pjson.repository = this.answers.github ? `${this.answers.github.user}/${this.answers.github.repo}` : defaults.repository
    this.pjson.scripts.posttest = 'yarn run lint'
    // this.pjson.scripts.precommit = 'yarn run lint'
    if (this.ts && this.mocha) {
      this.pjson.scripts.lint = 'concurrently -p command "tsc -p test --noEmit" "tslint -p test -t stylish"'
    } else if (this.ts) {
      this.pjson.scripts.lint = 'concurrently -p command "tsc -p . --noEmit" "tslint -p . -t stylish"'
    } else {
      this.pjson.scripts.lint = 'eslint .'
    }
    if (this.mocha) {
      this.pjson.scripts.test = `mocha --forbid-only "test/**/*.test.${this._ext}"`
    } else {
      this.pjson.scripts.test = 'echo NO TESTS'
    }
    if (this.ts) {
      this.pjson.scripts.build = 'rm -rf lib && tsc'
      this.pjson.scripts.prepublishOnly = 'yarn run build'
    }
    if (['plugin', 'multi'].includes(this.type)) {
      this.pjson.scripts.prepublishOnly = nps.series(this.pjson.scripts.prepublishOnly, 'anycli-dev manifest')
      this.pjson.scripts.postpublish = 'rm .anycli.manifest.json'
      this.pjson.files.push('.anycli.manifest.json')
    }
    this.pjson.keywords = defaults.keywords || [this.type === 'plugin' ? 'anycli-plugin' : 'anycli']
    this.pjson.homepage = defaults.homepage || `https://github.com/${this.pjson.repository}`
    this.pjson.bugs = defaults.bugs || `https://github.com/${this.pjson.repository}/issues`

    if (['single', 'multi'].includes(this.type)) {
      this.pjson.anycli.bin = this.answers.bin || this._bin
      this.pjson.bin = this.pjson.bin || {}
      this.pjson.bin[this.pjson.anycli.bin] = './bin/run'
      this.pjson.files.push('/bin')
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
        this.pjson.anycli = {
          commands: `./${this.ts ? 'lib' : 'src'}/commands`,
          // hooks: {init: `./${this.ts ? 'lib' : 'src'}/hooks/init`},
          ...this.pjson.anycli,
        }
        break
        default:
    }
    if (this.type === 'plugin' && !this.pjson.anycli.devPlugins) {
      this.pjson.anycli.devPlugins = [
        '@anycli/plugin-help',
      ]
    }
    if (this.type === 'multi' && !this.pjson.anycli.plugins) {
      this.pjson.anycli.plugins = [
        '@anycli/plugin-help',
      ]
    }

    if (this.pjson.anycli && Array.isArray(this.pjson.anycli.plugins)) {
      this.pjson.anycli.plugins.sort()
    }

    if (this.ts) {
      this.fs.copyTpl(this.templatePath('tslint.json'), this.destinationPath('tslint.json'), this)
      this.fs.copyTpl(this.templatePath('tsconfig.json'), this.destinationPath('tsconfig.json'), this)
      if (this.mocha) {
        this.fs.copyTpl(this.templatePath('test/tsconfig.json'), this.destinationPath('test/tsconfig.json'), this)
      }
    }
    if (this.mocha && !this.fs.exists('test')) {
      this.fs.copyTpl(this.templatePath('test/helpers/init.js'), this.destinationPath('test/helpers/init.js'), this)
      this.fs.copyTpl(this.templatePath('test/mocha.opts'), this.destinationPath('test/mocha.opts'), this)
    }
    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('fixpack/config.json'))
    }
    if (_.isEmpty(this.pjson.anycli)) delete this.pjson.anycli
    this.pjson.files = _.uniq((this.pjson.files || []).sort())
    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    this.fs.copyTpl(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'), this)
    this.fs.copyTpl(this.templatePath('scripts/greenkeeper'), this.destinationPath('.circleci/greenkeeper'), this)
    // if (this.semantic_release) {
    //   this.fs.copyTpl(this.templatePath('scripts/release'), this.destinationPath('.circleci/release'), this)
    // }
    // this.fs.copyTpl(this.templatePath('scripts/setup_git'), this.destinationPath('.circleci/setup_git'), this)
    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), this)
    this.fs.copyTpl(this.templatePath('circle.yml.ejs'), this.destinationPath('.circleci/config.yml'), this)
    this.fs.copyTpl(this.templatePath('appveyor.yml.ejs'), this.destinationPath('appveyor.yml'), this)

    // git
    // if (this.fromScratch) this.spawnCommandSync('git', ['init'])
    this.fs.copyTpl(this.templatePath('gitattributes'), this.destinationPath('.gitattributes'), this)

    this.fs.write(this.destinationPath('.gitignore'), this._gitignore())
    this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
    const eslintignore = this._eslintignore()
    if (eslintignore.trim()) this.fs.write(this.destinationPath('.eslintignore'), this._eslintignore())
    // this.fs.copyTpl(this.templatePath('package-scripts.js.ejs'), this.destinationPath('package-scripts.js'), this)
    // if (this.semantic_release) {
    //   this.fs.copyTpl(this.templatePath('.commitlintrc.js'), this.destinationPath('.commitlintrc.js'), this)
    // }

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
          '@anycli/config',
          '@anycli/command',
          '@anycli/errors',
          '@anycli/plugin-help',
        )
        // devDependencies.push(
        //   'globby',
        // )
        break
      case 'plugin':
        dependencies.push(
          '@anycli/command',
          '@anycli/config',
          '@anycli/errors',
        )
        devDependencies.push(
          '@anycli/dev-cli',
          '@anycli/plugin-help',
          'globby',
        )
        break
      case 'multi':
        dependencies.push(
          '@anycli/config',
          '@anycli/command',
          '@anycli/errors',
          '@anycli/plugin-help',
          'globby',
        )
        devDependencies.push(
          '@anycli/dev-cli',
        )
    }
    if (this.mocha) {
      devDependencies.push(
        'mocha',
        'chai',
      )
      if (this.type !== 'base') devDependencies.push(
        '@anycli/test',
      )
    }
    if (this.ts) {
      devDependencies.push(
        // '@types/ansi-styles',
        '@types/chai',
        '@types/mocha',
        '@types/node',
        // '@types/strip-ansi',
        // '@types/supports-color',
        'typescript',
        'ts-node',
        '@anycli/tslint',
        'concurrently',
      )
    } else {
      devDependencies.push(
        'eslint',
        'eslint-config-anycli',
      )
    }
    let yarnOpts = {} as any
    if (process.env.YARN_MUTEX) yarnOpts.mutex = process.env.YARN_MUTEX
    Promise.all([
      this.yarnInstall(devDependencies, {...yarnOpts, dev: true, ignoreScripts: true}),
      this.yarnInstall(dependencies, yarnOpts),
    ]).then(() => {
      console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
    })
  }

  private _gitignore(): string {
    const existing = this.fs.exists(this.destinationPath('.gitignore')) ? this.fs.read(this.destinationPath('.gitignore')).split('\n') : []
    return _([
      '*-debug.log',
      '*-error.log',
      '/node_modules',
      '/tmp',
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
    if (!fs.existsSync('src/commands')) {
      this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), this.destinationPath(`src/commands/hello.${this._ext}`), {...opts, name: 'hello'})
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
    if (!this.fs.exists(`src/index.${this._ext}`)) {
      this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), this.destinationPath(`src/index.${this._ext}`), opts)
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
