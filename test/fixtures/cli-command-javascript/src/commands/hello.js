const {Command} = require('@oclif/core')

class Hello extends Command {
  async run() {
    console.log('hello world')
  }
}

Hello.description = 'description of this hello world command'

Hello.aliases = ['hi']

module.exports = Hello
