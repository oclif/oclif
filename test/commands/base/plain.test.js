const run = require('../../run')

describe('base', () => {
  run('base', 'plain')
    .retries(2).it()
})
