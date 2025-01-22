import {Interfaces} from '@oclif/core'
import retry from 'async-retry'
import {copy, ensureDir, move} from 'fs-extra'
import {exec as execSync} from 'node:child_process'
import {createWriteStream, existsSync} from 'node:fs'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {pipeline} from 'node:stream/promises'
import {promisify} from 'node:util'

import {log} from '../log'
import {checkFor7Zip} from '../util'

const exec = promisify(execSync)

const RETRY_TIMEOUT_MS = 1000

type Options = {
  arch: 'armv7l' | Interfaces.ArchTypes
  nodeVersion: string
  output: string
  platform: Interfaces.PlatformTypes
  tmp: string
}

export async function fetchNodeBinary({arch, nodeVersion, output, platform, tmp}: Options): Promise<string> {
  if (arch === 'arm') arch = 'armv7l'
  let nodeBase = `node-v${nodeVersion}-${platform}-${arch}`
  let tarball = path.join(tmp, 'node', `${nodeBase}.tar.xz`)
  let url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.tar.xz`
  if (platform === 'win32') {
    await checkFor7Zip()
    nodeBase = `node-v${nodeVersion}-win-${arch}`
    tarball = path.join(tmp, 'node', `${nodeBase}.7z`)
    url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.7z`
    output += '.exe'
  }

  let cache = path.join(tmp, 'cache', `node-v${nodeVersion}-${platform}-${arch}`)
  if (platform === 'win32') cache += '.exe'

  const download = async () => {
    log(`downloading ${nodeBase} (${url})`)
    await Promise.all([ensureDir(path.join(tmp, 'cache', nodeVersion)), ensureDir(path.join(tmp, 'node'))])
    const shasums = path.join(tmp, 'cache', nodeVersion, 'SHASUMS256.txt.asc')
    const {default: got} = await import('got')
    if (!existsSync(shasums)) {
      await pipeline(
        got.stream(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt.asc`),
        createWriteStream(shasums),
      )
    }

    const basedir = path.dirname(tarball)
    await mkdir(basedir, {recursive: true})
    await pipeline(got.stream(url), createWriteStream(tarball))
    if (platform !== 'win32')
      await exec(`grep "${path.basename(tarball)}" "${shasums}" | shasum -a 256 -c -`, {cwd: basedir})
  }

  const extract = async () => {
    log(`extracting ${nodeBase}`)
    const nodeTmp = path.join(tmp, 'node')
    await mkdir(nodeTmp, {recursive: true})
    await mkdir(path.dirname(cache), {recursive: true})

    if (platform === 'win32') {
      await exec(`7z x -bd -y "${tarball}"`, {cwd: nodeTmp})
      await move(path.join(nodeTmp, nodeBase, 'node.exe'), path.join(cache, 'node.exe'))
    } else {
      await exec(`tar -C "${tmp}/node" -xJf "${tarball}"`)
      await move(path.join(nodeTmp, nodeBase, 'bin', 'node'), path.join(cache, 'node'))
    }
  }

  if (!existsSync(cache)) {
    await retry(download, {
      factor: 1,
      maxTimeout: RETRY_TIMEOUT_MS,
      minTimeout: RETRY_TIMEOUT_MS,
      onRetry(_e, attempt) {
        log(`retrying node download (attempt ${attempt})`)
      },
      retries: 3,
    })
    await extract()
  }

  await copy(path.join(cache, getFilename(platform)), output)

  return output
}

const getFilename = (platform: string): string => (platform === 'win32' ? 'node.exe' : 'node')
