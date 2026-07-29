/** Framework-neutral contract for translating text between languages. */
export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string[];
}

export interface TranslationResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedSourceLanguage?: string;
  confidence?: number;
}

export interface TranslationEngine {
  readonly id: string;
  readonly mode: 'offline' | 'online';
  isLanguagePairAvailable(source: string, target: string): Promise<boolean>;
  translate(request: TranslationRequest): Promise<TranslationResult>;
}
