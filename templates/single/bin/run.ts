#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const project = path.join(__dirname, '../tsconfig.json')
const dev = fs.existsSync(project)

if (dev) {
  require('ts-node').register({project})
}

require(`../${dev ? 'src' : 'lib'}`).run()
.catch(require('@oclif/errors/handle'))
