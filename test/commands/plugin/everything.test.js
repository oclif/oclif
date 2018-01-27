const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'everything')
    .retries(2)
    .it()
})
