#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const dev = fs.existsSync(path.join(__dirname, '../tsconfig.json'))

if (dev) require('ts-node/register')

const undefault = m => m.__esModule === true ? m.default : m
undefault(require('@dxcli/engine'))()
