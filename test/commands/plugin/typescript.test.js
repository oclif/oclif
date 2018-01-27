const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'typescript')
    .retries(2)
    .it()
})
