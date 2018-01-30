anycli
======

anycli: create your own CLI

[![Version](https://img.shields.io/npm/v/anycli.svg)](https://npmjs.org/package/anycli)
[![CircleCI](https://circleci.com/gh/anycli/anycli/tree/master.svg?style=svg)](https://circleci.com/gh/anycli/anycli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/anycli/anycli?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/anycli/branch/master)
[![Codecov](https://codecov.io/gh/anycli/anycli/branch/master/graph/badge.svg)](https://codecov.io/gh/anycli/anycli)
[![Greenkeeper](https://badges.greenkeeper.io/anycli/anycli.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/npm/anycli/badge.svg)](https://snyk.io/test/npm/anycli)
[![Downloads/week](https://img.shields.io/npm/dw/anycli.svg)](https://npmjs.org/package/anycli)
[![License](https://img.shields.io/npm/l/anycli.svg)](https://github.com/anycli/anycli/blob/master/package.json)

Useful Repos
------------

**Plugins**

* [@anycli/version](https://github.com/anycli/version) - `mycli -v|--version|version`. Show the current version.
* [@anycli/not-found](https://github.com/anycli/not-found) - Display a friendly "did you mean" message if a command is not found.
* [@anycli/plugins](https://github.com/anycli/plugins) - Allow users to add plugins to extend your CLI.
* [@anycli/autoupdate](https://github.com/anycli/autoupdate) - Add autoupdate support to the CLI.
* [@anycli/autocomplete](https://github.com/anycli/autocomplete) - Add bash/zsh autocomplete.

Building your own plugin
------------------------

Writing code for plugins is essentially the same as writing within a CLI. They can export 3 different types: commands, hooks, and other plugins.

Run `yarn create anycli plugin mynewplugin` to create a plugin a new directory. This will come with a sample command and hook
