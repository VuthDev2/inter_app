import type {
  LanguagePackageManifest,
  LanguagePackageStatus,
} from './language.types';

export interface LanguageDownloadProgress {
  packageId: string;
  status: LanguagePackageStatus;
  bytesDownloaded: number;
  totalBytes: number;
  errorMessage?: string;
}

export type DownloadProgressListener = (
  progress: LanguageDownloadProgress,
) => void;

/** Platform adapters implement storage, networking, resuming, and verification. */
export interface LanguageDownloadManager {
  download(
    manifest: LanguagePackageManifest,
    onProgress?: DownloadProgressListener,
  ): Promise<void>;
  pause(packageId: string): Promise<void>;
  resume(packageId: string): Promise<void>;
  cancel(packageId: string): Promise<void>;
}
