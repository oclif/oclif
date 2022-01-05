import * as _ from 'lodash'
import * as path from 'path'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')
import {GeneratorOptions, PackageJson} from '../types'

const {version} = require('../../package.json')

export default class Command extends Generator {
  public options: GeneratorOptions
  public pjson!: PackageJson

  constructor(args: string | string[], opts: GeneratorOptions) {
    super(args, opts)
    this.options = {
      name: opts.name,
      defaults: opts.defaults,
      force: opts.force,
    }
  }

  private hasMocha(): boolean {
    return Boolean(this.pjson.devDependencies?.mocha)
  }

  public async prompting(): Promise<void> {
    this.pjson = this.fs.readJSON('package.json') as unknown as PackageJson
    if (!this.pjson) throw new Error('not in a project directory')
    this.pjson.oclif = this.pjson.oclif || {}
    this.log(yosay(`Adding a command to ${this.pjson.name} Version: ${version}`))
  }

  public writing(): void {
    const cmdPath = this.options.name.split(':').join('/')
    this.sourceRoot(path.join(__dirname, '../../templates'))
    let bin = this.pjson.oclif.bin || this.pjson.oclif.dirname || this.pjson.name
    if (bin.includes('/')) bin = bin.split('/').pop()!
    const cmd = `${bin} ${this.options.name}`
    const commandPath = this.destinationPath(`src/commands/${cmdPath}.ts`)
    const opts = {...this.options, bin, cmd, _, type: 'command', path: commandPath}
    this.fs.copyTpl(this.templatePath('src/command.ts.ejs'), commandPath, opts)
    if (this.hasMocha()) {
      this.fs.copyTpl(this.templatePath('test/command.test.ts.ejs'), this.destinationPath(`test/commands/${cmdPath}.test.ts`), opts)
    }
  }
}
