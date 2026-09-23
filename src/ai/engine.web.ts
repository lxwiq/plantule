/**
 * The browser has no on-device model: the scan is reported as unavailable.
 * Use EXPO_PUBLIC_FAKE_AI=1 to try the scan screens on the web.
 */

import type { AiEngine, ModelStatus } from './types';

const reason = 'Le scan IA n’est disponible que dans l’app Android.';
const status: ModelStatus = { state: 'unsupported', reason };

export const engine: AiEngine = {
  info: { name: 'Gemma 4 E2B', sizeBytes: 2_588_147_712 },
  getStatus: () => status,
  subscribe: () => () => undefined,
  download: () => Promise.reject(new Error(reason)),
  cancelDownload: () => undefined,
  deleteModel: async () => undefined,
  generate: () => Promise.reject(new Error(reason)),
};
