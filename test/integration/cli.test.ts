import {expect} from 'chai'
import {existsSync} from 'node:fs'
import {mkdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {exec} from 'shelljs'

describe('Generated CLI Integration Tests', () => {
  const tmpDir = join(tmpdir(), 'generated-cli-integration-tests')
  const executable = join(process.cwd(), 'bin', 'dev.js')
  const cliName = 'mycli'
  const cliDir = join(tmpDir, cliName)
  let cliBinRun: string
  let cliBinDev: string

  function setBins(): void {
    const usesJsScripts = existsSync(join(cliName, 'bin', 'run.js'))
    const extension = process.platform === 'win32' ? '.cmd' : usesJsScripts ? '.js' : ''
    cliBinRun = join(tmpDir, cliName, 'bin', `run${extension}`)
    cliBinDev = join(tmpDir, cliName, 'bin', `dev${extension}`)
  }

  before(async () => {
    console.log('tmpDir:', tmpDir)
    await rm(tmpDir, {force: true, recursive: true})
    await mkdir(tmpDir, {recursive: true})
  })

  it('should generate a CLI', async () => {
    const genResult = exec(`${executable} generate ${cliName} --defaults`, {cwd: tmpDir})
    expect(genResult.code).to.equal(0)
    expect(genResult.stdout).to.include(`Created ${cliName}`)

    setBins()

    const result = exec(`${cliBinRun} hello world`, {cwd: cliDir})
    expect(result.code).to.equal(0)
    expect(result.stdout).to.equal('hello world! (./src/commands/hello/world.ts)\n')
  })

  it('should generate a new command', async () => {
    const genResult = exec(`${executable} generate command foo:bar:baz --force`, {cwd: cliDir})
    expect(genResult.code).to.equal(0)

    const result = exec(`${cliBinDev} foo:bar:baz`, {cwd: cliDir})
    expect(result.code).to.equal(0)
    expect(result.stdout).to.include('hello world')
  })

  it('should generate a new hook', async () => {
    const genResult = exec(`${executable} generate hook init --event init --force`, {cwd: cliDir})
    expect(genResult.code).to.equal(0)

    const result = exec(`${cliBinDev} foo:bar:baz`, {cwd: cliDir})
    expect(result.code).to.equal(0)
    expect(result.stdout).to.include('example hook running foo:bar:baz\n')
  })
})
