/**
 * @fileoverview Language management system for internationalization
 * @author danielknng
 * @module NFLang
 * @since 2025-07-15
 * @version 1.0.0
 */

import { NF_CONFIG } from './nf-config.js';

/**
 * Language manager for the ticket frontend.
 * Handles loading language files and providing translations with caching support.
 * 
 * @class NFLanguageManager
 */
class NFLanguageManager {
    /**
     * Creates a new language manager instance with configuration from NF_CONFIG
     * @constructor
     */
    constructor() {
        /** @type {Object} Language configuration from NF_CONFIG */
        this.config = NF_CONFIG.language;
        /** @type {string} Currently active language code */
        this.currentLanguage = NF_CONFIG.language.current;
        /** @type {Object} Loaded language objects storage */
        this.languages = {};
        /** @type {string} Default fallback language code */
        this.defaultLanguage = NF_CONFIG.language.default;
        /** @type {Array<string>} Array of supported language codes */
        this.supportedLanguages = Object.keys(NF_CONFIG.language.supported);
        /** @type {string} Base path for language files */
        this.basePath = NF_CONFIG.language.basePath;
        /** @type {Map} Cache for language data */
        this.cache = new Map();
    }

    /**
     * Loads language files for a specific language
     * @param {string} language - Language code (e.g., 'en', 'de')
     * @returns {Promise<Object>} Complete language object
     */
    async loadLanguage(language) {
        if (!this.supportedLanguages.includes(language)) {
            console.warn(`Language '${language}' not supported, falling back to '${this.defaultLanguage}'`);
            language = this.defaultLanguage;
        }

        if (this.languages[language]) {
            return this.languages[language]; // Return cached
        }

        try {
            // Build file paths using configuration
            const pathTemplates = this.config.paths;
            const filePaths = Object.keys(pathTemplates).map(key => ({
                key,
                url: `${this.basePath}/${pathTemplates[key].replace('{lang}', language)}`
                    .replace(/\/+/g, '/') // Remove double slashes
            }));

            // Load all language files for this language
            const responses = await Promise.all(
                filePaths.map(({ url }) => fetch(url))
            );

            // Check if all responses are OK
            const failedUrls = responses
                .map((response, index) => ({ response, url: filePaths[index].url }))
                .filter(({ response }) => !response.ok)
                .map(({ url }) => url);

            if (failedUrls.length > 0) {
                throw new Error(`Failed to load language files: ${failedUrls.join(', ')}`);
            }

            // Parse all JSON responses
            const jsonData = await Promise.all(responses.map(response => response.json()));

            // Combine all language data using the configured structure
            const languageData = {};
            filePaths.forEach(({ key }, index) => {
                languageData[key] = jsonData[index];
            });

            // Store complete language data
            this.languages[language] = {
                ...languageData,
                meta: {
                    code: language,
                    loadedAt: new Date().toISOString()
                }
            };

            return this.languages[language];
        } catch (error) {
            console.error(`Failed to load language '${language}':`, error);
            
            // Fallback to default language if not already trying default
            if (language !== this.defaultLanguage) {
                return this.loadLanguage(this.defaultLanguage);
            }
            
            throw error;
        }
    }

    /**
     * Sets the current language and loads it if necessary
     * @param {string} language - Language code to switch to
     * @returns {Promise<Object>} Language data
     */
    async setLanguage(language) {
        const langData = await this.loadLanguage(language);
        this.currentLanguage = language;
        
        // Update global references for backward compatibility
        if (typeof window !== 'undefined') {
            window.nfLabels = langData.ui;
            window.nfAriaLabels = langData.aria;
            window.nfSystemData = langData.system;
            window.nfMessages = langData.messages;
            window.nfUtilsMessages = langData.utils;
        }

        return langData;
    }

