/**
 * Contract between the on-device model (engine.ts) and the features built on
 * it (scan, species sheets). Change it only in agreement with both sides.
 */

/** Where the model stands on this phone. */
export type ModelStatus =
  /** No engine on this build or device (Expo Go, web, not enough RAM…). */
  | { state: 'unsupported'; reason: string }
  | { state: 'not_downloaded'; sizeBytes: number }
  /** `progress` goes from 0 to 1. */
  | { state: 'downloading'; progress: number; sizeBytes: number }
  /** Downloaded. Loading it into memory happens on the first `generate()`. */
  | { state: 'ready'; sizeBytes: number }
  | { state: 'error'; message: string };

export type ModelInfo = {
  /** Shown to the user, e.g. "Gemma 4 E2B". */
  name: string;
  sizeBytes: number;
};

export type GenerateRequest = {
  system?: string;
  prompt: string;
  /** A local photo (file://…). The engine resizes it for the model. */
  imageUri?: string;
  maxTokens?: number;
  temperature?: number;
  /** JSON Schema the answer must follow, when the engine can constrain its output. Otherwise ignored. */
  jsonSchema?: object;
  signal?: AbortSignal;
  /**
   * Called as the answer is written, with the whole text so far (not just the
   * new piece), a few times per second at most.
   */
  onText?: (text: string) => void;
};

export interface AiEngine {
  info: ModelInfo;
  /** Must return the same object until the status changes (read by useSyncExternalStore). */
  getStatus(): ModelStatus;
  subscribe(listener: () => void): () => void;
  /** Downloads the model. Refuses on a cellular connection unless `allowCellular`. */
  download(options?: { allowCellular?: boolean }): Promise<void>;
  cancelDownload(): void;
  deleteModel(): Promise<void>;
  /** Runs the model and returns its raw text answer. Throws if the model is not ready. */
  generate(request: GenerateRequest): Promise<string>;
}
