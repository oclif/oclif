const {Command} = require('@oclif/core')

class Something extends Command {
  async run() {
    console.log('do something')
  }
}

Something.description = 'description of this do something command'

module.exports = Something
