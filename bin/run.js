#!/usr/bin/env node

void (async () => {
  const oclif = require('@oclif/core')
  await oclif.execute({dir: __dirname})
})()
