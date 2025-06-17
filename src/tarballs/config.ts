import {ObjectCannedACL} from '@aws-sdk/client-s3'
import {Config, Interfaces, ux} from '@oclif/core'
import {exec as execSync} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'
import * as semver from 'semver'

import {templateShortKey} from '../upload-util'
import {castArray, compact} from '../util'

const exec = promisify(execSync)
export const TARGETS = [
  'linux-x64',
  'linux-arm',
  'linux-arm64',
  'win32-x64',
  'win32-x86',
  'win32-arm64',
  'darwin-x64',
  'darwin-arm64',
]

export type S3Config = BuildConfig['updateConfig']['s3'] & {
  acl?: ObjectCannedACL
} & {folder?: string; indexVersionLimit?: number}

export type UpdateConfig = Interfaces.OclifConfiguration['update'] & {
  s3?: Interfaces.S3 & {acl?: ObjectCannedACL}
}

export type PackConfig = {
  tarFlags?: {
    [platform: string]: string
  }
}

export type BuildConfig = {
  config: Interfaces.Config
  dist(input: string): string
  gitSha: string
  nodeOptions: string[]
  nodeVersion: string
  packConfig: PackConfig
  root: string
  s3Config: S3Config
  targets: {arch: Interfaces.ArchTypes; platform: Interfaces.PlatformTypes}[]
  tmp: string
  updateConfig: UpdateConfig
  workspace(target?: {arch: Interfaces.ArchTypes; platform: Interfaces.PlatformTypes}): string
  xz: boolean
}

export async function gitSha(cwd: string, options: {short?: boolean} = {}): Promise<string> {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  const {stdout} = await exec(`git ${args.join(' ')}`, {cwd})
  return stdout.trim()
}

async function Tmp(config: Interfaces.Config) {
  const tmp = path.join(config.root, 'tmp')
  await mkdir(tmp, {recursive: true})
  return tmp
}

export async function buildConfig(
  root: string,
  options: {targets?: string[]; xz?: boolean} = {},
): Promise<BuildConfig> {
  const config = await Config.load({devPlugins: false, root: path.resolve(root), userPlugins: false})
  root = config.root
  const _gitSha = await gitSha(root, {short: true})
  // eslint-disable-next-line new-cap
  const tmp = await Tmp(config)
  const updateConfig = (config.pjson.oclif.update || {}) as UpdateConfig
  updateConfig.s3 = updateConfig.s3 || {}
  const nodeVersion = updateConfig.node?.version || process.versions.node
  const nodeOptions = castArray((updateConfig.node ?? ({} as {options?: string | string[]})).options ?? [])
  const targets = compact(options.targets || updateConfig.node?.targets || TARGETS)
    .filter((t) => {
      if (t === 'darwin-arm64' && semver.lt(nodeVersion, '16.0.0')) {
        ux.warn('darwin-arm64 is only supported for node >=16.0.0. Skipping...')
        return false
      }

      return true
    })
    .map((t) => {
      const [platform, arch] = t.split('-') as [Interfaces.PlatformTypes, Interfaces.ArchTypes]
      return {arch, platform}
    })

  const s3Config = {
    ...updateConfig.s3,
    acl: updateConfig.s3.acl as ObjectCannedACL | undefined,
  }

  // NOTE: Type assertion needed until @oclif/core is updated with pack property
  const oclifWithPack = config.pjson.oclif as Interfaces.OclifConfiguration & {pack?: PackConfig}
  const packConfig = oclifWithPack.pack ?? {}

  return {
    config,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    gitSha: _gitSha,
    nodeOptions,
    nodeVersion,
    packConfig,
    root,
    s3Config,
    targets,
    tmp,
    updateConfig,
    workspace(target) {
      const base = path.join(config.root, 'tmp')
      if (target && target.platform)
        return path.join(base, [target.platform, target.arch].join('-'), templateShortKey('baseDir', {bin: config.bin}))
      return path.join(base, templateShortKey('baseDir', {bin: config.bin}))
    },
    xz: options?.xz ?? updateConfig?.s3?.xz ?? true,
  }
}
