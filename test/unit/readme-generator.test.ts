/* eslint-disable import/no-named-as-default-member */
import {Config, ux} from '@oclif/core'
import {expect} from 'chai'
import sinon from 'sinon'

import ReadmeGenerator from '../../src/readme-generator'

class TestReadmeGenerator extends ReadmeGenerator {
  public constructor(config: Config, options: {outputDir: string; readmePath: string}) {
    super(config, options)
  }

  async read(): Promise<string> {
    return ''
  }

  async write(): Promise<void> {}
}

describe('ReadmeGenerator', () => {
  let config: Config

  beforeEach(async () => {
    config = await Config.load(__dirname)
    sinon.stub(ux, 'stdout').returns()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('commands', () => {
    it('should render commands', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
          },
          description: 'say hello to anyone',
          id: 'hello',
        },
      ]
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.commands(commands)
      expect(rendered).to.equal(`* [\`oclif hello PERSON\`](#oclif-hello-person)

## \`oclif hello PERSON\`

say hello to anyone

\`\`\`
USAGE
  $ oclif hello PERSON

ARGUMENTS
  PERSON  name of person to say hello to

DESCRIPTION
  say hello to anyone
\`\`\``)
    })

    it('should render command with custom usage', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
          },
          description: 'say hello to anyone',
          id: 'hello',
          usage: 'hello PERSON -f <value>',
        },
      ]
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.commands(commands)
      expect(rendered).to.equal(`* [\`oclif hello PERSON -f <value>\`](#oclif-hello-person--f-value)

## \`oclif hello PERSON -f <value>\`

say hello to anyone

\`\`\`
USAGE
  $ oclif hello PERSON -f <value>

ARGUMENTS
  PERSON  name of person to say hello to

DESCRIPTION
  say hello to anyone
\`\`\``)
    })

    it('should ignore hidden args in header', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
            // eslint-disable-next-line perfectionist/sort-objects
            other: {
              description: 'name of person to say hello to',
              hidden: true,
              name: 'OTHER',
            },
          },
          description: 'say hello to anyone',
          id: 'hello',
        },
      ]
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.commands(commands)
      expect(rendered).to.equal(`* [\`oclif hello PERSON\`](#oclif-hello-person)

## \`oclif hello PERSON\`

say hello to anyone

\`\`\`
USAGE
  $ oclif hello PERSON [OTHER]

ARGUMENTS
  PERSON  name of person to say hello to

DESCRIPTION
  say hello to anyone
\`\`\``)
    })

    it('should render command with templated usage', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
          },
          description: 'say hello to anyone',
          id: 'hello',
          usage: '<%- config.bin %> <%- command.id %>',
        },
      ]
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.commands(commands)
      expect(rendered).to.equal(`* [\`oclif oclif hello\`](#oclif-oclif-hello)

## \`oclif oclif hello\`

say hello to anyone

\`\`\`
USAGE
  $ oclif hello oclif hello

ARGUMENTS
  PERSON  name of person to say hello to

DESCRIPTION
  say hello to anyone
\`\`\``)
    })

    it('should render commands with templated descriptions', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
          },
          description: 'This is the name of the command: <%- config.bin %> <%- command.id %>',
          id: 'hello',
        },
      ]
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.commands(commands)
      expect(rendered).to.equal(`* [\`oclif hello PERSON\`](#oclif-hello-person)

## \`oclif hello PERSON\`

This is the name of the command: oclif hello

\`\`\`
USAGE
  $ oclif hello PERSON

ARGUMENTS
  PERSON  name of person to say hello to

DESCRIPTION
  This is the name of the command: oclif hello
\`\`\``)
    })
  })

  describe('multiCommands', () => {
    it('should render multiCommands', async () => {
      const commands = [
        {
          args: {
            person: {
              description: 'name of person to say hello to',
              name: 'PERSON',
              required: true,
            },
          },
          description: 'say hello to anyone',
          id: 'hello',
        },
      ]

      sinon.stub(config, 'topics').value([
        {
          description: 'Say hello from <%- config.bin %>',
          name: 'hello',
        },
      ])
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.multiCommands(commands, 'docs')
      expect(rendered).to.equal(`# Command Topics

* [\`oclif hello\`](docs/hello.md) - Say hello from oclif
`)
    })
  })

  describe('tableOfContents', () => {
    it('should render table of contents from headers with single #', async () => {
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = await generator.tableOfContents(`
Title of Doc
----
# header 1
# header 2
## header 2.1
# header 3`)
      expect(rendered).to.equal(`* [header 1](#header-1)
* [header 2](#header-2)
* [header 3](#header-3)`)
    })
  })

  describe('usage', () => {
    it('should render usage based on Config', async () => {
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = generator.usage()
      expect(rendered).to.equal(`\`\`\`sh-session
$ npm install -g oclif
$ oclif COMMAND
running command...
$ oclif (--version)
${config.userAgent}
$ oclif --help [COMMAND]
USAGE
  $ oclif COMMAND
...
\`\`\``)
    })

    it('should render usage with multiple version flags', async () => {
      sinon.stub(config.pjson, 'oclif').value({
        ...config.pjson.oclif,
        additionalVersionFlags: ['-v'],
      })
      const generator = new TestReadmeGenerator(config, {outputDir: 'docs', readmePath: 'README.md'})
      // @ts-expect-error because protected method
      const rendered = generator.usage()
      expect(rendered).to.equal(`\`\`\`sh-session
$ npm install -g oclif
$ oclif COMMAND
running command...
$ oclif (--version|-v)
${config.userAgent}
$ oclif --help [COMMAND]
USAGE
  $ oclif COMMAND
...
\`\`\``)
    })
  })
})
