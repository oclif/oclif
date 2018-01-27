const run = require('../../run')

describe('base', () => {
  run('base', 'typescript')
    .retries(2).it()
})
