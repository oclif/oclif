import {expect} from 'chai'
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {exec} from './util'

function getPackageManager(): 'npm' | 'pnpm' | 'yarn' {
  const raw = process.env.OCLIF_INTEGRATION_PACKAGE_MANAGER
  if (raw === 'npm' || raw === 'pnpm' || raw === 'yarn') return raw
  return 'npm'
}

function getModuleType(): 'CommonJS' | 'ESM' {
  const raw = process.env.OCLIF_INTEGRATION_MODULE_TYPE
  if (raw === 'ESM') return raw
  return 'CommonJS'
}

const MODULE_TYPE = getModuleType()
const PACKAGE_MANAGER = getPackageManager()
const nodeVersion = process.version

const TS_CONFIGS: Record<'CommonJS' | 'ESM', Record<string, unknown>> = {
  CommonJS: {
    compilerOptions: {
      declaration: true,
      importHelpers: true,
      module: 'commonjs',
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      target: 'es2019',
    },
    include: ['src/**/*'],
  },
  ESM: {
    compilerOptions: {
      declaration: true,
      module: 'Node16',
      moduleResolution: 'node16',
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      target: 'es2022',
    },
    include: ['src/**/*'],
    'ts-node': {
      esm: true,
    },
  },
}

async function compile(cwd: string): Promise<void> {
  switch (PACKAGE_MANAGER) {
    case 'npm': {
      await exec('npm exec tsc', {cwd})
      break
    }

    case 'pnpm': {
      await exec('pnpm exec tsc', {cwd})
      break
    }

    case 'yarn': {
      await exec('yarn tsc', {cwd})
      break
    }

    default: {
      throw new Error(`Unsupported package manager: ${PACKAGE_MANAGER}`)
    }
  }
}

async function addDeps(cwd: string): Promise<void> {
  switch (PACKAGE_MANAGER) {
    case 'npm': {
      await exec('npm init --yes', {cwd})
      await exec('npm install typescript --save-dev', {cwd})
      break
    }

    case 'pnpm': {
      await exec('pnpm init', {cwd})
      await exec('pnpm install typescript --save-dev', {cwd})
      break
    }

    case 'yarn': {
      await exec('yarn init --yes', {cwd})
      await exec('yarn add typescript --dev', {cwd})
      break
    }

    default: {
      throw new Error(`Unsupported package manager: ${PACKAGE_MANAGER}`)
    }
  }
}

describe(`oclif init Integration Tests ${MODULE_TYPE} + ${PACKAGE_MANAGER} + node ${nodeVersion}`, () => {
  const projectDir = 'my-project'
  const tmpDir = join(
    tmpdir(),
    `oclif-init-integration-tests-${MODULE_TYPE}-${PACKAGE_MANAGER}-node-${nodeVersion}`,
    projectDir,
  )

  const executable = join(process.cwd(), 'bin', process.platform === 'win32' ? 'dev.cmd' : 'dev.js')

  let binRun: string
  let binDev: string

  function setBins(): void {
    const extension = process.platform === 'win32' ? '.cmd' : '.js'
    binRun = join(tmpDir, 'bin', `run${extension}`)
    binDev = join(tmpDir, 'bin', `dev${extension}`)
  }

  before(async () => {
    console.log('tmpDir:', tmpDir)
    await rm(tmpDir, {force: true, recursive: true})
    await mkdir(tmpDir, {recursive: true})
    await addDeps(tmpDir)

    const pjson = JSON.parse(await readFile(join(tmpDir, 'package.json'), 'utf8'))
    pjson.type = MODULE_TYPE === 'ESM' ? 'module' : 'commonjs'
    await writeFile(join(tmpDir, 'package.json'), JSON.stringify(pjson, null, 2))

    await writeFile(join(tmpDir, 'tsconfig.json'), JSON.stringify(TS_CONFIGS[MODULE_TYPE], null, 2))
  })

  it('should initialize a new oclif project in the current directory', async () => {
    const initResult = await exec(`${executable} init --yes`, {cwd: tmpDir})
    expect(initResult.code).to.equal(0)
    expect(initResult.stdout).to.include(`Created CLI ${projectDir}`)

    setBins()
  })

  it('should be able to run generated commands', async () => {
    const genResult = await exec(`${executable} generate command foo:bar:baz --force`, {
      cwd: tmpDir,
    })
    expect(genResult.code).to.equal(0)

    const devResult = await exec(`${binDev} foo:bar:baz`, {cwd: tmpDir})
    expect(devResult.code).to.equal(0)
    expect(devResult.stdout).to.include('hello world')

    await compile(tmpDir)
    const result = await exec(`${binRun} foo:bar:baz`, {cwd: tmpDir})
    expect(result.code).to.equal(0)
    expect(result.stdout).to.include('hello world')
  })

  it('should be able to run generated hooks', async () => {
    const genResult = await exec(`${executable} generate hook init --event init --force`, {cwd: tmpDir})
    expect(genResult.code).to.equal(0)

    const result = await exec(`${binDev} foo:bar:baz`, {cwd: tmpDir})
    expect(result.code).to.equal(0)
    expect(result.stdout).to.include('example hook running foo:bar:baz\n')
  })
})
