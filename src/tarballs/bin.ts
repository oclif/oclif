/* eslint-disable no-useless-escape */
import {Interfaces} from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'

export async function writeBinScripts({config, baseWorkspace, nodeVersion}: {config: Interfaces.Config
; baseWorkspace: string; nodeVersion: string;}): Promise<void> {
  const binPathEnvVar = config.scopedEnvVarKey('BINPATH')
  const redirectedEnvVar = config.scopedEnvVarKey('REDIRECTED')
  const clientHomeEnvVar = config.scopedEnvVarKey('OCLIF_CLIENT_HOME')
  const writeWin32 = async () => {
    const {bin} = config
    await fs.promises.writeFile(path.join(baseWorkspace, 'bin', `${config.bin}.cmd`), `@echo off
setlocal enableextensions

if not "%${redirectedEnvVar}%"=="1" if exist "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" (
  set ${redirectedEnvVar}=1
  "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" %*
  goto:EOF
)

if not defined ${binPathEnvVar} set ${binPathEnvVar}="%~dp0${bin}.cmd"
if exist "%~dp0..\\bin\\node.exe" (
  "%~dp0..\\bin\\node.exe" "%~dp0..\\bin\\run" %*
) else if exist "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" (
  "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" "%~dp0..\\bin\\run" %*
) else (
  node "%~dp0..\\bin\\run" %*
)
`)
    // await qq.write([output, 'bin', config.bin], `#!/bin/sh
    // basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
    // "$basedir/../client/bin/${config.bin}.cmd" "$@"
    // ret=$?
    // exit $ret
    // `)
  }

  const writeUnix = async () => {
    const bin = path.join(baseWorkspace, 'bin', config.bin)
    await fs.promises.writeFile(bin, `#!/usr/bin/env bash
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
    echoerr ${binPathEnvVar}="\$${binPathEnvVar}" "\$NODE" "\$DIR/run" "\$@"
  fi
  "\$NODE" "\$DIR/run" "\$@"
fi
`, {mode: 0o755})
  }

  await Promise.all([writeWin32(), writeUnix()])
}
