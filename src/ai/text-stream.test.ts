import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { TEXT_UPDATE_MS, textStream } from './text-stream';

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('streaming an answer', () => {
  it('sends the whole text so far, a few times per second at most', () => {
    const onText = jest.fn();
    const stream = textStream(onText);
    stream.onToken('Arrose', false);
    // The first piece goes out at once.
    expect(onText).toHaveBeenLastCalledWith('Arrose');
    stream.onToken(' quand', false);
    stream.onToken(' le terreau', false);
    expect(onText).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(TEXT_UPDATE_MS);
    expect(onText).toHaveBeenCalledTimes(2);
    expect(onText).toHaveBeenLastCalledWith('Arrose quand le terreau');

    // A hundred pieces in one second: about ten updates.
    for (let i = 0; i < 100; i++) {
      stream.onToken('.', false);
      jest.advanceTimersByTime(10);
    }
    expect(onText.mock.calls.length).toBeLessThanOrEqual(2 + 11);
    expect(onText.mock.calls.length).toBeGreaterThanOrEqual(2 + 9);
  });

  it('ends with the complete answer, once', () => {
    const onText = jest.fn();
    const stream = textStream(onText);
    stream.onToken('Arrose', false);
    stream.onToken(' peu.', false);
    stream.onToken('', true);
    stream.finish('Arrose peu.');
    expect(onText).toHaveBeenLastCalledWith('Arrose peu.');
    jest.advanceTimersByTime(1000);
    expect(onText.mock.calls.map(([text]) => text)).toEqual(['Arrose', 'Arrose peu.']);
  });

  it('ignores the error text of the last call', () => {
    const onText = jest.fn();
    const stream = textStream(onText);
    stream.onToken('Arrose', false);
    stream.onToken('Error: out of memory', true);
    jest.advanceTimersByTime(1000);
    expect(onText.mock.calls.map(([text]) => text)).toEqual(['Arrose']);
  });

  it('says nothing more once cancelled', () => {
    const onText = jest.fn();
    const controller = new AbortController();
    const stream = textStream(onText, controller.signal);
    stream.onToken('Arrose', false);
    stream.onToken(' peu', false);
    controller.abort();
    jest.advanceTimersByTime(1000);
    stream.onToken(' souvent.', false);
    stream.finish('Arrose peu souvent.');
    expect(onText.mock.calls.map(([text]) => text)).toEqual(['Arrose']);
  });

  it('starts over when the request runs again', () => {
    const onText = jest.fn();
    const stream = textStream(onText);
    stream.onToken('{"a"', false);
    stream.restart();
    jest.advanceTimersByTime(TEXT_UPDATE_MS);
    stream.onToken('{"b"', false);
    stream.stop();
    jest.advanceTimersByTime(1000);
    expect(onText.mock.calls.map(([text]) => text)).toEqual(['{"a"', '{"b"']);
  });
});
