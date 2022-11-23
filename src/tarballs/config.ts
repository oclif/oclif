import {CliUx, Interfaces, Config} from '@oclif/core'

import * as path from 'path'
import * as semver from 'semver'
import * as fs from 'fs-extra'

import {compact} from '../util'
import {templateShortKey} from '../upload-util'
import {exec as execSync} from 'child_process'
import {promisify} from 'node:util'

const exec = promisify(execSync)
export const TARGETS = [
  'linux-x64',
  'linux-arm',
  'win32-x64',
  'win32-x86',
  'darwin-x64',
  'darwin-arm64',
]

export interface BuildConfig {
  root: string;
  gitSha: string;
  config: Interfaces.Config;
  nodeVersion: string;
  tmp: string;
  updateConfig: BuildConfig['config']['pjson']['oclif']['update'];
  s3Config: BuildConfig['updateConfig']['s3'] & { folder?: string; indexVersionLimit?: number};
  xz: boolean;
  targets: { platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}[];
  workspace(target?: { platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}): string;
  dist(input: string): string;
}

export async function gitSha(cwd: string, options: {short?: boolean} = {}): Promise<string> {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return (await exec(`git ${args.join(' ')}`, {cwd})).stdout.trim()
}

async function Tmp(config: Interfaces.Config,
) {
  const tmp = path.join(config.root, 'tmp')
  await fs.promises.mkdir(tmp, {recursive: true})
  return tmp
}

export async function buildConfig(root: string, options: {xz?: boolean; targets?: string[]} = {}): Promise<BuildConfig> {
  const config = await Config.load({root: path.resolve(root), devPlugins: false, userPlugins: false})
  root = config.root
  const _gitSha = await gitSha(root, {short: true})
  // eslint-disable-next-line new-cap
  const tmp = await Tmp(config)
  const updateConfig = config.pjson.oclif.update || {}
  updateConfig.s3 = updateConfig.s3 || {}
  const nodeVersion = updateConfig.node.version || process.versions.node
  const targets = compact(options.targets || updateConfig.node.targets || TARGETS)
  .filter(t => {
    if (t === 'darwin-arm64' && semver.lt(nodeVersion, '16.0.0')) {
      CliUx.ux.warn('darwin-arm64 is only supported for node >=16.0.0. Skipping...')
      return false
    }

    return true
  })
  .map(t => {
    const [platform, arch] = t.split('-') as [Interfaces.PlatformTypes, Interfaces.ArchTypes]
    return {platform, arch}
  })
  return {
    root,
    gitSha: _gitSha,
    config,
    tmp,
    updateConfig,
    xz: options?.xz ?? updateConfig?.s3?.xz ?? true,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    nodeVersion,
    workspace(target) {
      const base = path.join(config.root, 'tmp')
      if (target && target.platform) return path.join(base, [target.platform, target.arch].join('-'), templateShortKey('baseDir', {bin: config.bin}))
      return path.join(base, templateShortKey('baseDir', {bin: config.bin}))
    },
    targets,
  }
}
