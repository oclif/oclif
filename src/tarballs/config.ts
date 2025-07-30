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

type TarFlags = Interfaces.OclifConfiguration['tarFlags']

const DEFAULT_TAR_FLAGS: TarFlags = {win32: '--force-local'}

export type S3Config = BuildConfig['updateConfig']['s3'] & {
  acl?: ObjectCannedACL
} & {folder?: string; indexVersionLimit?: number}

export type UpdateConfig = Interfaces.OclifConfiguration['update'] & {
  s3?: Interfaces.S3 & {acl?: ObjectCannedACL}
}

export type BuildConfig = {
  config: Interfaces.Config
  dist(input: string): string
  gitSha: string
  nodeOptions: string[]
  nodeVersion: string
  root: string
  s3Config: S3Config
  tarFlags?: TarFlags
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
  options: {sha?: string; targets?: string[]; xz?: boolean} = {},
): Promise<BuildConfig> {
  const config = await Config.load({devPlugins: false, root: path.resolve(root), userPlugins: false})
  root = config.root
  const _gitSha = options.sha ?? (await gitSha(root, {short: true}))
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

      if (t === 'linux-arm' && semver.gt(nodeVersion, '24.0.0')) {
        ux.warn(`32-bit Arm (armv7l) builds are not available for Node.js 24 and later.
          If you are targeting 64-bit Arm, use 'linux-arm64'. Otherwise, use a Node.js version older than 24.
          See https://nodejs.org/en/blog/release/v24.0.0 for more information.`)
        return false
      }

      if (t === 'win32-x86' && semver.gt(nodeVersion, '24.0.0')) {
        ux.warn('win32-x86 is not supported for Node.js 24 and later. Skipping...')
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

  const existingTarFlags = config.pjson.oclif.tarFlags
  const tarFlags = existingTarFlags ? {...DEFAULT_TAR_FLAGS, ...existingTarFlags} : DEFAULT_TAR_FLAGS

  return {
    config,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    gitSha: _gitSha,
    nodeOptions,
    nodeVersion,
    root,
    s3Config,
    tarFlags,
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
