export type LanguageCode = string;
export type LanguagePackageStatus =
  | 'not-installed'
  | 'queued'
  | 'downloading'
  | 'installed'
  | 'update-available'
  | 'failed';

export type LanguageCapability = 'speech' | 'translation' | 'tts';

export interface LanguageDefinition {
  code: LanguageCode;
  displayName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export interface LanguagePackageManifest {
  id: string;
  language: LanguageDefinition;
  version: string;
  sizeBytes: number;
  checksum: string;
  capabilities: LanguageCapability[];
  minimumAppVersion?: string;
}

export interface InstalledLanguagePackage extends LanguagePackageManifest {
  installedAt: string;
  localPath: string;
  status: Extract<LanguagePackageStatus, 'installed' | 'update-available'>;
}
