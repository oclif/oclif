import {Interfaces, ux} from '@oclif/core'
import findYarnWorkspaceRoot from 'find-yarn-workspace-root'
import {copy, emptyDir, move, readJSON, remove, writeJSON} from 'fs-extra'
import {exec as execSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {mkdir, readdir, rm} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'
import {lt} from 'semver'

import {log} from '../log'
import {commitAWSDir, templateShortKey} from '../upload-util'
import {hash, prettifyPaths} from '../util'
import {writeBinScripts} from './bin'
import {BuildConfig} from './config'
import {fetchNodeBinary} from './node'

const exec = promisify(execSync)

const platformFlags = (platform: string) => {
  if (platform === 'win32') return ' --force-local'
  if (platform === 'darwin') return ' --no-xattrs'
  return ''
}

const pack = async (from: string, to: string) => {
  const cwd = path.dirname(from)
  await mkdir(path.dirname(to), {recursive: true})
  log(`packing tarball from ${prettifyPaths(path.dirname(from))} to ${prettifyPaths(to)}`)

  const platformFlag = platformFlags(process.platform)

  if (to.endsWith('gz')) {
    return exec(`tar czf ${to} ${path.basename(from)}${platformFlag}`, {
      cwd,
    })
  }

  await exec(`tar cfJ ${to} ${path.basename(from)}${platformFlags}`, {cwd})
}

const isYarnProject = (yarnRootPath: string) => {
  const yarnLockFileName = 'yarn.lock'
  const rootYarnLockFilePath = path.join(yarnRootPath, yarnLockFileName)

  return existsSync(rootYarnLockFilePath)
}

const copyYarnDirectory = async (relativePath: string, yarnRootPath: string, workspacePath: string) => {
  const rootYarnDirectoryPath = path.join(yarnRootPath, relativePath)
  const workspaceYarnDirectoryPath = path.join(workspacePath, relativePath)

  if (existsSync(rootYarnDirectoryPath)) {
    // create the directory if it does not exist
    if (!existsSync(workspaceYarnDirectoryPath)) {
      await mkdir(workspaceYarnDirectoryPath, {recursive: true})
    }

    // recursively copy all files in the directory
    await copy(rootYarnDirectoryPath, workspaceYarnDirectoryPath)
  }
}

const copyCoreYarnFiles = async (yarnRootPath: string, workspacePath: string) => {
  // copy yarn dependencies lock file
  const yarnLockFileName = 'yarn.lock'
  const rootYarnLockFilePath = path.join(yarnRootPath, yarnLockFileName)
  const workspaceYarnLockFilePath = path.join(workspacePath, yarnLockFileName)

  if (existsSync(rootYarnLockFilePath)) {
    await copy(rootYarnLockFilePath, workspaceYarnLockFilePath)
  }

  // copy yarn configuration file
  const yarnConfigFileName = '.yarnrc.yml'
  const rootYarnConfigFilePath = path.join(yarnRootPath, yarnConfigFileName)
  const workspaceYarnConfigFilePath = path.join(workspacePath, yarnConfigFileName)

  if (existsSync(rootYarnConfigFilePath)) {
    await copy(rootYarnConfigFilePath, workspaceYarnConfigFilePath)
  }

  // copy yarn releases e.g. yarn may be installed via a local config path like "yarnPath"
  await copyYarnDirectory('./.yarn/releases/', yarnRootPath, workspacePath)
  // copy yarn plugins if they exists
  await copyYarnDirectory('./.yarn/plugins/', yarnRootPath, workspacePath)
}

type BuildOptions = {
  pack?: boolean
  parallel?: boolean
  platform?: string
  pruneLockfiles?: boolean
  tarball?: string
}

export async function build(c: BuildConfig, options: BuildOptions = {}): Promise<void> {
  log(`gathering workspace for ${c.config.bin} to ${c.workspace()}`)
  await extractCLI(options.tarball ?? (await packCLI(c)), c)
  await updatePJSON(c)
  await addDependencies(c)
  await writeBinScripts({
    baseWorkspace: c.workspace(),
    config: c.config,
    nodeOptions: c.nodeOptions,
    nodeVersion: c.nodeVersion,
  })
  await pretarball(c)
  if (options.pruneLockfiles) {
    await removeLockfiles(c)
  }

  if (!c.updateConfig.s3?.host || !c.updateConfig.s3?.bucket) {
    ux.warn('No S3 bucket or host configured. CLI will not be able to update itself.')
  }

  const targetsToBuild = c.targets.filter((t) => !options.platform || options.platform === t.platform)
  if (options.parallel) {
    log(`will build ${targetsToBuild.length} targets in parallel`)
    await Promise.all(targetsToBuild.map((t) => buildTarget(t, c, options)))
  } else {
    log(`will build ${targetsToBuild.length} targets sequentially`)
    for (const target of targetsToBuild) {
      // eslint-disable-next-line no-await-in-loop
      await buildTarget(target, c, options)
    }

    log(`finished building ${targetsToBuild.length} targets sequentially`)
  }
}

const isLockFile = (f: string) =>
  f.endsWith('package-lock.json') ||
  f.endsWith('yarn.lock') ||
  f.endsWith('npm-shrinkwrap.json') ||
  f.endsWith('oclif.lock') ||
  f.endsWith('pnpm-lock.yaml')

/** recursively remove all lockfiles from tarball after installing dependencies */
const removeLockfiles = async (c: BuildConfig) => {
  const files = await readdir(c.workspace(), {recursive: true})
  const lockfiles = files.filter((f) => isLockFile(f)).map((f) => path.join(c.workspace(), f))
  log(`removing ${lockfiles.length} lockfiles`)
  await Promise.all(lockfiles.map((f) => remove(f)))
}

/** runs the pretarball script from the cli being packed */
const pretarball = async (c: BuildConfig) => {
  const pjson = await readJSON(path.join(c.workspace(), 'package.json'))
  if (!pjson.scripts.pretarball) return
  const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
  let script = 'npm run pretarball'
  if (existsSync(path.join(yarnRoot, 'yarn.lock'))) script = 'yarn run pretarball'
  else if (existsSync(path.join(c.root, 'pnpm-lock.yaml'))) script = 'pnpm run pretarball'
  log(`running pretarball via ${script} in ${c.workspace()}`)
  await exec(script, {cwd: c.workspace()})
}

const updatePJSON = async (c: BuildConfig) => {
  const pjsonPath = path.join(c.workspace(), 'package.json')
  const pjson = await readJSON(pjsonPath)
  pjson.version = c.config.version
  pjson.oclif.update = pjson.oclif.update ?? {}
  pjson.oclif.update.s3 = pjson.oclif.update.s3 ?? {}
  pjson.oclif.update.s3.bucket = c.s3Config.bucket
  await writeJSON(pjsonPath, pjson, {spaces: 2})
}

const addDependencies = async (c: BuildConfig) => {
  const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root

  if (isYarnProject(yarnRoot)) {
    await copyCoreYarnFiles(yarnRoot, c.workspace())

    const {stdout} = await exec('yarn -v')
    const yarnVersion = stdout.charAt(0)
    if (yarnVersion === '1') {
      await exec('yarn --no-progress --production --non-interactive', {cwd: c.workspace()})
    } else if (yarnVersion === '2') {
      throw new Error('Yarn 2 is not supported yet. Try using Yarn 1, or Yarn 3')
    } else {
      try {
        await exec('yarn workspaces focus --production', {cwd: c.workspace()})
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('Command not found')) {
          throw new Error('Missing workspace tools. Run `yarn plugin import workspace-tools`.')
        }

        throw error
      }
    }
  } else if (existsSync(path.join(c.root, 'pnpm-lock.yaml'))) {
    await copy(path.join(c.root, 'pnpm-lock.yaml'), path.join(c.workspace(), 'pnpm-lock.yaml'))
    await exec('pnpm install --production', {cwd: c.workspace()})
  } else {
    const lockpath = existsSync(path.join(c.root, 'package-lock.json'))
      ? path.join(c.root, 'package-lock.json')
      : path.join(c.root, 'npm-shrinkwrap.json')
    await copy(lockpath, path.join(c.workspace(), path.basename(lockpath)))
    await exec('npm install --production', {cwd: c.workspace()})
  }
}

