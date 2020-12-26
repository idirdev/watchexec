#!/usr/bin/env node
'use strict';

/**
 * @fileoverview CLI for watchexec – watch files and run commands on change.
 * @author idirdev
 */

const { WatchRunner } = require('../src/index.js');

const args = process.argv.slice(2);

function flag(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1];
}

function hasFlag(name) { return args.includes(name); }

if (hasFlag('--help') || hasFlag('-h')) {
  console.log([
    'Usage: watchexec --cmd <command> [options]',
    '',
    'Options:',
    '  --cmd <cmd>       Command to run on change (required)',
    '  --dir <path>      Directory to watch (default: .)',
    '  --ext <list>      Comma-separated extensions, e.g. js,ts',
    '  --debounce <ms>   Debounce delay in ms (default: 300)',
    '  --ignore <pat>    Comma-separated ignore patterns',
    '  --clear           Clear console before each run',
    '  --help            Show this help message',
  ].join('\n'));
  process.exit(0);
}

const cmd = flag('--cmd', null);
if (!cmd) {
  console.error('[watchexec] --cmd is required');
  process.exit(1);
}

const dir        = flag('--dir', '.');
const extRaw     = flag('--ext', '');
const ignoreRaw  = flag('--ignore', '');
const debounce   = parseInt(flag('--debounce', '300'), 10);
const clear      = hasFlag('--clear');

const extensions = extRaw    ? extRaw.split(',').map((s) => s.trim())    : [];
const ignore     = ignoreRaw ? ignoreRaw.split(',').map((s) => s.trim()) : [];

const runner = new WatchRunner({ cmd, dir, extensions, ignore, debounce, clear });
runner.start();
console.log(`[watchexec] watching ${dir} – running: ${cmd}`);
