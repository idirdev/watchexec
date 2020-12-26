'use strict';

/**
 * @fileoverview Tests for watchexec.
 * @author idirdev
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { Watcher, WatchRunner, createWatcher } = require('../src/index.js');

// ── helpers ────────────────────────────────────────────────────────────────
function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'watchexec-test-'));
}

// ── matchesExtension ────────────────────────────────────────────────────────
describe('Watcher.matchesExtension', () => {
  const w = new Watcher();

  it('returns true when ext list is empty', () => {
    assert.equal(w.matchesExtension('foo.js', []), true);
  });

  it('matches a listed extension', () => {
    assert.equal(w.matchesExtension('app.ts', ['js', 'ts']), true);
  });

  it('rejects an unlisted extension', () => {
    assert.equal(w.matchesExtension('style.css', ['js', 'ts']), false);
  });

  it('is case-insensitive', () => {
    assert.equal(w.matchesExtension('README.MD', ['md']), true);
  });
});

// ── shouldIgnore ────────────────────────────────────────────────────────────
describe('Watcher.shouldIgnore', () => {
  const w = new Watcher();

  it('returns false when pattern list is empty', () => {
    assert.equal(w.shouldIgnore('src/index.js', []), false);
  });

  it('ignores a path matching a pattern', () => {
    assert.equal(w.shouldIgnore('node_modules/foo/bar.js', ['node_modules']), true);
  });

  it('does not ignore an unrelated path', () => {
    assert.equal(w.shouldIgnore('src/utils.js', ['node_modules']), false);
  });

  it('handles multiple patterns', () => {
    assert.equal(w.shouldIgnore('dist/bundle.js', ['node_modules', 'dist']), true);
  });
});

// ── createWatcher factory ──────────────────────────────────────────────────
describe('createWatcher', () => {
  it('returns a Watcher instance', () => {
    const w = createWatcher({ dir: '.', debounce: 100 });
    assert.ok(w instanceof Watcher);
  });

  it('applies default debounce when not specified', () => {
    const w = createWatcher();
    assert.equal(w.debounce, 300);
  });
});

// ── WatchRunner constructor ────────────────────────────────────────────────
describe('WatchRunner', () => {
  it('stores cmd option', () => {
    const r = new WatchRunner({ cmd: 'echo hi' });
    assert.equal(r.cmd, 'echo hi');
  });

  it('clear defaults to false', () => {
    const r = new WatchRunner({ cmd: 'echo hi' });
    assert.equal(r.clear, false);
  });
});

// ── debounce + change event ────────────────────────────────────────────────
describe('Watcher change event (debounce)', (t) => {
  it('emits change after writing a file', (t, done) => {
    const dir = tempDir();
    const file = path.join(dir, 'test.js');
    fs.writeFileSync(file, 'initial');

    const w = new Watcher({ dir, debounce: 50, recursive: true });
    w.start();

    let resolved = false;
    w.on('change', (changedFile) => {
      if (resolved) return;
      resolved = true;
      w.stop();
      assert.ok(typeof changedFile === 'string');
      done();
    });

    w.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      w.stop();
      done(err);
    });

    setTimeout(() => { fs.writeFileSync(file, 'updated'); }, 30);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        w.stop();
        done(new Error('timeout: change event not received'));
      }
    }, 2000);
  });
});

// ── stop clears timers ────────────────────────────────────────────────────
describe('Watcher.stop', () => {
  it('stops without error when not started', () => {
    const w = new Watcher();
    assert.doesNotThrow(() => w.stop());
  });

  it('clears pending timers on stop', () => {
    const w = new Watcher({ debounce: 5000 });
    w._scheduleChange('/tmp/fake.js', 'change');
    assert.equal(w._timers.size, 1);
    w.stop();
    assert.equal(w._timers.size, 0);
  });
});
