/**
 * The browser build is for development only and has no file system: backups
 * are made on the phone. Same exports as backup.ts.
 */

import type { PickedBackup } from './backup';

export type { PickedBackup };

export const backupAvailable = false;

export class BackupError extends Error {}

const unavailable = () => Promise.reject(new BackupError('La sauvegarde se fait depuis l’app sur le téléphone.'));

export const exportBackup = (): Promise<void> => unavailable();

export const pickBackupFile = async (): Promise<null> => null;

export const readBackup = (_file: unknown): Promise<PickedBackup> => unavailable();

export const restoreBackup = (_backup: PickedBackup): Promise<void> => unavailable();
