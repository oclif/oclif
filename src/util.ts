import _ = require('lodash')
import * as os from 'os'
import * as crypto from 'node:crypto'
import {log} from './log'
import * as fs from 'fs-extra'

export function castArray<T>(input?: T | T[]): T[] {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

export function uniqBy<T>(arr: T[], fn: (cur: T) => any): T[] {
  return arr.filter((a, i) => {
    const aVal = fn(a)
    return !arr.find((b, j) => j > i && fn(b) === aVal)
  })
}

export function compact<T>(a: (T | undefined)[]): T[] {
  return a.filter((a): a is T => Boolean(a))
}

export function sortBy<T>(arr: T[], fn: (i: T) => sort.Types | sort.Types[]): T[] {
  function compare(a: sort.Types | sort.Types[], b: sort.Types | sort.Types[]): number {
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

  return arr.sort((a, b) => compare(fn(a), fn(b)))
}

export namespace sort {
  export type Types = string | number | undefined | boolean
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const template = (context: any) => (t: string | undefined): string => _.template(t || '')(context)

interface VersionsObject {
  [key: string]: string;
}

export const sortVersionsObjectByKeysDesc = (input: VersionsObject): VersionsObject => {
  const keys = Reflect.ownKeys(input).sort((a, b) => {
    const splitA = (a as string).split('.').map(part => Number.parseInt(part, 10))
    const splitB = (b as string).split('.').map(part => Number.parseInt(part, 10))
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

const homeRegexp = new RegExp(`\\B${os.homedir().replace('/', '\\/')}`, 'g')
const curRegexp = new RegExp(`\\B${process.cwd()}`, 'g')

export const prettifyPaths = (input: string): string =>
  (input ?? '').toString().replace(curRegexp, '.').replace(homeRegexp, '~')

export const hash = async (algo: string, fp: string | string[]):Promise<string> => {
  const f = Array.isArray(fp) ? fp.join('') : fp
  log('hash', algo, f)
  return new Promise<string>((resolve, reject) => {
    const hashInProgress = crypto.createHash(algo)
    const stream = fs.createReadStream(f)
    stream.on('error', err => reject(err))
    stream.on('data', chunk => hashInProgress.update(chunk))
    stream.on('end', () => resolve(hashInProgress.digest('hex')))
  })
}
