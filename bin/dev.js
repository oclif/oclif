#!/usr/bin/env node
// eslint-disable-next-line node/shebang
void (async () => {
  const oclif = require('@oclif/core')
  await oclif.execute({development: true, dir: __dirname})
})()
