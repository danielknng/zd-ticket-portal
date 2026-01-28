/**
 * @fileoverview Custom error classes for better error handling
 * @author danielknng
 * @module utils/errors
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Base application error class with additional metadata
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
    /**
     * @param {string} message - User-friendly error message
     * @param {string} code - Unique error code for programmatic handling
     * @param {*} details - Additional technical details about the error
     */
    constructor(message, code = 'GENERAL_ERROR', details = null) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * API-specific error class
 * @class ApiError
 * @extends AppError
 */
export class ApiError extends AppError {
    /**
     * @param {string} message - Error message
     * @param {number} status - HTTP status code
     * @param {*} response - Response data
     */
    constructor(message, status, response) {
        super(message, `API_${status}`, response);
        this.name = 'ApiError';
        this.status = status;
    }
}

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.AppError = AppError;
    window.ApiError = ApiError;
}

