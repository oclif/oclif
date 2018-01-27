const run = require('../../run')

describe('base', () => {
  run('base', 'everything')
    .retries(2).it()
})
