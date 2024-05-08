import {expect} from 'chai'

import {templateShortKey} from '../../src/upload-util'

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
