/* eslint-disable unicorn/no-await-expression-member */
import {Args, Command, Flags, Interfaces, ux} from '@oclif/core'
import chalk from 'chalk'
import {renderFile} from 'ejs'
import {outputFile} from 'fs-extra'
import {ExecOptions, exec as cpExec} from 'node:child_process'
import {existsSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import {join, relative} from 'node:path'

export type FlaggablePrompt = {
  message: string
  options?: readonly string[] | string[]
  validate: (d: string) => boolean | string
}

export type FlagsOfPrompts<T extends Record<string, FlaggablePrompt>> = Record<
  keyof T,
  Interfaces.OptionFlag<string | undefined, Interfaces.CustomOptions>
>

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof GeneratorCommand)['baseFlags'] & T['flags']
>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export async function exec(
  command: string,
  opts?: ExecOptions & {silent?: boolean},
): Promise<{stderr: string; stdout: string}> {
  const silent = opts ? opts.silent : true
  return new Promise((resolve, reject) => {
    if (!silent) ux.log(chalk.dim(command))
    const p = cpExec(command, opts ?? {}, (err, stdout, stderr) => {
      if (err) return reject(err)
      resolve({stderr, stdout})
    })

    if (!silent) p.stdout?.pipe(process.stdout)
    if (!silent) p.stderr?.pipe(process.stderr)
  })
}

export async function readPJSON(
  location: string,
): Promise<(Interfaces.PJSON.CLI & {scripts: Record<string, string>}) | undefined> {
  try {
    const packageJSON = await readFile(join(location, 'package.json'), 'utf8')
    return JSON.parse(packageJSON)
  } catch {}
}

function validateInput(input: string, validate: (input: string) => boolean | string): never | string {
  const result = validate(input)
  if (typeof result === 'string') throw new Error(result)
  return input
}

export function makeFlags<T extends Record<string, FlaggablePrompt>>(flaggablePrompts: T): FlagsOfPrompts<T> {
  return Object.fromEntries(
    Object.entries(flaggablePrompts).map(([key, value]) => [
      key,
      Flags.string({
        description: `Supply answer for prompt: ${value.message}`,
        options: value.options,
        async parse(input) {
          return validateInput(input, value.validate)
        },
      }),
    ]),
  ) as FlagsOfPrompts<T>
}

export abstract class GeneratorCommand<T extends typeof Command> extends Command {
  protected args!: Args<T>
  protected flaggablePrompts!: Record<string, FlaggablePrompt>

  protected flags!: Flags<T>
  public templatesDir!: string

  public async getFlagOrPrompt({
    defaultValue,
    name,
    type,
  }: {
    defaultValue: string
    name: string
    type: 'input' | 'select'
  }) {
    if (!this.flaggablePrompts) throw new Error('No flaggable prompts defined')
    if (!this.flaggablePrompts[name]) throw new Error(`No flaggable prompt defined for ${name}`)

    const maybeFlag = () => {
      if (this.flags[name]) {
        this.log(
          `${chalk.green('?')} ${chalk.bold(this.flaggablePrompts[name].message)} ${chalk.cyan(this.flags[name])}`,
        )
        return this.flags[name]
      }
    }

    const maybeDefault = () => {
      if (this.flags.yes) {
        this.log(`${chalk.green('?')} ${chalk.bold(this.flaggablePrompts[name].message)} ${chalk.cyan(defaultValue)}`)
        return defaultValue
      }
    }

    switch (type) {
      case 'select': {
        return (
          maybeFlag() ??
          maybeDefault() ??
          // Dynamic import because @inquirer/select is ESM only. Once oclif is ESM, we can make this a normal import
          // so that we can avoid importing on every single question.
          (await import('@inquirer/select')).default({
            choices: (this.flaggablePrompts[name].options ?? []).map((o) => ({name: o, value: o})),
            default: defaultValue,
            message: this.flaggablePrompts[name].message,
          })
        )
      }

      case 'input': {
        return (
          maybeFlag() ??
          maybeDefault() ??
          // Dynamic import because @inquirer/input is ESM only. Once oclif is ESM, we can make this a normal import
          // so that we can avoid importing on every single question.
          (await import('@inquirer/input')).default({
            default: defaultValue,
            message: this.flaggablePrompts[name].message,
            validate: this.flaggablePrompts[name].validate,
          })
        )
      }

      default: {
        throw new Error('Invalid type')
      }
    }
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof GeneratorCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>
    this.args = args as Args<T>
    // @ts-expect-error because we trust that child classes will set this - also, it's okay if they don't
    this.flaggablePrompts = this.ctor.flaggablePrompts ?? {}
    this.templatesDir = join(__dirname, '../templates')
  }

  public async template(source: string, destination: string, data?: Record<string, unknown>): Promise<void> {
    const rendered = await new Promise<string>((resolve, reject) => {
      renderFile(source, data ?? {}, (err, str) => {
        if (err) reject(err)
        return resolve(str)
      })
    })

    let verb = 'Creating'
    if (rendered) {
      const relativePath = relative(process.cwd(), destination)
      if (existsSync(destination)) {
        const confirmation =
          this.flags.force ??
          (await (
            await import('@inquirer/confirm')
          ).default({
            message: `Overwrite ${relativePath}?`,
          }))

        if (confirmation) {
          verb = 'Overwriting'
        } else {
          this.log(`${chalk.yellow('Skipping')} ${relativePath}`)
          return
        }
      }

      this.log(`${chalk.yellow(verb)} ${relativePath}`)
      await outputFile(destination, rendered)
    }
  }
}
