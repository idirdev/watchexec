'use strict';

/**
 * @fileoverview File watcher with command execution support.
 * @module watchexec
 * @author idirdev
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { exec } = require('child_process');

/**
 * @typedef {Object} WatcherOptions
 * @property {string}   [dir='.']         - Directory to watch.
 * @property {string[]} [extensions=[]]   - File extensions to watch (e.g. ['js','ts']).
 * @property {string[]} [ignore=[]]       - Glob-style patterns to ignore.
 * @property {number}   [debounce=300]    - Debounce delay in milliseconds.
 * @property {boolean}  [recursive=true]  - Whether to watch subdirectories.
 */

/**
 * File watcher that emits change and error events.
 * @extends EventEmitter
 */
class Watcher extends EventEmitter {
  /**
   * @param {WatcherOptions} [opts={}]
   */
  constructor(opts = {}) {
    super();
    this.dir        = path.resolve(opts.dir || '.');
    this.extensions = opts.extensions || [];
    this.ignore     = opts.ignore     || [];
    this.debounce   = typeof opts.debounce === 'number' ? opts.debounce : 300;
    this.recursive  = opts.recursive !== false;
    /** @type {fs.FSWatcher|null} */
    this._watcher   = null;
    /** @type {Map<string, NodeJS.Timeout>} */
    this._timers    = new Map();
  }

  /**
   * Start watching the configured directory.
   * @returns {void}
   */
  start() {
    try {
      this._watcher = fs.watch(
        this.dir,
        { recursive: this.recursive },
        (eventType, filename) => {
          if (!filename) return;
          const fullPath = path.join(this.dir, filename);
          if (this.extensions.length && !this.matchesExtension(filename, this.extensions)) return;
          if (this.shouldIgnore(filename, this.ignore)) return;
          this._scheduleChange(fullPath, eventType);
        }
      );
      this._watcher.on('error', (err) => this.emit('error', err));
    } catch (err) {
      this.emit('error', err);
    }
  }

  /**
   * Stop watching.
   * @returns {void}
   */
  stop() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
    for (const timer of this._timers.values()) clearTimeout(timer);
    this._timers.clear();
  }

  /**
   * Schedule a debounced change event for a file.
   * @private
   * @param {string} file      - Absolute file path.
   * @param {string} eventType - The fs event type.
   */
  _scheduleChange(file, eventType) {
    if (this._timers.has(file)) clearTimeout(this._timers.get(file));
    const timer = setTimeout(() => {
      this._timers.delete(file);
      this.emit('change', file, eventType);
    }, this.debounce);
    this._timers.set(file, timer);
  }

  /**
   * Check whether a filename matches any of the given extensions.
   * @param {string}   file - Filename or path.
   * @param {string[]} exts - Extensions without leading dot (e.g. ['js','ts']).
   * @returns {boolean}
   */
  matchesExtension(file, exts) {
    if (!exts || exts.length === 0) return true;
    const ext = path.extname(file).slice(1).toLowerCase();
    return exts.map((e) => e.toLowerCase()).includes(ext);
  }

  /**
   * Check whether a file path should be ignored given the patterns list.
   * Each pattern is matched as a substring of the normalised path.
   * @param {string}   file     - Filename or relative path.
   * @param {string[]} patterns - Patterns to check against.
   * @returns {boolean}
   */
  shouldIgnore(file, patterns) {
    if (!patterns || patterns.length === 0) return false;
    const normalised = file.replace(/\\/g, '/');
    return patterns.some((p) => normalised.includes(p));
  }

  /**
   * Execute a shell command and return a Promise that resolves with stdout.
   * @param {string}  cmd           - Shell command to run.
   * @param {Object}  [opts={}]     - Options passed to child_process.exec.
   * @returns {Promise<string>}
   */
  runCommand(cmd, opts = {}) {
    return new Promise((resolve, reject) => {
      exec(cmd, opts, (err, stdout, stderr) => {
        if (err) { reject(err); return; }
        resolve(stdout);
      });
    });
  }
}

/**
 * @typedef {Object} WatchRunnerOptions
 * @property {string}   [dir='.']        - Directory to watch.
 * @property {string[]} [extensions=[]]  - Extensions to watch.
 * @property {string[]} [ignore=[]]      - Patterns to ignore.
 * @property {number}   [debounce=300]   - Debounce ms.
 * @property {boolean}  [recursive=true] - Watch recursively.
 * @property {string}   cmd              - Shell command to run on change.
 * @property {boolean}  [clear=false]    - Clear console before each run.
 */

/**
 * Combines a Watcher with automatic command execution on change events.
 */
class WatchRunner {
  /**
   * @param {WatchRunnerOptions} opts
   */
  constructor(opts) {
    this.cmd    = opts.cmd || '';
    this.clear  = opts.clear === true;
    this.watcher = new Watcher({
      dir:        opts.dir,
      extensions: opts.extensions,
      ignore:     opts.ignore,
      debounce:   opts.debounce,
      recursive:  opts.recursive,
    });

    this.watcher.on('change', async (file) => {
      if (this.clear) process.stdout.write('\x1Bc');
      console.log(`[watchexec] changed: ${file}`);
      if (this.cmd) {
        try {
          const out = await this.watcher.runCommand(this.cmd);
          if (out) process.stdout.write(out);
        } catch (err) {
          console.error(`[watchexec] command failed: ${err.message}`);
        }
      }
    });

    this.watcher.on('error', (err) => {
      console.error(`[watchexec] watcher error: ${err.message}`);
    });
  }

  /** Start watching. */
  start() { this.watcher.start(); }

  /** Stop watching. */
  stop() { this.watcher.stop(); }
}

/**
 * Factory function to create a Watcher instance.
 * @param {WatcherOptions} [opts={}]
 * @returns {Watcher}
 */
function createWatcher(opts = {}) {
  return new Watcher(opts);
}

module.exports = { Watcher, WatchRunner, createWatcher };
