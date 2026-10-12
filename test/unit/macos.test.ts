import {type Interfaces} from '@oclif/core'
import {expect} from 'chai'

import {scripts} from '../../src/commands/pack/macos'

describe('pack macos', () => {
  it('resolves user directories at uninstall time', () => {
    const config: Pick<Interfaces.Config, 'cacheDir' | 'configDir' | 'dataDir' | 'dirname' | 'pjson'> = {
      cacheDir: '/Users/ci-builder/Library/Caches/mycli',
      configDir: '/Users/ci-builder/.config/mycli',
      dataDir: '/Users/ci-builder/.local/share/mycli',
      dirname: 'mycli',
      pjson: {oclif: {macos: {identifier: 'com.example.mycli'}}},
    }

    const uninstall = scripts.uninstall(config as Interfaces.Config, undefined)

    expect(uninstall).to.contain('SUDO_USER')
    expect(uninstall).to.contain('$REAL_HOME/Library/Caches/mycli')
    expect(uninstall).to.contain('$REAL_HOME/.config/mycli')
    expect(uninstall).to.contain('$REAL_HOME/.local/share/mycli')
    expect(uninstall).not.to.contain('/Users/ci-builder')
    expect(uninstall).not.to.contain('eval ')
  })
})
