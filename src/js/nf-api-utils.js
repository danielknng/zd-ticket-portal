/**
 * @fileoverview Centralized API fetch utility with retries and error handling
 * @author danielknng
 * @module NFApiUtils
 * @since 2025-07-15
 * @version 1.0.0
 */

import { NF_CONFIG } from './nf-config.js';

/**
 * Creates standardized authentication headers for Zammad API requests
 * @param {string} token - Authentication token (Basic auth credentials)
 * @returns {Object} Headers object with Authorization and Content-Type
 */
export function getAuthHeaders(token) {
    return {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Unified API fetch utility with retries and error handling, using config values
 * @param {string} url - The API endpoint
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} [retries] - Number of retry attempts on failure (default: from config)
 * @param {number} [timeout] - Timeout in ms (default: from config)
 * @returns {Promise<Response>} - Resolves with the Response object
 */
export async function nfApiFetch(url, options = {}, retries, timeout) {
    const retryAttempts = typeof retries === 'number' ? retries : NF_CONFIG.api.retryAttempts;
    const timeoutMs = typeof timeout === 'number' ? timeout : NF_CONFIG.api.timeout;
    let lastError;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            // Always return the Response object, let caller handle .ok and .json()
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < retryAttempts) {
                await new Promise(res => setTimeout(res, 500));
            }
        }
    }
    throw lastError;
}

/**
 * Helper function for GET requests with standardized configuration
 * @param {string} url - The API endpoint URL
 * @param {Object} [options={}] - Additional fetch options
 * @param {number} [retries] - Override retry attempts (uses config default)
 * @param {number} [timeout] - Override timeout value (uses config default)
 * @returns {Promise<Response>} The fetch Response object
 */
export function nfApiGet(url, options = {}, retries, timeout) {
    return nfApiFetch(url, { ...options, method: 'GET' }, retries, timeout);
}

/**
 * Helper function for POST requests with JSON content type
 * @param {string} url - The API endpoint URL
 * @param {Object} body - Request body data to be JSON-stringified
 * @param {Object} [options={}] - Additional fetch options
 * @param {number} [retries] - Override retry attempts (uses config default)
 * @param {number} [timeout] - Override timeout value (uses config default)
 * @returns {Promise<Response>} The fetch Response object
 */
export function nfApiPost(url, body, options = {}, retries, timeout) {
    return nfApiFetch(url, {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: JSON.stringify(body)
    }, retries, timeout);
}

/**
 * Helper function for PUT requests with JSON content type
 * @param {string} url - The API endpoint URL
 * @param {Object} body - Request body data to be JSON-stringified
 * @param {Object} [options={}] - Additional fetch options
 * @param {number} [retries] - Override retry attempts (uses config default)
 * @param {number} [timeout] - Override timeout value (uses config default)
 * @returns {Promise<Response>} The fetch Response object
 */
export function nfApiPut(url, body, options = {}, retries, timeout) {
    return nfApiFetch(url, {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: JSON.stringify(body)
    }, retries, timeout);
}
