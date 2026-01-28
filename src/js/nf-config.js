/**
 * @fileoverview Central configuration file for the Zammad ticket system
 * @author danielknng
 * @module NFConfig
 * @since 2025-07-15
 * @version 1.0.0
 */

/**
 * Main configuration object containing all settings for the ticket frontend.
 * Manages API URLs, UI behavior, security policies, debug options, and system settings.
 * 
 * @namespace NF_CONFIG
 * @property {Object} api - API configuration settings
 * @property {Object} language - Language and internationalization settings
 * @property {Object} links - External URL references
 * @property {Object} system - System-wide settings and assets
 * @property {Object} ui - User interface configuration
 * @property {Object} security - Security policies and file restrictions
 * @property {Object} debug - Debug and logging configuration
 * @property {Function} validateConfig - Configuration validation method
 */
const NF_CONFIG = {
    /**
     * API configuration settings
     * @namespace NF_CONFIG.api
     * @property {string} baseUrl - Base URL for Zammad API endpoints
     * @property {Object} knowledgeBase - Knowledge base configuration
     * @property {string} knowledgeBase.id - Knowledge base identifier
     * @property {string} knowledgeBase.locale - Locale for knowledge base content
     * @property {string} knowledgeBase.flavor - Knowledge base flavor (public/private)
     * @property {number} timeout - Request timeout in milliseconds
     * @property {number} retryAttempts - Number of retry attempts for failed requests
     *  @property {boolean} allowRequestType - Wether you want to allow the user to pick the request type of his Ticket
     */
    api: {
        baseUrl: 'https://helpdesk.yourdomain.de/api/v1',
        knowledgeBase: {
            id: "1",
            locale: "de-de",
            flavor: "public"
        },
        timeout: 10000,
        retryAttempts: 3,
        // If you want to use this feature, make sure that in Zammad you have a custom object with the name "type" and the format "Single selection field". 
        // This way, the user can choose the request type of his ticket. (E.g.: General request, Issue, Question, ...)
        // Check the filters.allowedRequestTypes to see which request types are allowed to be chosen (further below in the file).
        allowRequestType: true
    },

    /**
     * Language and internationalization configuration
     * @namespace NF_CONFIG.language
     * @property {string} default - Default language code
     * @property {string} current - Currently active language code
     * @property {string} basePath - Base path for language files
     * @property {Object} supported - Supported languages configuration
     * @property {Object} paths - Language file path templates
     */
    language: {
        default: 'en',
        current: 'en',
        basePath: '../lang',
        supported: {
            en: {
                locale: 'en-US',
                label: 'English'
            },
            de: {
                locale: 'de-DE', 
                label: 'Deutsch'
            }
        },
        paths: {
            ui: '{lang}/ui.json',
            aria: '{lang}/aria.json', 
            system: '{lang}/system.json',
            messages: '{lang}/messages.json',
            utils: '{lang}/utils.json'
        }
    },

    /**
     * External URL references
     * @namespace NF_CONFIG.links
     * @property {string} knowledgePortal - URL to the knowledge portal
     * @property {string} helpdeskBase - Base URL for helpdesk system
     */
    links: {
        knowledgePortal: 'https://helpdesk.yourdomain.de/help/de-de',
        helpdeskBase: 'https://helpdesk.yourdomain.de'
    },

    /**
     * System-wide settings and assets
     * @namespace NF_CONFIG.system
     * @property {string} supportEmail - Support team email address
     * @property {Object} assets - UI assets and display settings
     */
    system: {
        supportEmail: 'it-service@yourdomain.com',
        assets: {
            triggerButtonImage: '../../public/img/it-service_portal.png',
            triggerButtonAlt: 'IT-Service Portal',
            triggerButtonLabel: 'Open IT-Service Portal',
            systemEmailFilter: ['helpdesk@yourdomain.de']  // Hide system emails in ticket details
        }
    },

    /**
     * User interface configuration
     * @namespace NF_CONFIG.ui
     * @property {number} statusMessageDuration - Duration for status messages in milliseconds
     * @property {number} searchMinLength - Minimum search query length
     * @property {number} maxSearchResults - Maximum number of search results
     * @property {number} debounceTimeout - Debounce timeout for search in milliseconds
     * @property {Object} login - Login-specific settings
     * @property {number} defaultGroup - Default group ID for new tickets
     * @property {Object} cache - Cache configuration with TTL values
     * @property {Object} filters - Filter and sorting configuration
     * @property {Array<string>} filters.allowedRequestTypes - Optional array of allowed request type values to show in dropdown
     */
    ui: {
        // Timing settings
        statusMessageDuration: 4000,
        searchMinLength: 2,
        maxSearchResults: 10,
        debounceTimeout: 300,

        // Login settings
        login: {
            maxAttempts: 3
        },

        // Default group - Get IDs from: https://helpdesk.yourdomain.com/api/v1/groups
        defaultGroup: 2,

        // Cache settings for performance
        cache: {
            searchResultsTTL: 2 * 60 * 1000,                    // 2 minutes for search results (Knowledgebase)
            currentYearActiveTicketListTTL: 15 * 60 * 1000,     // 15 minutes for active tickets
            currentYearActiveTicketDetailTTL: 15 * 60 * 1000,   // 15 minutes for active ticket details
            currentYearClosedTicketListTTL: 4 * 60 * 60 * 1000, // 4 hours for closed tickets
            currentYearClosedTicketDetailTTL: 4 * 60 * 60 * 1000, // 4 hours for closed ticket details
            archivedTicketListTTL: 30 * 24 * 60 * 60 * 1000,   // 30 days for archived tickets
            archivedTicketDetailTTL: 30 * 24 * 60 * 60 * 1000, // 30 days for archived ticket details
            requestTypeTTL: 24 * 60 * 60 * 1000                // 24 hours for requestType options
        },

        // Filter settings - Get status IDs from: https://helpdesk.yourdomain.com/api/v1/ticket_states
        // What get's shown in the ticket list
        filters: {
            statusCategories: {
                active: [1, 2, 3, 8, 9, 10, 13, 15],   // new, open, pending reminder, waiting for customer, in progress, waiting for external
                closed: [4],                 // closed
                inactive: [5, 7]             // merged, pending close
            },
            defaultStatusFilter: 'active',
            defaultSortOrder: 'date_desc',
            defaultYear: new Date().getFullYear(),
            availableYears: [
                new Date().getFullYear(),
                new Date().getFullYear() - 1,
                new Date().getFullYear() - 2
            ],
            // Allowed request types to show in the dropdown (optional)
            // If not specified or empty, all available request types will be shown
            // Values must match the "value" field from Zammad's object_manager_attributes API
            // Example: ["problem", "general_request", "procurement"]
            allowedRequestTypes: []
        }
    },

    /**
     * Security policies and file restrictions
     * @namespace NF_CONFIG.security
     * @property {number} maxFileSize - Maximum file size in bytes
     * @property {Array<string>} allowedFileTypes - Array of allowed MIME types
     * @property {Array<string>} imageExtensions - Array of supported image file extensions
     * @property {boolean} emailAttachmentsAllowed - Whether email attachments are permitted
     * @property {number} sessionTimeout - Session timeout in milliseconds
     */
    security: {
        maxFileSize: 10 * 1024 * 1024,  // 10 MB
        allowedFileTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // Email attachments (enabled via emailAttachmentsAllowed)
            'message/rfc822',  // .eml files
            'application/vnd.ms-outlook'  // .msg files
        ],
        imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
        emailAttachmentsAllowed: true,  // Allow email attachments (eml files)
        sessionTimeout: 30 * 60 * 1000  // 30 minutes
    },

    /**
     * Debug and logging configuration
     * @namespace NF_CONFIG.debug
     * @property {boolean} enabled - Whether debug mode is enabled
     * @property {string} logLevel - Logging level (debug|info|warn|error)
     */
    debug: {
        enabled: true,      // Set to false in production
        logLevel: 'debug'   // 'debug', 'info', 'warn', 'error'
    },
    /**
     * Validates the configuration object for required properties and consistency
     * @function validateConfig
     * @memberof NF_CONFIG
     * @returns {Object} Validation result object
     * @returns {boolean} returns.isValid - Whether configuration is valid
     * @returns {Array<string>} returns.errors - Array of validation errors
     * @returns {Array<string>} returns.warnings - Array of validation warnings
     */
    validateConfig: function() {
        const errors = [];
        const warnings = [];
        
        // Required configurations
        if (!this.api?.baseUrl) errors.push('api.baseUrl is required');
        if (!this.api?.retryAttempts) errors.push('api.retryAttempts is required');
        if (!this.api?.timeout) errors.push('api.timeout is required');
        if (!this.system?.supportEmail) errors.push('system.supportEmail is required');
        if (!this.ui?.statusMessageDuration) errors.push('ui.statusMessageDuration is required');
        if (!this.ui?.defaultGroup) errors.push('ui.defaultGroup is required');
        if (!this.ui?.login?.maxAttempts) errors.push('ui.login.maxAttempts is required');
        if (!this.ui?.cache?.searchResultsTTL) errors.push('ui.cache.searchResultsTTL is required');
        if (!this.ui?.filters?.statusCategories?.active) errors.push('ui.filters.statusCategories.active is required');
        if (!this.ui?.filters?.statusCategories?.closed) errors.push('ui.filters.statusCategories.closed is required');
        
        // Language validation
        if (!this.language?.current) {
            errors.push('language.current is required');
        } else if (!this.language?.supported?.[this.language.current]) {
            warnings.push(`language.current '${this.language.current}' is not supported, falling back to '${this.language.default || 'en'}'`);
            this.language.current = this.language.default || 'en';
        }
        
        // Debug validation
        if (this.debug && typeof this.debug.enabled !== 'boolean') {
            warnings.push('debug.enabled should be boolean');
        }
        if (this.debug?.enabled && !this.debug.logLevel) {
            errors.push('debug.logLevel is required when debug is enabled');
        }
        
        const isValid = errors.length === 0;
        
        if (!isValid) {
            console.error('NF_CONFIG validation failed:', errors);
        }
        if (warnings.length > 0) {
            console.warn('NF_CONFIG validation warnings:', warnings);
        }
        if (isValid && warnings.length === 0) {
            console.log('NF_CONFIG validation passed');
        }
        
        return { isValid, errors, warnings };
    }
};

window.NF_CONFIG = NF_CONFIG;

// Validate configuration
const configValidation = NF_CONFIG.validateConfig();
if (!configValidation.isValid) {
    throw new Error('NF_CONFIG validation failed. Check console for details.');
}

// Initialize logger
if (typeof window.nfReinitializeLogger === 'function') {
    window.nfReinitializeLogger();
} else {
    setTimeout(() => {
        if (typeof window.nfReinitializeLogger === 'function') {
            window.nfReinitializeLogger();
        }
    }, 100);
}

// Initialize language manager
if (typeof window !== 'undefined') {
    import('./nf-lang.js').then(({ nfLang }) => {
        nfLang.setLanguage(NF_CONFIG.language.current).then(() => {
            console.log('Language system initialized');
            // Fire event for UI initialization
            window.dispatchEvent(new CustomEvent('nfLanguageReady'));
        }).catch(error => {
            console.error('Failed to initialize language system:', error);
        });
    });
}

export { NF_CONFIG };
