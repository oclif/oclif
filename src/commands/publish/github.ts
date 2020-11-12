import {Command} from '@oclif/command'
// import * as Octokit from '@octokit/rest'
// import * as fs from 'fs-extra'
// import * as path from 'path'
// import * as qq from 'qqjs'

// import * as Tarballs from '../../tarballs'
// import {log as action} from '../../tarballs/log'

export default class Publish extends Command {
  static hidden = true

  static description = 'publish an oclif CLI to GitHub Releases'

  static hidden = true

  static flags = {
    // root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    // 'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    // xz: flags.boolean({description: 'also create xz tarballs'}),
    // prerelease: flags.boolean({description: 'identify as prerelease'}),
    // draft: flags.boolean({description: 'create an unpublished release'}),
  }

  // octokit = new Octokit()

  async run() {
    this.warn('TODO: finish this')
    // if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN must be set')
    // const {flags} = this.parse(Publish)
    // if (process.platform === 'win32') throw new Error('pack does not function on windows')
    // const {'node-version': nodeVersion, prerelease, draft} = flags
    // const channel = flags.prerelease ? 'prerelease' : 'stable'
    // const root = path.resolve(flags.root)
    // const config = await Tarballs.config(root)
    // const version = config.version
    // const baseWorkspace = qq.join([config.root, 'tmp', 'base'])
    // const updateConfig = config.pjson.oclif.update || {}
    // const targets = updateConfig.node && updateConfig.node.targets || []
    // if (!targets) throw new Error('specify oclif.targets in package.json')

    // // first create the generic base workspace that will be copied later
    // await Tarballs.build({config, channel, output: baseWorkspace, version})

    // const tarballs: {target: string, tarball: string}[] = []
    // for (let [platform, arch] of targets.map(t => t.split('-'))) {
    //   const t = await Tarballs.target({config, platform, arch, channel, version, baseWorkspace, nodeVersion, xz: flags.xz})
    //   tarballs.push(t)
    // }

    // this.octokit.authenticate({
    //   type: 'token',
    //   token: process.env.GH_TOKEN,
    // })
    // const tag = `v${version}`
    // const [owner, repo] = config.pjson.repository.split('/')
    // const commitish = await Tarballs.gitSha(config.root)
    // const release = await this.findOrCreateRelease({owner, repo, tag, prerelease, draft, commitish})

    // for (let {tarball} of tarballs) {
    //   await this.addFileToRelease(release, `${tarball}.tar.gz`)
    //   if (flags.xz) await this.addFileToRelease(release, `${tarball}.tar.xz`)
    // }
    // }

    // async findOrCreateRelease({owner, repo, tag, prerelease, draft, commitish}: {owner: string, repo: string, tag: string, prerelease: boolean, draft: boolean, commitish: string}) {
    // const findRelease = async () => {
    //   const {data} = await this.octokit.repos.getReleaseByTag({owner, repo, tag})
    //   action(`found existing release ${tag}`)
    //   return data
    // }
    // const createRelease = async () => {
    //   action(`creating ${tag} release`)
    //   const {data} = await this.octokit.repos.createRelease({
    //     owner,
    //     repo,
    //     target_commitish: commitish,
    //     tag_name: tag,
    //     prerelease,
    //     draft,
    //   })
    //   return data
    // }
    // try {
    //   return await findRelease()
    // } catch (err) {
    //   this.debug(err)
    // }
    // return createRelease()
    // }

  // async addFileToRelease(release: {upload_url: string}, file: string) {
    // action(`uploading ${file}`)
    // await this.octokit.repos.uploadAsset({
    //   url: release.upload_url,
    //   file: fs.createReadStream(file),
    //   contentType: 'application/gzip',
    //   contentLength: fs.statSync(file).size,
    //   name: qq.path.basename(file),
    //   label: qq.path.basename(file),
    // })
  }
}