    /**
     * Gets a UI label with optional placeholders
     * @param {string} key - Dot-notation key (e.g., 'ticketListHeaders.subject')
     * @param {Object} placeholders - Optional placeholder values
     * @returns {string} Translated text
     */
    getLabel(key, placeholders = {}) {
        const langData = this.languages[this.currentLanguage];
        if (!langData) {
            console.warn(`Language '${this.currentLanguage}' not loaded`);
            return key;
        }

        let value = this.getNestedValue(langData.ui, key);
        
        if (value === undefined) {
            console.warn(`Translation key '${key}' not found for language '${this.currentLanguage}'`);
            return key;
        }

        // Replace placeholders
        if (typeof value === 'string' && Object.keys(placeholders).length > 0) {
            Object.entries(placeholders).forEach(([placeholder, replacement]) => {
                value = value.replace(`{${placeholder}}`, replacement);
            });
        }

        return value;
    }

    /**
     * Gets an ARIA label
     * @param {string} key - Key for ARIA label
     * @param {Object} placeholders - Optional placeholder values
     * @returns {string} ARIA label text
     */
    getAriaLabel(key, placeholders = {}) {
        const langData = this.languages[this.currentLanguage];
        if (!langData) return key;

        let value = langData.aria[key];
        if (!value) return key;

        // Replace placeholders
        if (Object.keys(placeholders).length > 0) {
            Object.entries(placeholders).forEach(([placeholder, replacement]) => {
                value = value.replace(`{${placeholder}}`, replacement);
            });
        }

        return value;
    }

    /**
     * Gets system data (ticket states, email separators, etc.)
     * @param {string} key - Key for system data
     * @returns {*} System data value
     */
    getSystemData(key) {
        const langData = this.languages[this.currentLanguage];
        if (!langData) return undefined;

        return this.getNestedValue(langData.system, key);
    }

    /**
     * Gets a message with optional placeholders
     * @param {string} key - Key for message
     * @param {Object} placeholders - Optional placeholder values
     * @returns {string} Message text
     */
    getMessage(key, placeholders = {}) {
        const langData = this.languages[this.currentLanguage];
        if (!langData) return key;

        let value = langData.messages[key];
        if (!value) return key;

        // Replace placeholders
        if (Object.keys(placeholders).length > 0) {
            Object.entries(placeholders).forEach(([placeholder, replacement]) => {
                value = value.replace(`{${placeholder}}`, replacement);
            });
        }

        return value;
    }

    /**
     * Gets a utility message with optional placeholders
     * @param {string} key - Key for utility message
     * @param {Object} placeholders - Optional placeholder values
     * @returns {string} Utility message text
     */
    getUtilsMessage(key, placeholders = {}) {
        const langData = this.languages[this.currentLanguage];
        if (!langData) return key;

        let value = langData.utils[key];
        if (!value) return key;

        // Replace placeholders
        if (Object.keys(placeholders).length > 0) {
            Object.entries(placeholders).forEach(([placeholder, replacement]) => {
                value = value.replace(`{${placeholder}}`, replacement);
            });
        }

        return value;
    }

    /**
     * Helper to get nested object values using dot notation
     * @param {Object} obj - Object to search in
     * @param {string} key - Dot-notation key
     * @returns {*} Found value or undefined
     */
    getNestedValue(obj, key) {
        return key.split('.').reduce((current, keyPart) => {
            return current && current[keyPart] !== undefined ? current[keyPart] : undefined;
        }, obj);
    }

    /**
     * Gets list of supported languages
     * @returns {Array} Array of language codes
     */
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }

    /**
     * Gets current language code
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get the locale string for the current language
     * @returns {string} Locale string (e.g., 'en-US', 'de-DE')
     */
    getCurrentLocale() {
        const currentLang = this.currentLanguage;
        const langConfig = this.config.supported[currentLang];
        return langConfig?.locale || 'en-US';
    }
}

// Create global instance
const nfLang = new NFLanguageManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.nfLang = nfLang;
}

export { NFLanguageManager, nfLang };
