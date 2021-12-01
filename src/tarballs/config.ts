import * as Config from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

import {compact} from '../util'
import {templateShortKey} from '../upload-util'

export const TARGETS = [
  'linux-x64',
  'linux-arm',
  'win32-x64',
  'win32-x86',
  'darwin-x64',
]

export interface BuildConfig {
  root: string;
  gitSha: string;
  config: Config.IConfig;
  nodeVersion: string;
  version: string;
  tmp: string;
  updateConfig: BuildConfig['config']['pjson']['oclif']['update'];
  s3Config: BuildConfig['updateConfig']['s3'] & { folder?: string; indexVersionLimit?: number};
  xz: boolean;
  targets: {platform: Config.PlatformTypes; arch: Config.ArchTypes}[];
  workspace(target?: {platform: Config.PlatformTypes; arch: Config.ArchTypes}): string;
  dist(input: string): string;
}

export interface IManifest {
  version: string;
  sha: string;
  gz: string;
  xz?: string;
  sha256gz: string;
  sha256xz?: string;
  baseDir: string;
  rollout?: number;
  node: {
    compatible: string;
    recommended: string;
  };
}

export function gitSha(cwd: string, options: {short?: boolean} = {}) {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return qq.x.stdout('git', args, {cwd})
}

async function Tmp(config: Config.IConfig) {
  const tmp = path.join(config.root, 'tmp')
  await qq.mkdirp(tmp)
  return tmp
}

export async function buildConfig(root: string, options: {xz?: boolean; targets?: string[]} = {}): Promise<BuildConfig> {
  const config = await Config.load({root: path.resolve(root), devPlugins: false, userPlugins: false})
  root = config.root
  const _gitSha = await gitSha(root, {short: true})
  const version = config.version.includes('-') ? `${config.version}.${_gitSha}` : config.version
  // eslint-disable-next-line new-cap
  const tmp = await Tmp(config)
  const updateConfig = config.pjson.oclif.update || {}
  updateConfig.s3 = updateConfig.s3 || {}
  return {
    root,
    gitSha: _gitSha,
    config,
    tmp,
    updateConfig,
    version,
    xz: typeof options.xz === 'boolean' ? options.xz : Boolean(updateConfig.s3.xz),
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    nodeVersion: updateConfig.node.version || process.versions.node,
    workspace(target) {
      const base = qq.join(config.root, 'tmp')
      if (target && target.platform) return qq.join(base, [target.platform, target.arch].join('-'), templateShortKey('baseDir', {bin: config.bin}))
      return qq.join(base, templateShortKey('baseDir', {bin: config.bin}))
    },
    targets: compact(options.targets || updateConfig.node.targets || TARGETS).map(t => {
      const [platform, arch] = t.split('-') as [Config.PlatformTypes, Config.ArchTypes]
      return {platform, arch}
    }),
  }
}
