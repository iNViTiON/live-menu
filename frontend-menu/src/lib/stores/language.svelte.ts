class LanguageStore {
  selectedLanguage = $state('GB');

  resetToDefault() {
    this.selectedLanguage = 'GB';
  }
}

export const languageStore = new LanguageStore();
