import {ux} from '@oclif/core'
import * as util from 'node:util'

import {prettifyPaths} from './util'

export const debug = require('debug')('oclif')
debug.new = (name: string) => require('debug')(`oclif:${name}`)

export function log(format: string, ...args: unknown[]): void {
  args = args.map((arg) => prettifyPaths(arg))
  debug.enabled ? debug(format, ...args) : ux.stdout(`oclif: ${util.format(format, ...args)}`)
}
