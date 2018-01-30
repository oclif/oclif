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
      '--options=typescript,mocha,semantic-release' :
      '--options=mocha,semantic-release'

    const d = path.join(__dirname, '../tmp/examples', example)
    sh.mkdir('-p', path.dirname(d))
    sh.exec(`git clone git@github.com:anycli/${example} ${d}`)
    sh.pushd(d)
    const pjson = fs.readJSONSync('package.json')

    let files = sh.ls('-A', '.')
    files = files.filter(f => !['.git', 'CHANGELOG.md'].includes(f))
    sh.rm('-rf', files)

    fs.outputJSONSync('package.json', {
      name: `@anycli/${example}`,
      repository: `anycli/${example}`,
      author: pjson.author,
      version: pjson.version,
      description: pjson.description,
    })

    sh.exec(`anycli ${type} --force --defaults ${options}`)
    sh.exec('git add -A')
    try {
      execa.sync('git', ['commit', '-m', `${releaseType === 'patch' ? 'fix' : 'feat'}: anycli v${version}\n\n${notes}`], {stdio: 'inherit'})
      sh.exec('git push')
    } catch (err) {
      console.error(err)
    }
    sh.popd()
  })
}
