import test from 'node:test';
import assert from 'node:assert/strict';
import {addMessage, unreadCount, markAllRead, loadInbox, INBOX_MAX, WELCOME} from '../dist/data/inbox.js';
import {freshState, loadState} from '../dist/engine.js';

test('inbox: a fresh stay starts with one welcome note, unread', () => {
  const s = freshState();
  assert.equal(s.inbox.length, 1);
  assert.equal(s.inbox[0].title, WELCOME.title);
  assert.equal(unreadCount(s), 1);
});

test('inbox: newest first, capped, ids never reused, and reading clears the count', () => {
  const s = freshState();
  for (let i = 0; i < 40; i++) addMessage(s, {kind: 'receipt', title: `Message ${i}`}, 1000 + i);
  assert.equal(s.inbox.length, INBOX_MAX);
  assert.equal(s.inbox[0].title, 'Message 39');
  assert.equal(new Set(s.inbox.map(m => m.id)).size, INBOX_MAX);
  assert.equal(unreadCount(s), INBOX_MAX);
  markAllRead(s);
  assert.equal(unreadCount(s), 0);
  assert.equal(addMessage(s, {kind: 'nonsense', title: 'x'}).kind, 'notice', 'unknown kinds become notices');
});

test('inbox: survives a reload; junk is dropped; old saves get the welcome note', () => {
  const s = freshState();
  addMessage(s, {kind: 'safety', title: 'Break started', body: 'Until tomorrow.'}, 5);
  assert.deepEqual(loadState(JSON.stringify(s)).inbox, s.inbox);
  assert.equal(loadState(JSON.stringify({version: 1})).inbox[0].title, WELCOME.title);
  const junk = loadInbox({inbox: [{id: 1, title: 'ok', kind: 'receipt', read: true}, {id: 1, title: 'dupe'}, {id: 'x', title: 'bad'}, {id: 3}, null]});
  assert.deepEqual(junk, [{id: 1, t: 0, kind: 'receipt', title: 'ok', body: '', read: true}]);
});
