import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlaybackQueue, movePlaybackQueue } from '../src/blog/playback-queue.mjs';

test('sequential playback wraps in either direction, including manual next in repeat-one mode', () => {
  let queue = createPlaybackQueue(3, 2);
  queue = movePlaybackQueue(queue, 3, 'sequential', 1);
  assert.equal(queue.current, 0);
  queue = movePlaybackQueue(queue, 3, 'sequential', -1);
  assert.equal(queue.current, 2);
  assert.equal(movePlaybackQueue(queue, 3, 'repeat-one', 1).current, 0);
});

test('shuffle plays all 100 tracks before repeating and includes every track in later rounds', () => {
  const random = () => .37;
  let queue = createPlaybackQueue(100, 0, random);
  const first = [queue.current];
  for (let i = 0; i < 99; i++) {
    queue = movePlaybackQueue(queue, 100, 'shuffle', 1, random);
    first.push(queue.current);
  }
  assert.equal(new Set(first).size, 100);
  const last = queue.current;
  const second = [];
  for (let i = 0; i < 100; i++) {
    queue = movePlaybackQueue(queue, 100, 'shuffle', 1, random);
    second.push(queue.current);
  }
  assert.notEqual(second[0], last);
  assert.equal(new Set(second).size, 100);
});

test('shuffle previous and forward retrace listening history without consuming unseen tracks', () => {
  let queue = createPlaybackQueue(5, 0, () => .5);
  queue = movePlaybackQueue(queue, 5, 'shuffle', 1);
  const first = queue.current;
  queue = movePlaybackQueue(queue, 5, 'shuffle', 1);
  const second = queue.current;
  const remaining = queue.remaining;
  queue = movePlaybackQueue(queue, 5, 'shuffle', -1);
  assert.equal(queue.current, first);
  queue = movePlaybackQueue(queue, 5, 'shuffle', 1);
  assert.equal(queue.current, second);
  assert.deepEqual(queue.remaining, remaining);
});

test('one-track shuffle stays playable and previous at the start stays on the current track', () => {
  let queue = createPlaybackQueue(1);
  queue = movePlaybackQueue(queue, 1, 'shuffle', -1);
  assert.equal(queue.current, 0);
  queue = movePlaybackQueue(queue, 1, 'shuffle', 1);
  assert.equal(queue.current, 0);
});
