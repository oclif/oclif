import {Interfaces} from '@oclif/core'
import {expect} from 'chai'

import {S3Config} from '../../src/tarballs/config'
import {channelAWSDir, commitAWSDir, s3Keys, templateShortKey} from '../../src/upload-util'

const makeS3Config = (folder = ''): S3Config => ({folder}) as S3Config

const makeConfig = (hasCustomTemplates: boolean) => {
  const config = {
    pjson: {
      oclif: {
        update: {
          s3: {
            templates: hasCustomTemplates
              ? {
                  manifest: 'custom/<%- platform %>-<%- arch %>-manifest',
                  unversioned: 'custom/<%- platform %>-<%- arch %><%- ext %>',
                  versioned: 'custom/<%- platform %>-<%- arch %><%- ext %>',
                }
              : undefined,
          },
        },
      },
    },
    s3Key(type: string, ...args: unknown[]) {
      // Mock that returns predictable values encoding the call args
      const ext = typeof args[0] === 'string' ? args[0] : ''
      const opts = (typeof args[0] === 'object' ? args[0] : args[1]) as Record<string, string> | undefined
      return [
        'custom',
        type,
        `${opts?.platform ?? 'noplatform'}-${opts?.arch ?? 'noarch'}${ext}`,
        ...(opts?.channel ? [opts.channel] : []),
      ].join('/')
    },
  } as unknown as Interfaces.Config

  return config
}

const defaultOpts = {bin: 'mycli', sha: 'abc1234', version: '1.2.3'}
const target = {arch: 'x64' as Interfaces.ArchTypes, platform: 'linux' as Interfaces.PlatformTypes}

