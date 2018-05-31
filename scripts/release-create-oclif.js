#!/usr/bin/env node

const fs = require('fs-extra')
const {execSync} = require('child_process')

const pjson = fs.readJSONSync('package.json')
pjson.name = 'create-oclif'
fs.outputJSONSync('package.json', pjson, {spaces: 2})

function x(cmd) {
  execSync(cmd, {stdio: 'inherit'})
}

x('npm publish')
