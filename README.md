oclif
======

oclif: create your own CLI

[![Version](https://img.shields.io/npm/v/oclif.svg)](https://npmjs.org/package/oclif)
[![CircleCI](https://circleci.com/gh/oclif/oclif/tree/master.svg?style=svg)](https://circleci.com/gh/oclif/oclif/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/oclif?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/oclif/branch/master)
[![Codecov](https://codecov.io/gh/oclif/oclif/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/oclif)
[![Greenkeeper](https://badges.greenkeeper.io/oclif/oclif.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/npm/oclif/badge.svg)](https://snyk.io/test/npm/oclif)
[![Downloads/week](https://img.shields.io/npm/dw/oclif.svg)](https://npmjs.org/package/oclif)
[![License](https://img.shields.io/npm/l/oclif.svg)](https://github.com/oclif/oclif/blob/master/package.json)

<!-- toc -->

Useful Repos
------------

**Plugins**

* [@oclif/not-found](https://github.com/oclif/not-found) - Display a friendly "did you mean" message if a command is not found.
* [@oclif/plugins](https://github.com/oclif/plugins) - Allow users to add plugins to extend your CLI.
* [@oclif/update](https://github.com/oclif/update) - Add autoupdate support to the CLI.
* [TODO: @oclif/autocomplete](https://github.com/oclif/autocomplete) - Add bash/zsh autocomplete.

Building your own plugin
------------------------

Writing code for plugins is essentially the same as writing within a CLI. They can export 3 different types: commands, hooks, and other plugins.

Run `npx oclif plugin mynewplugin` to create a plugin in a new directory. This will come with a sample command called `hello`.

<!-- install -->
<!-- usage -->
<!-- commands -->
