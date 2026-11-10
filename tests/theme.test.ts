import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { THEME_COLORS, THEME_KEY, THEME_SCRIPT } from '../src/lib/theme';

test('theme bootstrap defaults to dark and applies a saved preference before rendering', () => {
  for (const preference of [null, 'light', 'dark', 'invalid']) {
    const root = { dataset: { theme: 'dark' } };
    const meta = { content: '' };
    runInNewContext(THEME_SCRIPT, {
      document: {
        documentElement: root,
        querySelector: () => meta,
      },
      localStorage: {
        getItem: (key: string) => {
          assert.equal(key, THEME_KEY);
          return preference;
        },
      },
    });
    const expected = preference === 'light' ? 'light' : 'dark';
    assert.equal(root.dataset.theme, expected);
    assert.equal(meta.content, THEME_COLORS[expected]);
  }
});

test('blocked theme storage keeps the dark default and logs an explicit warning', () => {
  const root = { dataset: { theme: 'dark' } };
  const warnings: string[] = [];
  runInNewContext(THEME_SCRIPT, {
    document: { documentElement: root, querySelector: () => null },
    localStorage: {
      getItem: () => {
        throw new Error('Synthetic blocked storage');
      },
    },
    console: { warn: (message: string) => warnings.push(message) },
  });
  assert.equal(root.dataset.theme, 'dark');
  assert.match(warnings[0], /could not be read/i);
});
