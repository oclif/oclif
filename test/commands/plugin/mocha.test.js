const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'mocha')
    .retries(2)
    .it()
})
