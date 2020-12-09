import cli from 'cli-ux'
import * as qq from 'qqjs'
import * as util from 'util'

export const debug = require('debug')('oclif-dev')
debug.new = (name: string) => require('debug')(`oclif-dev:${name}`)

export function log(format: string, ...args: any[]) {
  args = args.map(qq.prettifyPaths)
  debug.enabled ? debug(format, ...args) : cli.log(`oclif-dev: ${util.format(format, ...args)}`)
}
