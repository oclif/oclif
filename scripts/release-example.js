/* eslint-disable no-console */

module.exports = (_, options) => {
  const sh = require('shelljs')
  const execa = require('execa')
  const fs = require('fs-extra')
  const path = require('path')

  sh.set('-ev')

  sh.exec('yarn link')
  const version = options.nextRelease.version
  const releaseType = options.nextRelease.type
  const notes = options.nextRelease.notes

  const examples = [
    'example-single-js',
    'example-single-ts',
    'example-plugin-js',
    'example-plugin-ts',
    'example-multi-js',
    'example-multi-ts',
  ]

  examples.forEach(example => {
    const [, type, format] = example.split('-')

    const options = format === 'ts' ?
      '--options=yarn,typescript,mocha,circleci,appveyor,codecov,eslint' :
      '--options=yarn,mocha,circleci,appveyor,codecov,eslint'

    const d = path.join(__dirname, '../tmp/examples', example)
    sh.mkdir('-p', path.dirname(d))
    sh.exec(`git clone git@github.com:oclif/${example} ${d}`)
    sh.pushd(d)
    const pjson = fs.readJSONSync('package.json')

    let files = sh.ls('-A', '.')
    files = files.filter(f => !['.git', 'CHANGELOG.md'].includes(f))
    sh.rm('-rf', files)

    fs.outputJSONSync('package.json', {
      name: `@oclif/${example}`,
      repository: `oclif/${example}`,
      author: pjson.author,
      version: pjson.version,
      description: pjson.description,
    })

    sh.exec(`oclif ${type} --force --defaults ${options}`)
    if (type === 'multi') {
      sh.exec('oclif command goodbye --force --defaults')
    }
    sh.exec('git add -A')
    try {
      execa.sync('git', ['commit', '-m', `${releaseType === 'patch' ? 'fix' : 'feat'}: oclif v${version}\n\n${notes}`], {stdio: 'inherit'})
      sh.exec('git push')
    } catch (error) {
      console.error(error)
    }
    sh.popd()
  })
}
