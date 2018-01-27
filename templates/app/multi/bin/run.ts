#!/usr/bin/env node

/* eslint-disable no-unpublished-require */

const undefault = m => m.__esModule === true ? m.default : m

const fs = require('fs')
const path = require('path')
const dev = fs.existsSync(path.join(__dirname, '../tsconfig.json'))

if (dev) require('ts-node/register')

undefault(require(`../${dev ? 'src' : 'lib'}`))()
