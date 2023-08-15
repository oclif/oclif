/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path'
import * as Generator from 'yeoman-generator'
import replace = require('replace-in-file');
import * as semver from 'semver'
import {Interfaces} from '@oclif/core'
import {cloneDeep} from 'lodash'
import * as chalk from 'chalk'
import {promisify} from 'util'
const exec = promisify(require('child_process').exec)

type EsmGeneratorOptions = {
  force: boolean;
  bumpVersion: 'major' | 'minor' | 'patch' | 'none';
  dryRun: boolean;
  moduleType: 'esm' | 'cjs';
  useExports: boolean;
  removeEslintRemoveNodeProtocol: boolean;
  bumpLibs: string[];
};

type MochaRc = {
  require: string[];
  'node-option': string[];
}

const icon = process.platform === 'win32' ? '»' : '›'

const dedupe = (arr: string[]): string[] => Array.from(new Set(arr))

const formatFromTo = (property: string, from: string | undefined, to: string | undefined): string => {
  if (!from) return `${icon} Adding ${chalk.bold(property)} ${chalk.cyan(to)}`
  if (!to) return `${icon} Removing ${chalk.bold(property)} ${chalk.red(from)}`
  return `${icon} Changing ${chalk.bold(property)} from ${chalk.red(from)} to ${chalk.cyan(to)}`
}

const formatObjectFromTo = (property: string, from: unknown | undefined, to: unknown): string => {
  const toStringified = JSON.stringify(to)
  const fromStringified = JSON.stringify(from)
  if (!from) return `${icon} Adding ${chalk.bold(property)} ${chalk.cyan(toStringified)}`
  if (!to) return `${icon} Removing ${chalk.bold(property)} ${chalk.red(fromStringified)}`
  return `${icon} Changing ${chalk.bold(property)} from ${chalk.red(fromStringified)} to ${chalk.cyan(toStringified)}`
}

export default class ESM extends Generator {
  public constructor(args: string | string[], private opts: EsmGeneratorOptions) {
    super(args, opts)
  }

