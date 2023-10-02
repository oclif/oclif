import {castArray} from 'lodash'
import * as path from 'node:path'
import * as Generator from 'yeoman-generator'
import {GeneratorOptions} from '../types'
import {Interfaces} from '@oclif/core'

const {version} = require('../../package.json')

export interface Options extends GeneratorOptions {
  event: string
}

export default class Hook extends Generator {
  public pjson!: Interfaces.PJSON

  constructor(
    args: string | string[],
    public options: Options,
  ) {
    super(args, options)
  }

  private hasMocha(): boolean {
    return Boolean(this.pjson.devDependencies?.mocha)
  }

  public async prompting(): Promise<void> {
    this.pjson = this.fs.readJSON('package.json') as unknown as Interfaces.PJSON
    this.pjson.oclif = this.pjson.oclif || {}
    if (!this.pjson) throw new Error('not in a project directory')
    this.log(`Adding a ${this.options.event} hook to ${this.pjson.name}! Version: ${version}`)
  }

  public writing(): void {
    this.sourceRoot(path.join(__dirname, '../../templates'))
    this.fs.copyTpl(
      this.templatePath('src/hook.ts.ejs'),
      this.destinationPath(`src/hooks/${this.options.event}/${this.options.name}.ts`),
      this,
    )
    if (this.hasMocha()) {
      this.fs.copyTpl(
        this.templatePath('test/hook.test.ts.ejs'),
        this.destinationPath(`test/hooks/${this.options.event}/${this.options.name}.test.ts`),
        this,
      )
    }

    this.pjson.oclif = this.pjson.oclif || {}
    this.pjson.oclif.hooks = this.pjson.oclif.hooks || {}
    const hooks = this.pjson.oclif.hooks
    const p = `./dist/hooks/${this.options.event}/${this.options.name}`
    if (hooks[this.options.event]) {
      hooks[this.options.event] = castArray(hooks[this.options.event])
      hooks[this.options.event] = hooks[this.options.event].concat(p)
    } else {
      this.pjson.oclif.hooks[this.options.event] = p
    }

    this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson)
  }
}
