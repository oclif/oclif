import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {join} from 'node:path'

describe('readme', () => {
  it('runs readme', async () => {
    const {result} = await runCommand<string>('readme --dry-run')
    expect(result).to.contain('Adds commands to README.md in current directory.')
  })

  describe('multi', () => {
    it('runs readme --multi', async () => {
      const {result} = await runCommand<string>('readme --multi --dry-run')
      expect(result).to.contain('Adds commands to README.md in current directory.')
    })

    it('writes only subtopics to their own files', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-with-nested-topics')
      const {result} = await runCommand<string>(
        `readme --multi --nested-topics-depth 2 --plugin-directory ${rootPath} --dry-run`,
      )
      expect(result).to.contain('* [`oclif roottopic:subtopic1`](docs/roottopic/subtopic1.md) - Subtopic1 description')
      expect(result).to.contain('* [`oclif roottopic:subtopic2`](docs/roottopic/subtopic2.md) - Subtopic2 description')
    })

    it('writes only subtopics to their own files with " " topic separator', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-with-nested-topics-with-space-separator')
      const {result} = await runCommand<string>(
        `readme --multi --nested-topics-depth 2 --plugin-directory ${rootPath} --dry-run`,
      )
      expect(result).to.contain('* [`oclif roottopic subtopic1`](docs/roottopic/subtopic1.md) - Subtopic1 description')
      expect(result).to.contain('* [`oclif roottopic subtopic2`](docs/roottopic/subtopic2.md) - Subtopic2 description')
    })
  })

  describe('with command that has an alias', () => {
    it('--aliases flag (default)', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-command-with-alias')
      const {result} = await runCommand<string>(`readme --plugin-directory ${rootPath} --dry-run`)
      expect(result).to.contain('`oclif hi`')
    })

    it('--no-aliases flag', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-command-with-alias')
      const {result} = await runCommand<string>(`readme --plugin-directory ${rootPath} --no-aliases --dry-run`)
      expect(result).to.not.contain('`oclif hi`')
    })
  })

  describe('with custom help that implements formatCommand', () => {
    it('writes custom help to the readme', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-with-custom-help')
      const {result} = await runCommand<string>(`readme --plugin-directory ${rootPath} --dry-run`)
      expect(result).to.contain('Custom help for hello')
    })
  })

  describe('with custom help that implements command', () => {
    it('writes custom help to the readme', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-with-old-school-custom-help')
      const {result} = await runCommand<string>(`readme --plugin-directory ${rootPath} --dry-run`)
      expect(result).to.contain('Custom help for hello')
    })
  })

  describe('with custom help that does not implement formatCommand', () => {
    it('prints a helpful error message', async () => {
      const rootPath = join(__dirname, '../fixtures/cli-with-custom-help-no-format-command')
      const {error} = await runCommand<string>(`readme --plugin-directory ${rootPath} --dry-run`)
      expect(error?.message).to.contain('Please implement `formatCommand`')
    })
  })
})
