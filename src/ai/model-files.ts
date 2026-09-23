/**
 * The model file on the phone: which one, where it lives, and whether it is
 * complete. See docs/ai-engine.md for why this model and this mirror.
 */

import { Directory, File, FileMode, Paths } from 'expo-file-system';

export const MODEL_NAME = 'Gemma 4 E2B';

/**
 * Gemma 4 E2B for LiteRT-LM (text + image + audio in one file), pinned to a
 * commit so the file never changes under us. Public: no Hugging Face token.
 */
export const MODEL_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/6e5c4f1e395deb959c494953478fa5cec4b8008f/gemma-4-E2B-it.litertlm';

export const MODEL_FILE_NAME = 'gemma-4-E2B-it.litertlm';

/** Exact size of the pinned file, used to tell a complete download from a partial one. */
export const MODEL_SIZE_BYTES = 2_588_147_712;

/** Every .litertlm file starts with these bytes. */
const MODEL_MAGIC = 'LITERTLM';

/** Free space kept on top of the download, so the phone is not left full. */
export const DISK_MARGIN_BYTES = 300 * 1024 * 1024;

/**
 * Below this much RAM the model does not fit next to Android and the app.
 * 6 GB phones report about 5.5 GB; 4 GB phones about 3.7 GB.
 */
export const MIN_TOTAL_MEMORY_BYTES = 5_000_000_000;

/** Kept with the app's documents, which Android does not clear on its own like the cache. */
export function modelsDirectory() {
  return new Directory(Paths.document, 'models');
}

export function modelFile() {
  return new File(modelsDirectory(), MODEL_FILE_NAME);
}

/** The download goes here first and is renamed once complete and checked. */
export function partialModelFile() {
  return new File(modelsDirectory(), `${MODEL_FILE_NAME}.part`);
}

/**
 * Written before loading the model on the GPU and removed once loaded. If it is
 * still there, the app died during a GPU load: the next load uses the CPU.
 */
export function gpuLoadMarker() {
  return new File(modelsDirectory(), 'gpu-load.pending');
}

export function isModelComplete(): boolean {
  try {
    const file = modelFile();
    return file.exists && file.size === MODEL_SIZE_BYTES;
  } catch {
    return false;
  }
}

/** Bytes already downloaded by an interrupted download, 0 if none. */
export function partialBytes(): number {
  try {
    const part = partialModelFile();
    return part.exists ? part.size : 0;
  } catch {
    return 0;
  }
}

/** Checks the size and the header of a finished download. */
export function looksLikeModel(file: File): boolean {
  if (!file.exists || file.size !== MODEL_SIZE_BYTES) return false;
  try {
    const handle = file.open(FileMode.ReadOnly);
    try {
      const header = handle.readBytes(MODEL_MAGIC.length);
      return String.fromCharCode(...header) === MODEL_MAGIC;
    } finally {
      handle.close();
    }
  } catch {
    // Reading the header is a bonus check: trust the size if it fails.
    return true;
  }
}

export function ensureModelsDirectory() {
  modelsDirectory().create({ idempotent: true, intermediates: true });
}

export function deleteIfExists(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Already gone or unreadable: nothing more to do.
  }
}

/** Absolute path without the file:// prefix, as the native engine expects. */
export function nativePath(file: File): string {
  return decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
}
