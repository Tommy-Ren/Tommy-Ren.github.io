/** Each manual shuffle step draws from a shuffled bag in either direction. */
function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createPlaybackQueue(count, current = 0, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(current) || current < 0 || current >= count) {
    throw new RangeError('The playlist must contain the current track.');
  }
  return {
    current,
    history: [current],
    cursor: 0,
    remaining: shuffle(Array.from({ length: count }, (_, index) => index).filter(index => index !== current), random),
  };
}

export function movePlaybackQueue(queue, count, mode, direction, random = Math.random) {
  if (mode !== 'shuffle') return createPlaybackQueue(count, (queue.current + (direction < 0 ? -1 : 1) + count) % count, random);
  let remaining = [...queue.remaining];
  if (!remaining.length) {
    remaining = shuffle(Array.from({ length: count }, (_, index) => index), random);
    // A new round includes every track, without repeating the last track at its boundary.
    if (count > 1 && remaining[0] === queue.current) [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
  }
  const current = remaining.shift();
  const history = [...queue.history, current].slice(-500);
  return { current, history, cursor: history.length - 1, remaining };
}
