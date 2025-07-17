import {Command, Flags, Interfaces} from '@oclif/core'
import {move} from 'fs-extra'
import {exec as execSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {mkdir, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

import * as Tarballs from '../../tarballs'
import {templateShortKey} from '../../upload-util'

const exec = promisify(execSync)

const scripts = {
  /* eslint-disable no-useless-escape */

  cmd: (config: Interfaces.Config, additionalCLI?: string, nodeOptions?: string[]) => `@echo off
setlocal enableextensions

set ${additionalCLI ? `${additionalCLI.toUpperCase()}_BINPATH` : config.scopedEnvVarKey('BINPATH')}=%~dp0\\${
    additionalCLI ?? config.bin
  }.cmd
if exist "%LOCALAPPDATA%\\${config.dirname}\\client\\bin\\${additionalCLI ?? config.bin}.cmd" (
  "%LOCALAPPDATA%\\${config.dirname}\\client\\bin\\${additionalCLI ?? config.bin}.cmd" %*
) else (
  "%~dp0\\..\\client\\bin\\node.exe" ${`${nodeOptions?.join(' ')} `}"%~dp0\\..\\client\\${
    additionalCLI ? `${additionalCLI}\\bin\\run` : String.raw`bin\run`
  }" %*
)
`,
  nsis: ({
    arch,
    config,
    customization,
    defenderOptional,
    hideDefenderOption,
  }: {
    arch: string
    config: Interfaces.Config
    customization?: string
    defenderOptional: boolean
    hideDefenderOption: boolean
  }) => `!include MUI2.nsh

!define Version '${config.version.split('-')[0]}'
Name "${config.name}"
CRCCheck On
InstallDirRegKey HKCU "Software\\${config.name}" ""

!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

OutFile "installer.exe"
VIProductVersion "\${VERSION}.0"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "ProductName" "${config.name}"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "Comments" "${config.pjson.homepage}"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "CompanyName" "${config.scopedEnvVar('AUTHOR') || config.pjson.author}"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "LegalCopyright" "${new Date().getFullYear()}"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "FileDescription" "${config.pjson.description}"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "FileVersion" "\${VERSION}.0"
VIAddVersionKey /LANG=\${LANG_ENGLISH} "ProductVersion" "\${VERSION}.0"

InstallDir "\$PROGRAMFILES${arch === 'x64' ? '64' : ''}\\${config.dirname}"

${customization}

Section "${config.name} CLI \${VERSION}"
  SetOutPath $INSTDIR
  File /r bin
  File /r client
  ExpandEnvStrings $0 "%COMSPEC%"

  WriteRegStr HKCU "Software\\${config.dirname}" "" $INSTDIR
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${config.dirname}" \\
                   "DisplayName" "${config.name}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${config.dirname}" \\
                   "DisplayVersion" "\${VERSION}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${config.dirname}" \\
                   "UninstallString" "$\\"$INSTDIR\\uninstall.exe$\\""
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${config.dirname}" \\
                   "Publisher" "${config.scopedEnvVar('AUTHOR') || config.pjson.author}"
SectionEnd

Section "Set PATH to ${config.name}"
  Push "$INSTDIR\\bin"
  Call AddToPath
SectionEnd

Section ${defenderOptional ? '/o ' : ''}"${hideDefenderOption ? '-' : ''}Add %LOCALAPPDATA%\\${
    config.dirname
  } to Windows Defender exclusions (highly recommended for performance!)"
  ExecShell "" '"$0"' "/C powershell -ExecutionPolicy Bypass -Command $\\"& {Add-MpPreference -ExclusionPath $\\"$LOCALAPPDATA\\${
    config.dirname
  }$\\"}$\\" -FFFeatureOff" SW_HIDE
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\\Uninstall.exe"
  RMDir /r "$INSTDIR"
  RMDir /r "$LOCALAPPDATA\\${config.dirname}"
  DeleteRegKey /ifempty HKCU "Software\\${config.dirname}"
  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${config.dirname}"
SectionEnd

!define Environ 'HKCU "Environment"'
Function AddToPath
  Exch $0
  Push $1
  Push $2
  Push $3
  Push $4

  ; NSIS ReadRegStr returns empty string on string overflow
  ; Native calls are used here to check actual length of PATH

  ; $4 = RegOpenKey(HKEY_CURRENT_USER, "Environment", &$3)
  System::Call "advapi32::RegOpenKey(i 0x80000001, t'Environment', *i.r3) i.r4"
  IntCmp $4 0 0 done done
  ; $4 = RegQueryValueEx($3, "PATH", (DWORD*)0, (DWORD*)0, &$1, ($2=NSIS_MAX_STRLEN, &$2))
  ; RegCloseKey($3)
  System::Call "advapi32::RegQueryValueEx(i $3, t'PATH', i 0, i 0, t.r1, *i \${NSIS_MAX_STRLEN} r2) i.r4"
  System::Call "advapi32::RegCloseKey(i $3)"

  IntCmp $4 234 0 +4 +4 ; $4 == ERROR_MORE_DATA
    DetailPrint "AddToPath: original length $2 > \${NSIS_MAX_STRLEN}"
    MessageBox MB_OK "PATH not updated, original length $2 > \${NSIS_MAX_STRLEN}"
    Goto done

  IntCmp $4 0 +5 ; $4 != NO_ERROR
    IntCmp $4 2 +3 ; $4 != ERROR_FILE_NOT_FOUND
      DetailPrint "AddToPath: unexpected error code $4"
      Goto done
    StrCpy $1 ""

  ; Check if already in PATH
  Push "$1;"
  Push "$0;"
  Call StrStr
  Pop $2
  StrCmp $2 "" 0 done
  Push "$1;"
  Push "$0\\;"
  Call StrStr
  Pop $2
  StrCmp $2 "" 0 done

  ; Prevent NSIS string overflow
  StrLen $2 $0
  StrLen $3 $1
  IntOp $2 $2 + $3
  IntOp $2 $2 + 2 ; $2 = strlen(dir) + strlen(PATH) + sizeof(";")
  IntCmp $2 \${NSIS_MAX_STRLEN} +4 +4 0
    DetailPrint "AddToPath: new length $2 > \${NSIS_MAX_STRLEN}"
    MessageBox MB_OK "PATH not updated, new length $2 > \${NSIS_MAX_STRLEN}."
    Goto done

  ; Append dir to PATH
  DetailPrint "Add to PATH: $0"
  StrCpy $2 $1 1 -1
  StrCmp $2 ";" 0 +2
    StrCpy $1 $1 -1 ; remove trailing ';'
  StrCmp $1 "" +2   ; no leading ';'
    StrCpy $0 "$1;$0"
  WriteRegExpandStr \${Environ} "PATH" $0
  SendMessage \${HWND_BROADCAST} \${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

done:
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; StrStr - find substring in a string
;
; Usage:
;   Push "this is some string"
;   Push "some"
;   Call StrStr
;   Pop $0 ; "some string"

Function StrStr
  Exch $R1 ; $R1=substring, stack=[old$R1,string,...]
  Exch     ;                stack=[string,old$R1,...]
  Exch $R2 ; $R2=string,    stack=[old$R2,old$R1,...]
  Push $R3
  Push $R4
  Push $R5
  StrLen $R3 $R1
  StrCpy $R4 0
  ; $R1=substring, $R2=string, $R3=strlen(substring)
  ; $R4=count, $R5=tmp
  loop:
    StrCpy $R5 $R2 $R3 $R4
    StrCmp $R5 $R1 done
    StrCmp $R5 "" done
    IntOp $R4 $R4 + 1
    Goto loop
done:
  StrCpy $R1 $R2 "" $R4
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Exch $R1 ; $R1=old$R1, stack=[result,...]
FunctionEnd
`,
  sh: (config: Interfaces.Config) => `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

"$basedir/../client/bin/${config.bin}.cmd" "$@"
ret=$?
exit $ret
`,
  /* eslint-enable no-useless-escape */
}

export default class PackWin extends Command {
  static description = `You need to have 7zip, nsis (makensis), and grep installed on your machine in order to run this command.

This command will produce unsigned installers unless you supply WINDOWS_SIGNING_PASS (prefixed with the name of your executable, e.g. OCLIF_WINDOWS_SIGNING_PASS) in the environment and have set the windows.name and windows.keypath properties in your package.json's oclif property.

Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.`
  static flags = {
    'additional-cli': Flags.string({
      description: `An Oclif CLI other than the one listed in config.bin that should be made available to the user
the CLI should already exist in a directory named after the CLI that is the root of the tarball produced by "oclif pack:tarballs".`,
      hidden: true,
    }),
    'defender-exclusion': Flags.option({
      options: ['checked', 'unchecked', 'hidden'] as const,
    })({
      default: 'checked',
      description:
        'There is no way to set a hidden checkbox with "true" as a default...the user can always allow full security',

      summary: `Set to "checked" or "unchecked" to set the default value for the checkbox.  Set to "hidden" to hide the option (will let defender do its thing).`,
    }),
    'prune-lockfiles': Flags.boolean({description: 'remove lockfiles in the tarball.', exclusive: ['tarball']}),
    root: Flags.string({
      char: 'r',
      default: '.',
      description: 'Path to oclif CLI root.',
      required: true,
    }),
    sha: Flags.string({
      description: '7-digit short git commit SHA (defaults to current checked out commit).',
      required: false,
    }),
    tarball: Flags.string({
      char: 't',
      description: 'Optionally specify a path to a tarball already generated by NPM.',
      exclusive: ['prune-lockfiles'],
      required: false,
    }),
    targets: Flags.string({
      description: 'Comma-separated targets to pack (e.g.: win32-x64,win32-x86,win32-arm64).',
    }),
  }
  static summary = 'Create windows installer from oclif CLI'

  async run(): Promise<void> {
    await this.checkForNSIS()
    const {flags} = await this.parse(PackWin)

    const buildConfig = await Tarballs.buildConfig(flags.root, {sha: flags?.sha, targets: flags?.targets?.split(',')})
    const {config} = buildConfig
    const nsisCustomization = config.nsisCustomization ? readFileSync(config.nsisCustomization, 'utf8') : ''
    const arches = buildConfig.targets.filter((t) => t.platform === 'win32').map((t) => t.arch)

    await Tarballs.build(buildConfig, {
      pack: false,
      parallel: true,
      platform: 'win32',
      pruneLockfiles: flags['prune-lockfiles'],
      tarball: flags.tarball,
    })

    await Promise.all(
      arches.map(async (arch) => {
        const installerBase = path.join(buildConfig.tmp, `windows-${arch}-installer`)
        await rm(installerBase, {force: true, recursive: true})
        await mkdir(path.join(installerBase, 'bin'), {recursive: true})
        await Promise.all([
          writeFile(
            path.join(installerBase, 'bin', `${config.bin}.cmd`),
            scripts.cmd(config, undefined, buildConfig.nodeOptions),
          ),
          writeFile(path.join(installerBase, 'bin', `${config.bin}`), scripts.sh(config)),
          writeFile(
            path.join(installerBase, `${config.bin}.nsi`),
            scripts.nsis({
              arch,
              config,
              customization: nsisCustomization,
              // hiding it also unchecks it
              defenderOptional: flags['defender-exclusion'] === 'hidden' || flags['defender-exclusion'] === 'unchecked',
              hideDefenderOption: flags['defender-exclusion'] === 'hidden',
            }),
          ),
          ...(config.binAliases
            ? config.binAliases.flatMap((alias) =>
                // write duplicate files for windows aliases
                // this avoids mklink which can require admin privileges which not everyone has
                [
                  writeFile(path.join(installerBase, 'bin', `${alias}.cmd`), scripts.cmd(config)),
                  writeFile(path.join(installerBase, 'bin', `${alias}`), scripts.sh(config)),
                ],
              )
            : []),
          ...(flags['additional-cli']
            ? [
                writeFile(
                  path.join(installerBase, 'bin', `${flags['additional-cli']}.cmd`),
                  scripts.cmd(config, flags['additional-cli']),
                ),
                writeFile(
                  path.join(installerBase, 'bin', `${flags['additional-cli']}`),
                  scripts.sh({bin: flags['additional-cli']} as Interfaces.Config),
                ),
              ]
            : []),
        ])

        await move(buildConfig.workspace({arch, platform: 'win32'}), path.join(installerBase, 'client'))
        await exec(
          `makensis "${installerBase}/${config.bin}.nsi" | grep -v "\\[compress\\]" | grep -v "^File: Descending to"`,
        )
        const templateKey = templateShortKey('win32', {
          arch,
          bin: config.bin,
          sha: buildConfig.gitSha,
          version: config.version,
        })
        const o = buildConfig.dist(`win32/${templateKey}`)
        await move(path.join(installerBase, 'installer.exe'), o)

        const {windows} = config.pjson.oclif
        if (windows && windows.name && windows.keypath) {
          await signWindows(o, arch, config, windows)
        } else this.debug('Skipping windows exe signing')

        this.log(`built ${o}`)
      }),
    )
  }

  private async checkForNSIS() {
    try {
      await exec('makensis')
    } catch (error: unknown) {
      const {code} = error as {code: number}
      if (code === 1) return
      if (code === 127) this.error('install makensis')
      else throw error
    }
  }
}
async function signWindows(
  o: string,
  arch: string,
  config: Interfaces.Config,
  windows: Interfaces.OclifConfiguration['windows'],
) {
  if (!windows) {
    throw new Error('windows not set in oclif configuration')
  }

  const buildLocationUnsigned = o.replace(`${arch}.exe`, `${arch}-unsigned.exe`)
  await move(o, buildLocationUnsigned)

  const pass = config.scopedEnvVar('WINDOWS_SIGNING_PASS')
  if (!pass) {
    throw new Error(`${config.scopedEnvVarKey('WINDOWS_SIGNING_PASS')} not set in the environment`)
  }

  const args = [
    '-pkcs12',
    windows.keypath,
    '-pass',
    `"${pass}"`,
    '-n',
    `"${windows.name}"`,
    '-i',
    windows.homepage || config.pjson.homepage,
    '-t',
    'http://timestamp.digicert.com',
    '-h',
    'sha512',
    '-in',
    buildLocationUnsigned,
    '-out',
    o,
  ]
  await exec(`osslsigncode sign ${args.join(' ')}`)
}
