/**
 * @fileoverview Advanced logger class for structured logging with configurable log levels
 * @author danielknng
 * @module core/logger
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Advanced logger class for structured logging with configurable log levels.
 * Supports different log levels and can be enabled/disabled for debugging.
 * 
 * @class NFLogger
 */
export class NFLogger {
    /**
     * Constructor for logger instance
     * @param {Object} config - Logger configuration object
     * @param {boolean} config.enabled - Enable/disable logging
     * @param {string} config.logLevel - Minimum log level ('debug', 'info', 'warn', 'error')
     */
    constructor(config = {}) {
        this.enabled = config.enabled || false;           // Logger on/off (should be false in production)
        this.level = config.logLevel || 'info';           // Default log level
        this.levels = { verbose: -1, debug: 0, info: 1, warn: 2, error: 3 }; // Numeric level mapping for comparisons
    }
    
    /**
     * Central log method - all other log methods use this
     * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
     * @param {string} message - Main log entry message
     * @param {*} data - Optional additional data (objects, arrays, etc.)
     */
    log(level, message, data = null) {
        if (!this.enabled) return;
        // Only log if level is >= configured level
        if (this.levels[level] < this.levels[this.level]) return;
        const timestamp = new Date().toISOString();
        const prefix = `[NF-${level.toUpperCase()}] ${timestamp}:`;
        if (data) {
            if (level === 'error') {
                console.error(prefix, message, data);
            } else if (level === 'warn') {
                console.warn(prefix, message, data);
            } else if (level === 'info') {
                console.info(prefix, message, data);
            } else if (level === 'debug') {
                console.debug(prefix, message, data);
            } else {
                console.log(prefix, message, data);
            }
        } else {
            if (level === 'error') {
                console.error(prefix, message);
            } else if (level === 'warn') {
                console.warn(prefix, message);
            } else if (level === 'info') {
                console.info(prefix, message);
            } else if (level === 'debug') {
                console.debug(prefix, message);
            } else {
                console.log(prefix, message);
            }
        }
    }
    
    verbose(message, data) { this.log('verbose', message, data); }
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

/**
 * Reinitializes the logger with current NF_CONFIG values
 * This should be called after NF_CONFIG is fully loaded
 * @returns {NFLogger} The reinitialized logger instance
 */
export function reinitializeLogger() {
    let nfLogger;
    if (typeof window !== 'undefined' && window.NF_CONFIG && window.NF_CONFIG.debug) {
        nfLogger = new NFLogger({
            enabled: !!window.NF_CONFIG.debug.enabled,
            logLevel: window.NF_CONFIG.debug.logLevel || 'info'
        });
        nfLogger.debug('Logger reinitialized with config', {
            enabled: !!window.NF_CONFIG.debug.enabled,
            logLevel: window.NF_CONFIG.debug.logLevel || 'info'
        });
    } else {
        nfLogger = new NFLogger({ enabled: false, logLevel: 'info' });
        nfLogger.warn('Logger reinitialized with defaults - NF_CONFIG not available');
    }
    return nfLogger;
}

// Create initial logger instance
let nfLogger;
if (typeof window !== 'undefined' && window.NF_CONFIG && window.NF_CONFIG.debug) {
    nfLogger = new NFLogger({
        enabled: !!window.NF_CONFIG.debug.enabled,
        logLevel: window.NF_CONFIG.debug.logLevel
    });
} else {
    nfLogger = new NFLogger({ enabled: false, logLevel: 'info' });
}


export default nfLogger;

