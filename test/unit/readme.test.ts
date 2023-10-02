import {expect, test} from '@oclif/test'
import {readFileSync, writeFileSync} from 'node:fs'
import {writeFile} from 'node:fs/promises'
import {remove} from 'fs-extra'
import * as path from 'node:path'

process.env.NODE_ENV = 'development'

const readme = readFileSync('README.md', 'utf8')

describe('readme', () => {
  test
  .stdout()
  .finally(() => writeFile('README.md', readme))
  .command(['readme'])
  .it('runs readme', () => {
    // expect(readFileSync('README.md', 'utf8')).to.contain('manifest')
    expect(readFileSync('README.md', 'utf8')).to.contain('multi')
  })

  test
  .stdout()
  .finally(() => writeFile('README.md', readme))
  .finally(() => remove('docs'))
  .command(['readme', '--multi'])
  .it('runs readme --multi', () => {
    // expect(readFileSync('README.md', 'utf8')).to.contain('manifest')
    expect(readFileSync('README.md', 'utf8')).to.contain('multi')
  })

  describe('with command that has an alias', () => {
    const rootPath = path.join(__dirname, '../fixtures/cli-command-with-alias')
    const readmePath = path.join(rootPath, 'README.md')
    const originalReadme = readFileSync(readmePath, 'utf8')
    const aliasOutput = '`oclif hi`'

    test
    .stdout()
    .finally(() => writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', stub => stub.returns(rootPath))
    .command(['readme'])
    .it('--aliases flag (default)', () => {
      const newReadme = readFileSync(readmePath, 'utf8')
      expect(newReadme).to.contain(aliasOutput)
    })

    test
    .stdout()
    .finally(() => writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', stub => stub.returns(rootPath))
    .command(['readme', '--no-aliases'])
    .it('--no-aliases flag', () => {
      const newReadme = readFileSync(readmePath, 'utf8')
      expect(newReadme).not.to.contain(aliasOutput)
    })
  })

  describe('with custom help that implements formatCommand', () => {
    const rootPath = path.join(__dirname, '../fixtures/cli-with-custom-help')
    const readmePath = path.join(rootPath, 'README.md')
    const originalReadme = readFileSync(readmePath, 'utf8')

    test
    .stdout()
    .finally(() => writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', stub => stub.returns(rootPath))
    .command(['readme'])
    .it('writes custom help to the readme', () => {
      const newReadme = readFileSync(readmePath, 'utf8')

      expect(newReadme).to.contain('Custom help for hello')
    })
  })

  describe('with custom help that implements command', () => {
    const rootPath = path.join(__dirname, '../fixtures/cli-with-old-school-custom-help')
    const readmePath = path.join(rootPath, 'README.md')
    const originalReadme = readFileSync(readmePath, 'utf8')

    test
    .stdout()
    .finally(() => writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', stub => stub.returns(rootPath))
    .command(['readme'])
    .it('writes custom help to the readme', () => {
      const newReadme = readFileSync(readmePath, 'utf8')

      expect(newReadme).to.contain('Custom help for hello')
    })
  })

  describe('with custom help that does not implement formatCommand', () => {
    const rootPath = path.join(__dirname, '../fixtures/cli-with-custom-help-no-format-command')
    const readmePath = path.join(rootPath, 'README.md')
    const originalReadme = readFileSync(readmePath, 'utf8')

    test
    .stdout()
    .finally(() => writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', stub => stub.returns(rootPath))
    .command(['readme'])
    .catch(error => {
      expect(error.message).to.contain('Please implement `formatCommand`')
    })
    .it('prints a helpful error message')
  })
})
