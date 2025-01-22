import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import _ from 'lodash'
import {exec as execSync} from 'node:child_process'
import path from 'node:path'
import {promisify} from 'node:util'

import {gitSha} from '../../src/tarballs'
import {deleteFolder, developerSalesforceCom} from '../helpers/helper'

const exec = promisify(execSync)
const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalPJSON = _.cloneDeep(pjson)
const target = [process.platform, process.arch].join('-')

const onlyLinux = process.platform === 'linux' ? it : it.skip
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:deb', () => {
  let bucket: string
  let basePrefix: string
  const root = path.join(__dirname, '../tmp/test/publish')

  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    pjson.oclif.update.node.version = process.versions.node
    pjson.oclif.binAliases = ['oclif2']
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
    await fs.emptyDir(root)
  })

  afterEach(async () => {
    if (!process.env.PRESERVE_ARTIFACTS) {
      await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    }

    await fs.writeJSON(pjsonPath, originalPJSON, {spaces: 2})
  })

  onlyLinux('publishes valid releases', async () => {
    await runCommand('pack deb', undefined, {print: true})

    await runCommand('upload deb', undefined, {print: true})

    const sha = await gitSha(process.cwd(), {short: true})

    const debUrl = `https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/apt/oclif_${pjson.version.split('-')[0]}.${sha}-1_amd64.deb`
    console.log('downloading .deb from', debUrl)
    // download the deb
    await exec(`curl -sL ${debUrl} -o ${root}/oclif.deb`)
    // install the deb
    await exec(`sudo dpkg -i ${root}/oclif.deb`)
    // test the bin
    const {stdout: oclif} = await exec('oclif --version')
    expect(oclif).to.contain(`oclif/${pjson.version} ${target} node-v${pjson.oclif.update.node.version}`)
    // test the bin alias
    const {stdout: oclif2} = await exec('oclif2 --version')
    expect(oclif2).to.contain(`oclif/${pjson.version} ${target} node-v${pjson.oclif.update.node.version}`)
  })
})
