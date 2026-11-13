import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const migration = readText('../src/history-migrate.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);

test('obligatory event completion requires the main Fard tick, not its Sunnah/Nafl ticks', () => {
  assert.match(app, /if \(kind === 'fard'\) return !!record\.fard\?\.\[key\]/);
  assert.match(app, /eventMinimumMet\('fard', prayer\.key, selectedDate\)/);
  assert.match(app, /data-complete-event="fard"/);
});

test('voluntary and situational events require their own performed tick before Mark event complete appears', () => {
  assert.match(app, /if \(kind === 'voluntary'\) return !!record\.voluntary\?\.\[key\]/);
  assert.match(app, /if \(kind === 'situational'\) return !!record\.situational\?\.\[key\]/);
  assert.match(app, /data-situational-tick/);
  assert.match(app, /data-complete-event="situational"/);
});

test('marked events are removed from Available right now and appear in Recorded Today immediately', () => {
  assert.match(app, /record\.completedEvents = {}\)\)\[`\$\{kind\}:\$\{key\}`\] = true/);
  assert.match(app, /getActiveEvents\(new Date\(\)\)\.filter\(event => !eventComplete\(event\)\)/);
  assert.match(app, /eventComplete\(item\.event\)/);
  assert.match(app, /Event marked complete/);
});

test('Undo record reverses all editable linked Fard, Sunnah and Nafl ticks and clears completion status', () => {
  assert.match(app, /const parts = kind === 'fard' \? eventParts\(\{ kind, key, date \}\)/);
  assert.match(app, /lockState\(part\.layer, part\.key, date\)\.locked/);
  assert.match(app, /delete record\.completedEvents/);
  assert.match(app, /data-undo-kind="fard"/);
  assert.match(app, /data-undo-kind="voluntary"/);
});

test('situational prayer completions persist in history migration and Recorded Today', () => {
  assert.match(migration, /out\.situational = out\.situational/);
  assert.match(migration, /out\.completedEvents = out\.completedEvents/);
  assert.match(app, /const situational = Object\.entries\(record\.situational \|\| \{\}\)/);
});

test('expanded countdown details are not rebuilt every second', () => {
  const update = /function updateCountdownWidgets\(\) \{([\s\S]*?)\n\}/.exec(app)?.[1] || '';
  assert.doesNotMatch(update, /renderCountdownDetails\(\)/);
  assert.match(app, /function openCountdownView\(\)[\s\S]*?renderCountdownView\(\);\s*renderCountdownDetails\(\);/);
  assert.match(app, /if \(currentPage === 'countdown'\) \{ renderCountdownView\(\); renderCountdownDetails\(\); \}/);
});

test('event action controls have clear visible styling', () => {
  assert.match(css, /\.event-complete-button/);
  assert.match(css, /\.event-undo-button/);
});

test('backup merge preserves situational ticks and event-completion markers', async () => {
  const { mergeHistory } = await import('../src/backup.js');
  const merged = mergeHistory(
    { '2026-11-14': { fard: { fajr: true }, voluntary: {}, situational: { istikhara: true }, completedEvents: {} } },
    { '2026-11-14': { fard: {}, voluntary: {}, situational: { tawbah: true }, completedEvents: { 'fard:fajr': true } } }
  );
  const day = merged.history['2026-11-14'];
  assert.equal(day.situational.istikhara, true);
  assert.equal(day.situational.tawbah, true);
  assert.equal(day.completedEvents['fard:fajr'], true);
});

test('expanded event countdown page exposes the same Undo and Mark event complete controls', () => {
  assert.match(app, /const actions = `\$\{eventHasAnyTicks\(countdownState\.kind, key, date\)/);
  assert.match(app, /rootC\.querySelectorAll\('\[data-undo-kind\]'\)/);
  assert.match(app, /rootC\.querySelectorAll\('\[data-complete-event\]'\)/);
});
