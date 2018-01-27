const run = require('../../run')

describe('base', () => {
  run('base', 'mocha')
    .retries(2).it()
})
