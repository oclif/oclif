#!/usr/bin/env node

const undefault = m => m.__esModule === true ? m.default : m
undefault(require('@dxcli/engine'))()