  // eslint-disable-next-line complexity
  public async writing(): Promise<void> {
    this.log('Updating tsconfig.json')
    const tsconfig = this.fs.readJSON('tsconfig.json') as unknown as Interfaces.TSConfig
    const tsConfigCopy = cloneDeep(tsconfig) as Interfaces.TSConfig
    tsconfig.compilerOptions.module = 'es2020'
    this.log(formatFromTo('module', tsConfigCopy.compilerOptions.module, tsconfig.compilerOptions.module))

    if (this.opts.moduleType === 'esm') {
      tsconfig.compilerOptions.moduleResolution = 'node16'
      tsconfig['ts-node'] = {...tsconfig['ts-node'], esm: true, scope: true}
      this.log(formatFromTo('moduleResolution', tsConfigCopy.compilerOptions.moduleResolution, tsconfig.compilerOptions.moduleResolution))
      this.log(formatObjectFromTo('ts-node', tsConfigCopy['ts-node'], tsconfig['ts-node']))
    }

    if (!this.opts.dryRun) this.fs.writeJSON('tsconfig.json', tsconfig)

    const pjson = this.fs.readJSON('package.json') as unknown as Interfaces.PJSON & {bin?: string | Record<string, string>}
    const pjsonCopy = cloneDeep(pjson) as Interfaces.PJSON & {bin?: string | Record<string, string>}
    this.log('Updating package.json')

    if (this.opts.useExports) {
      delete pjson.main
      pjson.exports = './lib/index.js'
      this.log(formatFromTo('exports', pjsonCopy.exports, pjson.exports))
      this.log(formatFromTo('main', pjsonCopy.main, pjson.main))
    } else if (!pjson.main) {
      pjson.main = './lib/index.js'
      this.log(formatFromTo('main', pjsonCopy.main, pjson.main))
    }

    if (this.opts.moduleType === 'esm') {
      pjson.type = 'module'
      this.log(formatFromTo('type', pjsonCopy.type, pjson.type))
    }

    if (this.opts.bumpVersion !== 'none') {
      pjson.version = semver.inc(pjson.version, this.opts.bumpVersion) as string
      this.log(formatFromTo('version', pjsonCopy.version, pjson.version))
    }

    if (pjson.bin && typeof pjson.bin === 'string') {
      pjson.bin = pjson.bin.replace('run', 'run.js')
      this.log(formatFromTo('bin', pjsonCopy.bin as string, pjson.bin))
    } else if (pjson.bin) {
      pjson.bin = Object.fromEntries(
        Object.entries(pjson.bin).map(([key, value]) => [key, value.replace('run', 'run.js')]),
      )
      this.log(formatObjectFromTo('bin', pjsonCopy.bin, pjson.bin))
    }

    const distTags = await exec('npm view @oclif/core dist-tags --json')
    pjson.dependencies!['@oclif/core'] = `^${JSON.parse(distTags.stdout).beta}`
    this.log(formatFromTo('dependencies[@oclif/core]', pjsonCopy.dependencies!['@oclif/core'], pjson.dependencies!['@oclif/core']))

    for (const lib of dedupe(['eslint', 'mocha', 'ts-node', '@oclif/test', ...this.opts.bumpLibs])) {
      // eslint-disable-next-line no-await-in-loop
      const distTags = await exec(`npm view ${lib} dist-tags --json`)
      if (pjson.dependencies![lib]) {
        pjson.dependencies![lib] = `^${JSON.parse(distTags.stdout).latest}`
        this.log(formatFromTo(`dependencies[${lib}]`, pjsonCopy.dependencies![lib], pjson.dependencies![lib]))
      }

      if (pjson.devDependencies![lib]) {
        pjson.devDependencies![lib] = `^${JSON.parse(distTags.stdout).latest}`
        this.log(formatFromTo(`devDependencies[${lib}]`, pjsonCopy.devDependencies![lib], pjson.devDependencies![lib]))
      }
    }

    const typescriptVersion = pjson.devDependencies?.typescript
    if (typescriptVersion && semver.lt(typescriptVersion, '4.7.4')) {
      pjson.devDependencies!.typescript = '^4.9.5'
      this.log(formatFromTo('devDependencies[typescript]', pjsonCopy.devDependencies!.typescript, pjson.devDependencies!.typescript))
    }

    if (!this.opts.dryRun) this.fs.writeJSON('package.json', pjson)

    this.log('Updating bin scripts')
    this.log(icon, 'Replacing bin/dev with bin/dev.js')
    this.log(icon, 'Replacing bin/run with bin/run.js')
    this.sourceRoot(path.join(__dirname, '../../templates'))
    if (!this.opts.dryRun) {
      this.fs.copyTpl(this.templatePath(this.opts.moduleType === 'esm' ? 'esm/dev.js.ejs' : 'cjs/dev.js.ejs'), 'bin/dev.js')
      this.fs.copyTpl(this.templatePath(this.opts.moduleType === 'esm' ? 'esm/run.js.ejs' : 'cjs/run.js.ejs'), 'bin/run.js')
      this.fs.delete('bin/dev')
      this.fs.delete('bin/run')
    }

    if (this.opts.moduleType === 'esm') {
      this.log('Updating test setup')
      this.log(icon, 'Updating test/helpers/init.js')
      if (!this.opts.dryRun) this.fs.copyTpl(this.templatePath('test/init.js.ejs'), 'test/helpers/init.js')

      this.log('Updating .mocharc.json')
      const mochaRc = this.fs.readJSON('.mocharc.json') as unknown as MochaRc
      const mochaRcCopy = cloneDeep(mochaRc) as MochaRc
      mochaRc['node-option'] = dedupe([...mochaRc['node-option'] ?? [], 'loader=ts-node/esm'])
      this.log(formatObjectFromTo('node-options', mochaRcCopy['node-option'], mochaRc['node-option']))

      mochaRc.require = mochaRc.require.filter(i => i !== 'source-map-support/register')
      this.log(formatObjectFromTo('require', mochaRcCopy.require, mochaRc.require))

      if (!this.opts.dryRun) this.fs.writeJSON('.mocharc.json', mochaRc)
    }

    if (this.opts.removeEslintRemoveNodeProtocol) {
      this.log('Removing // eslint-disable-next-line unicorn/prefer-node-protocol from code base')
      if (!this.opts.dryRun) {
        replace.sync({
          files: `${this.env.cwd}/**/*`,
          from: /\/\/ eslint-disable-next-line unicorn\/prefer-node-protocol/g,
          to: '',
        })
      }
    }
  }

  public async end(): Promise<void> {
    await exec('chmod +x bin/dev.js', {cwd: this.env.cwd})
    await exec('chmod +x bin/run.js', {cwd: this.env.cwd})

    if (!this.opts.dryRun) this.log('Migration complete.')
    if (!this.opts.dryRun && this.opts.moduleType === 'esm') this.log('Further changes may be required for your plugin to compile.')
  }
}
