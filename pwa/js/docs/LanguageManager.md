**LanguageManager**

- **Purpose:** Manages loading, switching and applying language packs (JSON) for the PWA. Provides translation helpers (`translate`/`t`), DOM application for attributes like `data-translate`, and persistence of the chosen language.

- **File:** [pwa/js/language-manager.js](pwa/js/language-manager.js#L1)

- **Constructed Instance:** `languageManager` (global singleton exposed on `window.languageManager` and registered at `window.App.managers.language`)

- **Public properties:**
  - `currentLanguage` : string — active language code (default `'en'`).
  - `translations` : object — mapping languageCode → translation object.
  - `fallbackTranslations` : object — typically English translations used as fallback.
  - `isLoading` : boolean — whether a language file is being fetched.
  - `loadedLanguages` : Set — language codes already loaded.

- **Primary methods:**
  - `initialize()` : async — loads fallback (`en`) and the saved/current language, applies translations to the DOM, and replaces global `t`/`translate` stubs. Emits `WebHooks.onLanguagePackLoaded` if present. Returns `true` on success.
  - `getSavedLanguage()` : string — returns language from `window.localDB` if present, else derives from `navigator.language` and supported list, defaulting to `'en'`.
  - `loadLanguage(languageCode)` : async — fetches `lang/{languageCode}.json`, stores it in `translations`, marks as loaded, and returns the translations. Falls back to English when appropriate.
  - `setLanguage(languageCode)` : async — loads language (if needed), updates `currentLanguage`, persists to `localDB` (`AppLanguage`), applies translations to DOM, and dispatches a `languageChanged` CustomEvent with details.
  - `translate(key, defaultValue = null, params = {})` : string — resolves a translation key against current translations, falls back to `fallbackTranslations`, uses `defaultValue` or the key if missing, and substitutes `{param}` placeholders using `params`.
  - `t(key, defaultValue = null, params = {})` : alias for `translate`.
  - `replaceParameters(text, params)` : string — helper replacing `{name}` tokens with `params.name` values.
  - `applyTranslations()` : void — finds DOM elements with `data-translate`, `data-translate-title`, and `data-translate-placeholder` and applies the corresponding translations (textContent, title, placeholder). Handles `INPUT` placeholder specifically.
  - `getAvailableLanguages()` : array — returns list of supported language objects `{code, name}`.
  - `getCurrentLanguage()` : string — returns `currentLanguage`.
  - `isLanguageLoaded(languageCode)` : boolean — check if language is in `loadedLanguages`.
  - `getAllTranslations()` : object — returns the `translations` map (useful for debugging).

- **Events / Hooks:**
  - Dispatches `languageChanged` on `document` when `setLanguage` completes: event detail contains `{ language, translations }`.
  - Calls `window.WebHooks.onLanguagePackLoaded(translations)` (if present) after `initialize()` loads the pack.
  - Provides global fallback functions `window.t` and `window.translate` before initialization; these are replaced with the bound methods after initialization.

- **DOM integration:**
  - Elements with `data-translate="key"` get `textContent` updated (or `placeholder` for text-like inputs).
  - `data-translate-title` → `title`
  - `data-translate-placeholder` → `placeholder`

- **Persistence:**
  - Stores chosen language under `window.localDB.setItem('AppLanguage', code)` when `setLanguage` is called.

- **Notes / Behavior:**
  - Always attempts to load `en` as a fallback first when initializing a non-`en` language.
  - If `loadLanguage` fails for a non-`en` language it falls back to loading `en`.
  - `initialize()` replaces global `window.t`/`window.translate` stubs so other modules can safely call `t()` before initialization completes.
  - `getSavedLanguage()` supports a defined set of supported languages and falls back to English if the browser language isn't supported.

- **Usage examples:**
  - Use `t('some.key')` in JS to fetch translations.
  - In HTML: `<button data-translate="login.button">` — the manager will set the text content or placeholder accordingly.

- **Debug / Exports:**
  - `languageManager` is exposed on `window` and added to `App.managers.language` after DOMContentLoaded initialization.
  - The module exports `LanguageManager` for CommonJS environments (`module.exports = LanguageManager`).
