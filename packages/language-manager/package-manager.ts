import type {
  InstalledLanguagePackage,
  LanguageCapability,
  LanguageCode,
  LanguagePackageManifest,
} from './language.types';

/** Shared package lifecycle contract; native adapters own filesystem operations. */
export interface LanguagePackageManager {
  listAvailable(): Promise<LanguagePackageManifest[]>;
  listInstalled(): Promise<InstalledLanguagePackage[]>;
  getInstalled(packageId: string): Promise<InstalledLanguagePackage | null>;
  supports(
    language: LanguageCode,
    capability: LanguageCapability,
  ): Promise<boolean>;
  verify(packageId: string): Promise<boolean>;
  remove(packageId: string): Promise<void>;
}
