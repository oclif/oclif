const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'plain')
    .retries(2)
    .it()
})
