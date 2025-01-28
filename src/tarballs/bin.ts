/* eslint-disable no-useless-escape */
import {Interfaces} from '@oclif/core'
import {exec as execSync} from 'node:child_process'
import * as fs from 'node:fs'
import path from 'node:path'
import {promisify} from 'node:util'

const exec = promisify(execSync)

export async function writeBinScripts({
  baseWorkspace,
  config,
  nodeOptions,
  nodeVersion,
}: {
  baseWorkspace: string
  config: Interfaces.Config
  nodeOptions: string[]
  nodeVersion: string
}): Promise<void> {
  const binPathEnvVar = config.scopedEnvVarKey('BINPATH')
  const redirectedEnvVar = config.scopedEnvVarKey('REDIRECTED')
  const clientHomeEnvVar = config.scopedEnvVarKey('OCLIF_CLIENT_HOME')
  const writeWin32 = async (bin: string) => {
    await fs.promises.writeFile(
      path.join(baseWorkspace, 'bin', `${bin}.cmd`),
      `@echo off
setlocal enableextensions

if not "%${redirectedEnvVar}%"=="1" if exist "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" (
  set ${redirectedEnvVar}=1
  "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" %*
  goto:EOF
)

if not defined ${binPathEnvVar} set ${binPathEnvVar}="%~dp0${bin}.cmd"

if exist "%~dp0..\\bin\\node.exe" (
  "%~dp0..\\bin\\node.exe" ${`${nodeOptions.join(' ')} `}"%~dp0..\\bin\\run" %*
) else if exist "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" (
  "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" ${`${nodeOptions.join(' ')} `}"%~dp0..\\bin\\run" %*
) else (
  node ${`${nodeOptions.join(' ')} `}"%~dp0..\\bin\\run" %*
)
`,
    )
  }

  const writeUnix = async () => {
    const bin = path.join(baseWorkspace, 'bin', config.bin)
    await fs.promises.writeFile(
      bin,
      `#!/usr/bin/env bash
set -e
echoerr() { echo "$@" 1>&2; }

get_script_dir () {
  SOURCE="\${BASH_SOURCE[0]}"
  # While \$SOURCE is a symlink, resolve it
  while [ -h "\$SOURCE" ]; do
    DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
    SOURCE="\$( readlink "\$SOURCE" )"
    # If \$SOURCE was a relative symlink (so no "/" as prefix, need to resolve it relative to the symlink base directory
    [[ \$SOURCE != /* ]] && SOURCE="\$DIR/\$SOURCE"
  done
  DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
  echo "\$DIR"
}
DIR=\$(get_script_dir)
CLI_HOME=\$(cd && pwd)
XDG_DATA_HOME=\${XDG_DATA_HOME:="\$CLI_HOME/.local/share"}
CLIENT_HOME=\${${clientHomeEnvVar}:=$XDG_DATA_HOME/${config.dirname}/client}
BIN_PATH="\$CLIENT_HOME/bin/${config.bin}"
if [ -z "\$${redirectedEnvVar}" ] && [ -x "\$BIN_PATH" ] && [[ ! "\$DIR/${config.bin}" -ef "\$BIN_PATH" ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echoerr "\$BIN_PATH" "\$@"
  fi
  ${binPathEnvVar}="\$BIN_PATH" ${redirectedEnvVar}=1 "\$BIN_PATH" "\$@"
else
  export ${binPathEnvVar}=\${${binPathEnvVar}:="\$DIR/${config.bin}"}
  if [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-custom")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-custom"
  elif [ -x "$(command -v "\$DIR/node")" ]; then
    NODE="\$DIR/node"
  elif [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-${nodeVersion}")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-${nodeVersion}"
  elif [ -x "$(command -v node)" ]; then
    NODE=node
  else
    echoerr 'Error: node is not installed.' >&2
    exit 1
  fi
  if [ "\$DEBUG" == "*" ]; then
    echoerr ${binPathEnvVar}="\$${binPathEnvVar}" "\$NODE" ${`${nodeOptions.join(' ')} `}"\$DIR/run" "\$@"
  fi
  "\$NODE" ${`${nodeOptions.join(' ')} `}"\$DIR/run" "\$@"
fi
`,
      {mode: 0o755},
    )
  }

  await Promise.all([
    writeWin32(config.bin),
    writeUnix(),
    ...(config.binAliases?.map((alias) =>
      process.platform === 'win32'
        ? writeWin32(alias)
        : exec(`ln -sf ${config.bin} ${alias}`, {cwd: path.join(baseWorkspace, 'bin')}),
    ) ?? []),
  ])
}
