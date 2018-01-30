import {Hooks, IHook} from '@anycli/config'
import cli from 'cli-ux'

const hook: IHook<Hooks['init']> = async opts => {
  cli.info(`example hook running ${opts.id}\nDisable by deleting ./src/hooks/init.ts`)
}

export default hook