const packCLI = async (c: BuildConfig) => {
  const {stdout} = await exec('npm pack --unsafe-perm', {cwd: c.root})
  return path.join(c.root, stdout.trim().split('\n').pop()!)
}

const extractCLI = async (tarball: string, c: BuildConfig) => {
  const workspace = c.workspace()
  await emptyDir(workspace)
  const tarballNewLocation = path.join(workspace, path.basename(tarball))
  await move(tarball, tarballNewLocation)
  const tarCommand = `tar -xzf "${tarballNewLocation}"${process.platform === 'win32' ? ' --force-local' : ''}`
  await exec(tarCommand, {cwd: workspace})
  const files = await readdir(path.join(workspace, 'package'), {withFileTypes: true})
  await Promise.all(files.map((i) => move(path.join(workspace, 'package', i.name), path.join(workspace, i.name))))

  await Promise.all([
    rm(path.join(workspace, 'package'), {recursive: true}),
    rm(path.join(workspace, path.basename(tarball)), {recursive: true}),
    remove(path.join(workspace, 'bin', 'run.cmd')),
  ])
}

const buildTarget = async (
  target: {arch: Interfaces.ArchTypes; platform: Interfaces.PlatformTypes},
  c: BuildConfig,
  options: BuildOptions,
) => {
  if (target.platform === 'win32' && target.arch === 'arm64' && lt(c.nodeVersion, '20.0.0')) {
    ux.warn('win32-arm64 is only supported for node >=20.0.0. Skipping...')
    return
  }

  const workspace = c.workspace(target)
  const {arch, platform} = target
  const {bin, version} = c.config
  const {gitSha: sha} = c
  const templateShortKeyCommonOptions = {arch, bin, platform, sha, version}

  const [gzLocalKey, xzLocalKey] = ['.tar.gz', '.tar.xz'].map((ext) =>
    templateShortKey('versioned', {...templateShortKeyCommonOptions, ext}),
  )

  const base = path.basename(gzLocalKey)
  log(`building target ${base}`)
  log('copying workspace', c.workspace(), workspace)
  await emptyDir(workspace)
  await copy(c.workspace(), workspace)
  await fetchNodeBinary({
    arch,
    nodeVersion: c.nodeVersion,
    output: path.join(workspace, 'bin', 'node'),
    platform,
    tmp: path.join(c.config.root, 'tmp'),
  })
  if (options.pack === false) return
  if (options.parallel) {
    await Promise.all([pack(workspace, c.dist(gzLocalKey)), ...(c.xz ? [pack(workspace, c.dist(xzLocalKey))] : [])])
  } else {
    await pack(workspace, c.dist(gzLocalKey))
    if (c.xz) await pack(workspace, c.dist(xzLocalKey))
  }

  if (!c.updateConfig.s3?.host) return
  const rollout = typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout

  const gzCloudKey = `${commitAWSDir(version, sha, c.updateConfig.s3)}/${gzLocalKey}`
  const xzCloudKey = `${commitAWSDir(version, sha, c.updateConfig.s3)}/${xzLocalKey}`

  const [sha256gz, sha256xz] = await Promise.all([
    hash('sha256', c.dist(gzLocalKey)),
    ...(c.xz ? [hash('sha256', c.dist(xzLocalKey))] : []),
  ])

  const manifest: Interfaces.S3Manifest = {
    baseDir: templateShortKey('baseDir', {...target, bin}),
    gz: c.config.s3Url(gzCloudKey),
    node: {
      compatible: c.config.pjson.engines.node,
      recommended: c.nodeVersion,
    },
    rollout: rollout === false ? undefined : rollout,
    sha,
    sha256gz,
    sha256xz,
    version,
    xz: c.xz ? c.config.s3Url(xzCloudKey) : undefined,
  }
  const manifestFilepath = c.dist(templateShortKey('manifest', templateShortKeyCommonOptions))
  await writeJSON(manifestFilepath, manifest, {spaces: 2})
}
