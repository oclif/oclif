import {Interfaces} from '@oclif/core'
import * as findYarnWorkspaceRoot from 'find-yarn-workspace-root'
import * as path from 'path'
import * as qq from 'qqjs'

import {log} from '../log'

import {writeBinScripts} from './bin'
import {BuildConfig, IManifest} from './config'
import {fetchNodeBinary} from './node'
import {commitAWSDir, templateShortKey} from '../upload-util'

const pack = async (from: string, to: string) => {
  const prevCwd = qq.cwd()
  qq.cd(path.dirname(from))
  await qq.mkdirp(path.dirname(to))
  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`)
  await (to.endsWith('gz') ?
    qq.x('tar', ['czf', to, path.basename(from)]) :
    qq.x(`tar c ${path.basename(from)} | xz > ${to}`))
  qq.cd(prevCwd)
}

export async function build(c: BuildConfig, options: {
  platform?: string;
  pack?: boolean;
} = {}) {
  const {xz, config} = c
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    const stdout = await qq.x.stdout('npm', ['pack', '--unsafe-perm'], {cwd: c.root})
    return path.join(c.root, stdout.split('\n').pop()!)
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(c.workspace())
    await qq.mv(tarball, c.workspace())
    tarball = path.basename(tarball)
    tarball = qq.join([c.workspace(), tarball])
    qq.cd(c.workspace())
    await qq.x(`tar -xzf ${tarball}`)
    // eslint-disable-next-line no-await-in-loop
    for (const f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(c.workspace())
    const pjson = await qq.readJSON('package.json')
    pjson.version = config.version
    pjson.oclif.update = pjson.oclif.update || {}
    pjson.oclif.update.s3 = pjson.oclif.update.s3 || {}
    pjson.oclif.update.s3.bucket = c.s3Config.bucket
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(c.workspace())
    const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
    const yarn = await qq.exists([yarnRoot, 'yarn.lock'])
    if (yarn) {
      await qq.cp([yarnRoot, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      let lockpath = qq.join(c.root, 'package-lock.json')
      if (!await qq.exists(lockpath)) {
        lockpath = qq.join(c.root, 'npm-shrinkwrap.json')
      }
      await qq.cp(lockpath, '.')
      await qq.x('npm install --production')
    }
  }
  const pretarball = async () => {
    qq.cd(c.workspace())
    const pjson = await qq.readJSON('package.json')
    const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
    const yarn = await qq.exists([yarnRoot, 'yarn.lock'])
    if (pjson.scripts.pretarball) {
      yarn ?
        await qq.x('yarn run pretarball') :
        await qq.x('npm run pretarball', {})
    }
  }
  const buildTarget = async (target: { platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}) => {
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
    await qq.rm(workspace)
    await qq.cp(c.workspace(), workspace)
    await fetchNodeBinary({
      nodeVersion: c.nodeVersion,
      output: path.join(workspace, 'bin', 'node'),
      platform: target.platform,
      arch: target.arch,
      tmp: qq.join(config.root, 'tmp'),
    })
    if (options.pack === false) return
    await pack(workspace, c.dist(gzLocalKey))
    if (xz) await pack(workspace, c.dist(xzLocalKey))
    if (!c.updateConfig.s3.host) return
    const rollout = (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout)

    const gzCloudKey = `${commitAWSDir(config.version, c.gitSha, c.updateConfig.s3)}/${gzLocalKey}`
    const xzCloudKey = `${commitAWSDir(config.version, c.gitSha, c.updateConfig.s3)}/${xzLocalKey}`

    const manifest: IManifest = {
      rollout: rollout === false ? undefined : rollout,
      version: config.version,
      sha: c.gitSha,
      baseDir: templateShortKey('baseDir', target, {bin: c.config.bin}),
      gz: config.s3Url(gzCloudKey),
      xz: xz ? config.s3Url(xzCloudKey) : undefined,
      sha256gz: await qq.hash('sha256', c.dist(gzLocalKey)),
      sha256xz: xz ? await qq.hash('sha256', c.dist(xzLocalKey)) : undefined,
      node: {
        compatible: config.pjson.engines.node,
        recommended: c.nodeVersion,
      },
    }
    const manifestFilepath = c.dist(templateShortKey('manifest', {
      arch: target.arch,
      bin: c.config.bin,
      platform: target.platform,
      sha: c.gitSha,
      version: config.version,
    }))
    await qq.writeJSON(manifestFilepath, manifest)
  }
  log(`gathering workspace for ${config.bin} to ${c.workspace()}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await writeBinScripts({config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion})
  await pretarball()
  for (const target of c.targets) {
    if (!options.platform || options.platform === target.platform) {
      // eslint-disable-next-line no-await-in-loop
      await buildTarget(target)
    }
  }
  qq.cd(prevCwd)
}
