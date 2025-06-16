import {Errors} from '@oclif/core'
import {exec as execSync} from 'node:child_process'
import * as crypto from 'node:crypto'
import {createReadStream} from 'node:fs'
import * as os from 'node:os'
import {promisify} from 'node:util'

import {log} from './log'
const exec = promisify(execSync)

export function castArray<T>(input?: T | T[]): T[] {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

export function uniqBy<T>(arr: T[], fn: (cur: T) => unknown): T[] {
  return arr.filter((a, i) => {
    const aVal = fn(a)
    return !arr.some((b, j) => j > i && fn(b) === aVal)
  })
}

export function compact<T>(a: (T | undefined)[]): T[] {
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  return a.filter((a): a is T => Boolean(a))
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

type Types = boolean | number | string | undefined

function compare(a: Types | Types[], b: Types | Types[]): number {
  a = a === undefined ? 0 : a
  b = b === undefined ? 0 : b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === 0 && b.length === 0) return 0
    const diff = compare(a[0], b[0])
    if (diff !== 0) return diff
    return compare(a.slice(1), b.slice(1))
  }

  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function sortBy<T>(arr: T[], fn: (i: T) => Types | Types[]): T[] {
  return arr.sort((a, b) => compare(fn(a), fn(b)))
}

interface VersionsObject {
  [key: string]: string
}

export const sortVersionsObjectByKeysDesc = (input: VersionsObject): VersionsObject => {
  const keys = Reflect.ownKeys(input).sort((a, b) => {
    const splitA = (a as string).split('.').map((part) => Number.parseInt(part, 10))
    const splitB = (b as string).split('.').map((part) => Number.parseInt(part, 10))
    // sort by major
    if (splitA[0] < splitB[0]) return 1
    if (splitA[0] > splitB[0]) return -1
    // sort by minor
    if (splitA[1] < splitB[1]) return 1
    if (splitA[1] > splitB[1]) return -1
    // sort by patch
    if (splitA[2] < splitB[2]) return 1
    if (splitA[2] > splitB[2]) return -1
    return 0
  }) as string[]
  const result: VersionsObject = {}
  for (const key of keys) {
    result[key] = input[key]
  }

  return result
}

const homeRegexp = new RegExp(`\\B${os.homedir().replace('/', String.raw`\/`)}`, 'g')
const curRegexp = new RegExp(`\\B${process.cwd()}`, 'g')

export const prettifyPaths = (input: unknown): string =>
  (input ?? '').toString().replace(curRegexp, '.').replace(homeRegexp, '~')

export const hash = async (algo: string, fp: string | string[]): Promise<string> => {
  const f = Array.isArray(fp) ? fp.join('') : fp
  log('hash', algo, f)
  return new Promise<string>((resolve, reject) => {
    const hashInProgress = crypto.createHash(algo)
    const stream = createReadStream(f)
    stream.on('error', (err) => reject(err))
    stream.on('data', (chunk) => hashInProgress.update(chunk))
    stream.on('end', () => resolve(hashInProgress.digest('hex')))
  })
}

export async function checkFor7Zip() {
  try {
    await exec('7z')
  } catch (error: unknown) {
    const {code} = error as {code: number}
    if (code === 127) Errors.error('install 7-zip to package windows tarball')
    else throw error
  }
}

export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0
}

export function validateBin(bin: string): boolean {
  return /^[\w-]+$/.test(bin)
}

export function isS3Compatible(endpoint: string | undefined): boolean {
  return Boolean(endpoint && !endpoint.includes('amazonaws.com'))
}

export function getS3ChecksumConfig(endpoint: string | undefined, envValue: string | undefined): string | undefined {
  return envValue || (isS3Compatible(endpoint) ? 'WHEN_REQUIRED' : undefined)
}
