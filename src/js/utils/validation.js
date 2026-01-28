/**
 * @fileoverview Centralized input validation utilities
 * @author danielknng
 * @module utils/validation
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { createApiError } from '../api/http.js';

/**
 * Centralized validators to eliminate duplication across API layer
 * @namespace Validators
 */
export const Validators = {
    /**
     * Validates a ticket ID
     * @param {number|string} id - Ticket ID to validate
     * @throws {Error} If ticket ID is invalid
     * @returns {boolean} true if valid
     */
    ticketId(id) {
        if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
            throw createApiError(
                'Ticket ID is required and must be a number or string',
                'INVALID_TICKET_ID'
            );
        }
        return true;
    },

    /**
     * Validates a non-empty string
     * @param {string} value - Value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @throws {Error} If value is invalid
     * @returns {boolean} true if valid
     */
    nonEmptyString(value, fieldName) {
        if (!value || typeof value !== 'string' || !value.trim()) {
            throw createApiError(
                `${fieldName} is required and must be a non-empty string`,
                `INVALID_${fieldName.toUpperCase()}`
            );
        }
        return true;
    },

    /**
     * Validates ticket creation data
     * @param {Object} data - Ticket data to validate
     * @param {string} data.subject - Ticket subject
     * @param {string} data.body - Ticket body
     * @param {FileList|Array} [data.files] - Optional files
     * @param {string} [data.requestType] - Optional request type
     * @throws {Error} If validation fails
     * @returns {boolean} true if valid
     */
    ticket(data) {
        const errors = [];
        
        if (!data.subject?.trim()) {
            errors.push('Subject is required');
        }
        if (!data.body?.trim()) {
            errors.push('Body is required');
        }
        if (data.files && !Array.isArray(data.files) && !(data.files instanceof FileList)) {
            errors.push('Files must be an array or FileList');
        }
        if (data.requestType !== undefined && (typeof data.requestType !== 'string' || !data.requestType.trim())) {
            errors.push('Request type must be a non-empty string if provided');
        }
        
        if (errors.length > 0) {
            throw createApiError(
                `Ticket validation failed: ${errors.join(', ')}`,
                'INVALID_TICKET_DATA',
                { errors }
            );
        }
        
        return true;
    },

    /**
     * Validates reply data
     * @param {Object} data - Reply data to validate
     * @param {number|string} data.ticketId - Ticket ID
     * @param {string} data.text - Reply text
     * @param {FileList|Array} [data.files] - Optional files
     * @throws {Error} If validation fails
     * @returns {boolean} true if valid
     */
    reply(data) {
        this.ticketId(data.ticketId);
        this.nonEmptyString(data.text, 'Reply text');
        
        if (data.files && !Array.isArray(data.files) && !(data.files instanceof FileList)) {
            throw createApiError('Files must be an array or FileList', 'INVALID_FILES');
        }
        
        return true;
    }
};

export default Validators;

