import {Interfaces} from '@oclif/core'
import * as findYarnWorkspaceRoot from 'find-yarn-workspace-root'
import {log} from '../log'
import * as path from 'node:path'
import {move, emptyDir, readJSON, writeJSON, remove, copy} from 'fs-extra'
import {existsSync} from 'node:fs'
import {mkdir, readdir, rm} from 'node:fs/promises'
import {writeBinScripts} from './bin'
import {BuildConfig} from './config'
import {fetchNodeBinary} from './node'
import {commitAWSDir, templateShortKey} from '../upload-util'
import {hash, prettifyPaths} from '../util'
import {exec as execSync} from 'node:child_process'
import {promisify} from 'node:util'

const exec = promisify(execSync)

const pack = async (from: string, to: string) => {
  const cwd = path.dirname(from)
  await mkdir(path.dirname(to), {recursive: true})
  log(`packing tarball from ${prettifyPaths(path.dirname(from))} to ${prettifyPaths(to)}`)
  to.endsWith('gz')
    ? await exec(`tar czf ${to} ${path.basename(from)}`, {cwd})
    : await exec(`tar cfJ ${to} ${path.basename(from)}`, {cwd})
}

export async function build(
  c: BuildConfig,
  options: {
    platform?: string
    pack?: boolean
    tarball?: string
    parallel?: boolean
  } = {},
): Promise<void> {
  const {xz, config} = c
  const packCLI = async () => {
    const {stdout} = await exec('npm pack --unsafe-perm', {cwd: c.root})
    return path.join(c.root, stdout.trim().split('\n').pop()!)
  }

  const extractCLI = async (tarball: string) => {
    await emptyDir(c.workspace())
    const tarballNewLocation = path.join(c.workspace(), path.basename(tarball))
    await move(tarball, tarballNewLocation)
    await exec(`tar -xzf "${tarballNewLocation}"`, {cwd: c.workspace()})

    await Promise.all(
      (await readdir(path.join(c.workspace(), 'package'), {withFileTypes: true})).map((i) =>
        move(path.join(c.workspace(), 'package', i.name), path.join(c.workspace(), i.name)),
      ),
    )

    await Promise.all([
      rm(path.join(c.workspace(), 'package'), {recursive: true}),
      rm(path.join(c.workspace(), path.basename(tarball)), {recursive: true}),
      remove(path.join(c.workspace(), 'bin', 'run.cmd')),
    ])
  }

  const updatePJSON = async () => {
    const pjsonPath = path.join(c.workspace(), 'package.json')
    const pjson = await readJSON(pjsonPath)
    pjson.version = config.version
    pjson.oclif.update = pjson.oclif.update || {}
    pjson.oclif.update.s3 = pjson.oclif.update.s3 || {}
    pjson.oclif.update.s3.bucket = c.s3Config.bucket
    await writeJSON(pjsonPath, pjson, {spaces: 2})
  }

  const addDependencies = async () => {
    const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
    if (existsSync(path.join(yarnRoot, 'yarn.lock'))) {
      await copy(path.join(yarnRoot, 'yarn.lock'), path.join(c.workspace(), 'yarn.lock'))

      const yarnVersion = (await exec('yarn -v')).stdout.charAt(0)
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
    } else {
      const lockpath = existsSync(path.join(c.root, 'package-lock.json'))
        ? path.join(c.root, 'package-lock.json')
        : path.join(c.root, 'npm-shrinkwrap.json')
      await copy(lockpath, path.join(c.workspace(), path.basename(lockpath)))
      await exec('npm install --production', {cwd: c.workspace()})
    }
  }

  const pretarball = async () => {
    const pjson = await readJSON(path.join(c.workspace(), 'package.json'))
    const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
    const yarn = existsSync(path.join(yarnRoot, 'yarn.lock'))
    if (pjson.scripts.pretarball) {
      yarn
        ? await exec('yarn run pretarball', {cwd: c.workspace()})
        : await exec('npm run pretarball', {cwd: c.workspace()})
    }
  }

  const buildTarget = async (target: {platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}) => {
    const workspace = c.workspace(target)
    const gzLocalKey = templateShortKey('versioned', '.tar.gz', {
      arch: target.arch,
      bin: c.config.bin,
      platform: target.platform,
      sha: c.gitSha,
      version: config.version,
    })

    const xzLocalKey = templateShortKey('versioned', '.tar.xz', {
      arch: target.arch,
      bin: c.config.bin,
      platform: target.platform,
      sha: c.gitSha,
      version: config.version,
    })
    const base = path.basename(gzLocalKey)
    log(`building target ${base}`)
    log('copying workspace', c.workspace(), workspace)
    await emptyDir(workspace)
    await copy(c.workspace(), workspace)
    await fetchNodeBinary({
      nodeVersion: c.nodeVersion,
      output: path.join(workspace, 'bin', 'node'),
      platform: target.platform,
      arch: target.arch,
      tmp: path.join(config.root, 'tmp'),
    })
    if (options.pack === false) return
    if (options.parallel) {
      await Promise.all([pack(workspace, c.dist(gzLocalKey))].concat(xz ? [pack(workspace, c.dist(xzLocalKey))] : []))
    } else {
      await pack(workspace, c.dist(gzLocalKey))
      if (xz) await pack(workspace, c.dist(xzLocalKey))
    }

    if (!c.updateConfig.s3.host) return
    const rollout = typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout

    const gzCloudKey = `${commitAWSDir(config.version, c.gitSha, c.updateConfig.s3)}/${gzLocalKey}`
    const xzCloudKey = `${commitAWSDir(config.version, c.gitSha, c.updateConfig.s3)}/${xzLocalKey}`

    const [sha256gz, sha256xz] = await Promise.all(
      [hash('sha256', c.dist(gzLocalKey))].concat(xz ? [hash('sha256', c.dist(xzLocalKey))] : []),
    )

    const manifest: Interfaces.S3Manifest = {
      rollout: rollout === false ? undefined : rollout,
      version: config.version,
      sha: c.gitSha,
      baseDir: templateShortKey('baseDir', target, {bin: c.config.bin}),
      gz: config.s3Url(gzCloudKey),
      xz: xz ? config.s3Url(xzCloudKey) : undefined,
      sha256gz,
      sha256xz,
      node: {
        compatible: config.pjson.engines.node,
        recommended: c.nodeVersion,
      },
    }
    const manifestFilepath = c.dist(
      templateShortKey('manifest', {
        arch: target.arch,
        bin: c.config.bin,
        platform: target.platform,
        sha: c.gitSha,
        version: config.version,
      }),
    )
    await writeJSON(manifestFilepath, manifest, {spaces: 2})
  }

  log(`gathering workspace for ${config.bin} to ${c.workspace()}`)
  await extractCLI(options.tarball ? options.tarball : await packCLI())
  await updatePJSON()
  await addDependencies()
  await writeBinScripts({config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion})
  await pretarball()
  const targetsToBuild = c.targets.filter((t) => !options.platform || options.platform === t.platform)
  if (options.parallel) {
    log(`will build ${targetsToBuild.length} targets in parallel`)
    await Promise.all(targetsToBuild.map((t) => buildTarget(t)))
  } else {
    log(`will build ${targetsToBuild.length} targets sequentially`)
    for (const target of targetsToBuild) {
      // eslint-disable-next-line no-await-in-loop
      await buildTarget(target)
    }

    log(`finished building ${targetsToBuild.length} targets sequentially`)
  }
}