describe('upload-util', () => {
  describe('templateShortKey', () => {
    it('should render a deb template', () => {
      const key = templateShortKey('deb', {
        arch: 'amd64',
        bin: 'foo',
        sha: '123456',
        version: '1.2.3',
        versionShaRevision: '1',
      })
      expect(key).to.equal('foo_1_amd64.deb')
    })

    it('should render a macos template', () => {
      const key = templateShortKey('macos', {
        arch: 'x64',
        bin: 'foo',
        sha: '123456',
        version: '1.2.3',
      })
      expect(key).to.equal('foo-v1.2.3-123456-x64.pkg')
    })

    it('should render a win32 template', () => {
      const key = templateShortKey('win32', {
        arch: 'x64',
        bin: 'foo',
        sha: '123456',
        version: '1.2.3',
      })
      expect(key).to.equal('foo-v1.2.3-123456-x64.exe')
    })

    it('should render a manifest template', () => {
      const key = templateShortKey('manifest', {
        arch: 'x64',
        bin: 'foo',
        platform: 'linux',
        sha: '123456',
        version: '1.2.3',
      })
      expect(key).to.equal('foo-v1.2.3-123456-linux-x64-buildmanifest')
    })

    it('should render a unversioned template', () => {
      const key = templateShortKey('unversioned', {
        arch: 'x64',
        bin: 'foo',
        ext: '.tar.gz',
        platform: 'linux',
      })
      expect(key).to.equal('foo-linux-x64.tar.gz')
    })

    it('should render a versioned template', () => {
      const key = templateShortKey('versioned', {
        arch: 'x64',
        bin: 'foo',
        ext: '.tar.gz',
        platform: 'linux',
        sha: '123456',
        version: '1.2.3',
      })
      expect(key).to.equal('foo-v1.2.3-123456-linux-x64.tar.gz')
    })

    it('should render a baseDir template', () => {
      const key = templateShortKey('baseDir', {
        bin: 'foo',
      })
      expect(key).to.equal('foo')
    })
  })

  describe('commitAWSDir', () => {
    it('should return path without folder', () => {
      expect(commitAWSDir('1.2.3', 'abc1234', makeS3Config())).to.equal('versions/1.2.3/abc1234')
    })

    it('should return path with folder', () => {
      expect(commitAWSDir('1.2.3', 'abc1234', makeS3Config('my-cli'))).to.equal('my-cli/versions/1.2.3/abc1234')
    })

    it('should handle folder with trailing slash', () => {
      expect(commitAWSDir('1.2.3', 'abc1234', makeS3Config('my-cli/'))).to.equal('my-cli/versions/1.2.3/abc1234')
    })
  })

  describe('channelAWSDir', () => {
    it('should return path without folder', () => {
      expect(channelAWSDir('stable', makeS3Config())).to.equal('channels/stable')
    })

    it('should return path with folder', () => {
      expect(channelAWSDir('stable', makeS3Config('my-cli'))).to.equal('my-cli/channels/stable')
    })

    it('should handle folder with trailing slash', () => {
      expect(channelAWSDir('stable', makeS3Config('my-cli/'))).to.equal('my-cli/channels/stable')
    })
  })

  describe('s3Keys', () => {
    describe('default templates (no custom s3 templates)', () => {
      const config = makeConfig(false)
      const s3Config = makeS3Config()

      it('versioned() returns templated filename with version and sha', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.versioned('.tar.gz', target)).to.equal('mycli-v1.2.3-abc1234-linux-x64.tar.gz')
        expect(keys.versioned('.tar.xz', target)).to.equal('mycli-v1.2.3-abc1234-linux-x64.tar.xz')
      })

      it('manifest() returns templated manifest filename', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.manifest(target)).to.equal('mycli-v1.2.3-abc1234-linux-x64-buildmanifest')
      })

      it('cloudKey() prepends commitAWSDir path', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.cloudKey('some-file.tar.gz')).to.equal('versions/1.2.3/abc1234/some-file.tar.gz')
      })

      it('cloudKey() respects s3Config folder', () => {
        const keys = s3Keys(config, makeS3Config('my-cli'), defaultOpts)
        expect(keys.cloudKey('some-file.tar.gz')).to.equal('my-cli/versions/1.2.3/abc1234/some-file.tar.gz')
      })

      it('channelTarball() returns channel path with unversioned filename', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.channelTarball('.tar.gz', target, 'stable')).to.equal(
          'channels/stable/mycli-linux-x64.tar.gz',
        )
        expect(keys.channelTarball('.tar.xz', target, 'beta')).to.equal(
          'channels/beta/mycli-linux-x64.tar.xz',
        )
      })

      it('channelTarball() respects s3Config folder', () => {
        const keys = s3Keys(config, makeS3Config('my-cli'), defaultOpts)
        expect(keys.channelTarball('.tar.gz', target, 'stable')).to.equal(
          'my-cli/channels/stable/mycli-linux-x64.tar.gz',
        )
      })

      it('channelManifest() returns channel path with unversioned manifest name', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.channelManifest(target, 'stable')).to.equal(
          'channels/stable/mycli-linux-x64-buildmanifest',
        )
      })

      it('channelManifest() strips version and sha from manifest name', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const result = keys.channelManifest(target, 'stable')
        expect(result).to.not.include('v1.2.3')
        expect(result).to.not.include('abc1234')
      })

      it('indexFilename() returns short unversioned name without path prefix', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.indexFilename('.tar.gz', target, 'stable')).to.equal('mycli-linux-x64.tar.gz')
        expect(keys.indexFilename('.tar.xz', target, 'stable')).to.equal('mycli-linux-x64.tar.xz')
      })

      it('indexFilename() does not include channel path', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const result = keys.indexFilename('.tar.gz', target, 'stable')
        expect(result).to.not.include('channels')
        expect(result).to.not.include('stable')
      })

      it('works with different targets', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const darwinArm = {arch: 'arm64' as const, platform: 'darwin' as Interfaces.PlatformTypes}
        expect(keys.versioned('.tar.gz', darwinArm)).to.equal('mycli-v1.2.3-abc1234-darwin-arm64.tar.gz')
        expect(keys.manifest(darwinArm)).to.equal('mycli-v1.2.3-abc1234-darwin-arm64-buildmanifest')
        expect(keys.channelTarball('.tar.gz', darwinArm, 'stable')).to.equal(
          'channels/stable/mycli-darwin-arm64.tar.gz',
        )
      })

      it('end-to-end: cloudKey(versioned()) produces the full upload path', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const localKey = keys.versioned('.tar.gz', target)
        const cloudKey = keys.cloudKey(localKey)
        expect(cloudKey).to.equal('versions/1.2.3/abc1234/mycli-v1.2.3-abc1234-linux-x64.tar.gz')
      })

      it('end-to-end: cloudKey(manifest()) produces the full upload path', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const localKey = keys.manifest(target)
        const cloudKey = keys.cloudKey(localKey)
        expect(cloudKey).to.equal('versions/1.2.3/abc1234/mycli-v1.2.3-abc1234-linux-x64-buildmanifest')
      })
    })

    describe('custom templates (s3 templates configured)', () => {
      const config = makeConfig(true)
      const s3Config = makeS3Config()

      it('versioned() delegates to config.s3Key', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.versioned('.tar.gz', target)).to.equal('custom/versioned/linux-x64.tar.gz')
        expect(keys.versioned('.tar.xz', target)).to.equal('custom/versioned/linux-x64.tar.xz')
      })

      it('manifest() delegates to config.s3Key', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.manifest(target)).to.equal('custom/manifest/linux-x64')
      })

      it('cloudKey() returns localKey as-is', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.cloudKey('any/path/file.tar.gz')).to.equal('any/path/file.tar.gz')
      })

      it('channelTarball() delegates to config.s3Key with channel', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.channelTarball('.tar.gz', target, 'stable')).to.equal(
          'custom/unversioned/linux-x64.tar.gz/stable',
        )
      })

      it('channelManifest() delegates to config.s3Key with channel', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        expect(keys.channelManifest(target, 'stable')).to.equal('custom/manifest/linux-x64/stable')
      })

      it('indexFilename() delegates to config.s3Key (same as channelTarball)', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const indexName = keys.indexFilename('.tar.gz', target, 'stable')
        const channelKey = keys.channelTarball('.tar.gz', target, 'stable')
        expect(indexName).to.equal(channelKey)
      })

      it('end-to-end: cloudKey(versioned()) returns versioned key as-is', () => {
        const keys = s3Keys(config, s3Config, defaultOpts)
        const localKey = keys.versioned('.tar.gz', target)
        const cloudKey = keys.cloudKey(localKey)
        expect(cloudKey).to.equal(localKey)
      })
    })
  })
})
