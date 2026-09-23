import { useSyncExternalStore } from 'react';

import { engine } from './engine';
import { fakeEngine } from './fake-engine';
import type { AiEngine, ModelStatus } from './types';

export type { AiEngine, GenerateRequest, ModelInfo, ModelStatus } from './types';

/** The model the app uses: the real one, or a pretend one for development. */
export const ai: AiEngine = process.env.EXPO_PUBLIC_FAKE_AI === '1' ? fakeEngine : engine;

export function useModelStatus(): ModelStatus {
  return useSyncExternalStore(ai.subscribe, ai.getStatus);
}
