/**
 * Hands a streamed answer to the screen: the model writes it a few characters
 * at a time, the screen gets the whole text so far, a few times per second.
 */

/** The answer being written is handed to `onText` at most this often. */
export const TEXT_UPDATE_MS = 100;

/**
 * Collects the pieces of a streamed answer and hands the whole text so far to
 * `onText`, at most every TEXT_UPDATE_MS, then once more with the final text.
 * Nothing is sent after a cancellation, although the native run goes on.
 */
export function textStream(onText: (text: string) => void, signal?: AbortSignal) {
  let text = '';
  let sent = '';
  let lastSentAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const send = () => {
    clearTimer();
    if (signal?.aborted || text === sent) return;
    sent = text;
    lastSentAt = Date.now();
    try {
      onText(text);
    } catch (error) {
      console.warn('[ai] onText failed', error);
    }
  };

  return {
    onToken(token: string, done: boolean) {
      // The last call carries "" or an error message, never answer text.
      if (done || signal?.aborted) return;
      text += token;
      const wait = TEXT_UPDATE_MS - (Date.now() - lastSentAt);
      if (wait <= 0) send();
      else timer ??= setTimeout(send, wait);
    },
    /** Starts over, when the request runs again without its schema. */
    restart() {
      clearTimer();
      text = '';
      sent = '';
    },
    /** Sends the complete answer, as the engine returned it. */
    finish(answer: string) {
      text = answer;
      send();
    },
    stop: clearTimer,
  };
}
