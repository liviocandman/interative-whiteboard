// client/src/utils/throttle.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle, debounce, rafThrottle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns result on immediate execution', () => {
    const fn = vi.fn(() => 42);
    const throttled = throttle(fn, 100);

    const result = throttled();

    expect(result).toBe(42);
  });

  it('delays subsequent calls within delay period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executes trailing call after delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled(); // Should be queued

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments correctly', () => {
    const fn = vi.fn((a: number, b: string) => `${a}-${b}`);
    const throttled = throttle(fn, 100);

    throttled(1, 'test');

    expect(fn).toHaveBeenCalledWith(1, 'test');
  });

  it('returns undefined when throttled', () => {
    const fn = vi.fn(() => 42);
    const throttled = throttle(fn, 100);

    throttled();
    const result = throttled();

    expect(result).toBeUndefined();
  });

  it('allows execution after delay passes', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(101);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clears previous timeout when called multiple times', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled(); // Immediate
    throttled(); // Queued
    throttled(); // Should replace previous queue
    throttled(); // Should replace again

    vi.advanceTimersByTime(100);

    // Only immediate + one trailing
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays execution until inactivity', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on new call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only executes once for rapid calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('third');
  });

  it('returns void', () => {
    const fn = vi.fn(() => 42);
    const debounced = debounce(fn, 100);

    const result = debounced();

    expect(result).toBeUndefined();
  });
});

describe('rafThrottle', () => {
  let rafId = 0;
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    rafId = 0;
    rafCallback = null;

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb;
      rafId++;
      return rafId;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('batches calls to animation frame', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled();
    throttled();
    throttled();

    expect(fn).not.toHaveBeenCalled();

    // Simulate animation frame
    if (rafCallback) rafCallback(0);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses latest arguments', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled('first');
    throttled('second');
    throttled('third');

    if (rafCallback) rafCallback(0);

    expect(fn).toHaveBeenCalledWith('third');
  });

  it('allows new raf request after execution', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled('call1');
    if (rafCallback) rafCallback(0);

    throttled('call2');
    if (rafCallback) rafCallback(16);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'call1');
    expect(fn).toHaveBeenNthCalledWith(2, 'call2');
  });

  it('only schedules one raf at a time', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    let rafCallCount = 0;

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb;
      rafCallCount++;
      return rafCallCount;
    });

    throttled();
    throttled();
    throttled();
    throttled();

    expect(rafCallCount).toBe(1);
  });
});
