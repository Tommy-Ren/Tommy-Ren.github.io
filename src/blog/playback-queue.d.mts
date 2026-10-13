export type PlaybackMode = 'sequential' | 'shuffle' | 'repeat-one';
export interface PlaybackQueue { current: number; history: number[]; cursor: number; remaining: number[] }
export function createPlaybackQueue(count: number, current?: number, random?: () => number): PlaybackQueue;
export function movePlaybackQueue(queue: PlaybackQueue, count: number, mode: PlaybackMode, direction: number, random?: () => number): PlaybackQueue;
