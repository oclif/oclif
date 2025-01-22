import {exec as cpExec, ExecOptions} from 'node:child_process'

export async function exec(
  command: string,
  opts: ExecOptions,
): Promise<{code: number; stderr: string; stdout: string}> {
  return new Promise((resolve, reject) => {
    cpExec(command, opts, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({code: 0, stderr, stdout})
      }
    })
  })
}
