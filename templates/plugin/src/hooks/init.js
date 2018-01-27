const {cli} = require('cli-ux')

module.exports = async opts => {
  cli.info(`example hook running ${opts.id}\nDisable by deleting ./src/hooks/init.ts`)
}
