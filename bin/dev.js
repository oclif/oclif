#!/usr/bin/env ts-node

;(async () => {
  const oclif = await import('@oclif/core')
  await oclif.execute({development: true, dir: __dirname})
})()
