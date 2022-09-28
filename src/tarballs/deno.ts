import {Interfaces} from '@oclif/core'
import * as path from 'path'
import * as qq from 'qqjs'

import {log} from '../log'

type Options = {
  denoVersion: string;
  output: string;
  platform: Interfaces.PlatformTypes;
  arch: Interfaces.ArchTypes | 'armv7l';
  tmp: string
}

// Inspired by https://deno.land/x/install@v0.1.6/install.sh?source
export async function fetchDenoBinary({denoVersion, output, platform, arch, tmp}: Options): Promise<string> {
  let target = ''
  if (platform === 'darwin') {
    if (arch === 'arm64') target = 'aarch64-apple-darwin'
    if (arch === 'x64') target = 'x86_64-apple-darwin'
  } else {
    throw new Error('Platform not supported for deno')
  }
  // else if (platform === 'linux') target = 'deno-x86_64-unknown-linux-gnu'
  // else if (platform === 'win32') target = 'x86_64-pc-windows-msvc'

  const denoBase = `deno-${target}`
  const zipPath = path.join(tmp, 'deno', `${denoBase}.zip`)
  const url = denoVersion === 'latest' ?
    `https://github.com/denoland/deno/releases/latest/download/${denoBase}.zip` :
    `https://github.com/denoland/deno/releases/download/${denoVersion}/${denoBase}.zip`

  const cache = path.join(tmp, 'cache', denoBase)

  const download = async () => {
    log(`downloading ${denoBase} from ${url}`)

    const basedir = path.dirname(zipPath)
    await qq.mkdirp(basedir)
    await qq.download(url, zipPath)
  }

  const extract = async () => {
    const denoTmp = path.join(tmp, 'deno')
    log(`extracting ${denoBase} into ${denoTmp}`)
    await qq.mkdirp(denoTmp)
    await qq.mkdirp(path.dirname(cache))
    await qq.x(`cd ${denoTmp} && unzip "${zipPath}"`)
    await qq.mv([denoTmp, 'deno'], [denoTmp, denoBase])
    await qq.mv([denoTmp, denoBase], cache)
  }

  if (await qq.exists(cache)) {
    await qq.cp(cache, output)
  } else {
    await download()
    await extract()
    await qq.cp(cache, output)
  }

  return output
}
