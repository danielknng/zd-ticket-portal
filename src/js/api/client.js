/**
 * @fileoverview Centralized API client for Zammad API communication
 * @author danielknng
 * @module api/client
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { apiGet, apiPost, apiPut, getAuthHeaders, createApiError } from './http.js';
import { NF_CONFIG } from '../core/config.js';
import { processFilesToAttachments } from '../utils/file-processor.js';
import { Validators } from '../utils/validation.js';

/**
 * Centralized API client class for Zammad API communication
 * Provides unified interface for all API operations with consistent error handling
 * 
 * @class ZammadApiClient
 */
export class ZammadApiClient {
    /**
     * @param {string} baseUrl - Base URL for Zammad API
     * @param {string|null} authToken - Authentication token (Basic auth credentials)
     */
    constructor(baseUrl, authToken = null) {
        this.baseUrl = baseUrl;
        this.authToken = authToken;
    }

    /**
     * Set authentication token
     * @param {string|null} token - Authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Get request headers with authentication
     * @private
     * @returns {Object} Headers object
     */
    _getHeaders() {
        if (!this.authToken) {
            throw createApiError('Authentication token is required', 'AUTH_REQUIRED');
        }
        return getAuthHeaders(this.authToken);
    }

    /**
     * Build full URL for an endpoint
     * @private
     * @param {string} endpoint - API endpoint (e.g., '/users/me')
     * @returns {string} Full URL
     */
    _buildUrl(endpoint) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${this.baseUrl}${cleanEndpoint}`;
    }

    /**
     * Authenticate user and get user data
     * @param {string} username - Username or email
     * @param {string} password - Password
     * @returns {Promise<Object>} User data object
     */
    async authenticate(username, password) {
        Validators.nonEmptyString(username, 'Username');
        Validators.nonEmptyString(password, 'Password');

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            throw createApiError('Username and password cannot be empty', 'MISSING_CREDENTIALS');
        }

        const authString = `${cleanUsername}:${cleanPassword}`;
        const credentials = btoa(authString);

        const response = await apiGet(this._buildUrl('/users/me'), {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw createApiError('Invalid credentials', 'INVALID_CREDENTIALS');
            }
            throw createApiError('Authentication failed', 'AUTH_FAILED', { status: response.status });
        }

        const userData = await response.json();
        this.setAuthToken(credentials);
        return userData;
    }

    /**
     * Get current authenticated user
     * @returns {Promise<Object>} User data object
     */
    async getCurrentUser() {
        const response = await apiGet(this._buildUrl('/users/me'), {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Failed to get current user', 'USER_FETCH_FAILED', { status: response.status });
        }

        return await response.json();
    }

    /**
     * Get ticket by ID with articles
     * @param {number|string} ticketId - Ticket ID
     * @returns {Promise<Object>} Ticket object with articles
     */
    async getTicket(ticketId) {
        Validators.ticketId(ticketId);

        const ticketResponse = await apiGet(this._buildUrl(`/tickets/${ticketId}`), {
            headers: this._getHeaders()
        });

        if (!ticketResponse.ok) {
            throw createApiError('Error loading ticket details', 'TICKET_FETCH_FAILED', { 
                status: ticketResponse.status 
            });
        }

        const ticket = await ticketResponse.json();

        const articlesResponse = await apiGet(this._buildUrl(`/ticket_articles/by_ticket/${ticketId}`), {
            headers: this._getHeaders()
        });

        if (!articlesResponse.ok) {
            throw createApiError('Error loading ticket articles', 'ARTICLES_FETCH_FAILED', { 
                status: articlesResponse.status 
            });
        }

        const articles = await articlesResponse.json();
        ticket.articles = articles;

        return ticket;
    }

    /**
     * Get filtered tickets
     * @param {Object} filters - Filter options
     * @param {string} [filters.statusCategory='active'] - Status category
     * @param {number} [filters.year] - Year filter
     * @param {string} [filters.sortOrder='date_desc'] - Sort order
     * @param {string} [filters.searchQuery=''] - Search query
     * @returns {Promise<Array>} Array of ticket objects
     */
    async getTickets(filters = {}) {
        const {
            statusCategory = 'active',
            year,
            sortOrder = 'date_desc',
            searchQuery = ''
        } = filters;

        // Build query string
        let query = searchQuery || '';
        
        // Add status filter if provided
        if (statusCategory && statusCategory !== 'all') {
            // This would need to be implemented based on your filter logic
            // For now, returning empty array as placeholder
        }

        const response = await apiGet(this._buildUrl(`/tickets/search?query=${encodeURIComponent(query)}`), {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Error fetching tickets', 'TICKETS_FETCH_FAILED', { status: response.status });
        }

        return await response.json();
    }

    /**
     * Create a new ticket
     * @param {Object} ticketData - Ticket data
     * @param {string} ticketData.subject - Ticket subject
     * @param {string} ticketData.body - Ticket body/message
     * @param {FileList|Array} [ticketData.files] - Optional attachments
     * @param {string} [ticketData.requestType] - Optional request type
     * @returns {Promise<Object>} Created ticket object
     */
    async createTicket(ticketData) {
        Validators.ticket(ticketData);

        const { subject, body, files, requestType } = ticketData;

        // Process files using utility to eliminate duplication
        let attachments = [];
        if (files && files.length > 0) {
            // Import fileToBase64 function from new file-handler module
            const { fileToBase64 } = await import('../features/upload/file-handler.js');
            attachments = await processFilesToAttachments(files, fileToBase64);
        }

        const payload = {
            title: subject,
            group_id: NF_CONFIG.ui.defaultGroup,
            customer_id: this._getUserId(),
            article: {
                subject: subject,
                body: body,
                type: 'web',
                attachments: attachments.length > 0 ? attachments : undefined
            }
        };

        if (requestType && NF_CONFIG.api.allowRequestType) {
            payload.type = requestType;
        }

        const response = await apiPost(this._buildUrl('/tickets'), payload, {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Error creating ticket', 'TICKET_CREATE_FAILED', { status: response.status });
        }

        return await response.json();
    }

    /**
     * Send a reply to a ticket
     * @param {number|string} ticketId - Ticket ID
     * @param {string} text - Reply text
     * @param {FileList|Array} [files] - Optional attachments
     * @returns {Promise<Object>} Updated ticket object
     */
    async sendReply(ticketId, text, files) {
        Validators.reply({ ticketId, text, files });

        const articleData = {
            ticket_id: ticketId,
            body: text,
            type: 'web',
            internal: false
        };

        const response = await apiPost(this._buildUrl('/ticket_articles'), articleData, {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Error creating reply', 'REPLY_CREATE_FAILED', { status: response.status });
        }

        const article = await response.json();

        // Handle attachments if provided using utility
        if (files && files.length > 0) {
            const { fileToBase64 } = await import('../features/upload/file-handler.js');
            const attachments = await processFilesToAttachments(files, fileToBase64);
            
            for (const attachment of attachments) {
                const attachmentData = {
                    ticket_id: ticketId,
                    article_id: article.id,
                    filename: attachment.filename,
                    data: attachment.data,
                    'mime-type': attachment['mime-type']
                };

                await apiPost(this._buildUrl('/ticket_attachment'), attachmentData, {
                    headers: this._getHeaders()
                });
            }
        }

        return article;
    }

    /**
     * Close a ticket
     * @param {number|string} ticketId - Ticket ID
     * @returns {Promise<Object>} Updated ticket object
     */
    async closeTicket(ticketId) {
        Validators.ticketId(ticketId);

        const response = await apiPut(this._buildUrl(`/tickets/${ticketId}`), { state_id: 4 }, {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Error closing ticket', 'TICKET_CLOSE_FAILED', { status: response.status });
        }

        return await response.json();
    }

    /**
     * Get request types for ticket creation
     * @returns {Promise<Object>} Request types with options and default value
     */
    async getRequestTypes() {
        const response = await apiGet(this._buildUrl('/object_manager_attributes?object=Ticket&name=type'), {
            headers: this._getHeaders()
        });

        if (!response.ok) {
            throw createApiError('Error loading request types', 'REQUEST_TYPES_FETCH_FAILED', { 
                status: response.status 
            });
        }

        const data = await response.json();
        const attribute = Array.isArray(data)
            ? data.find(a => a.object === 'Ticket' && a.name === 'type')
            : data;

        if (!attribute || !attribute.data_option) {
            return { options: [], defaultValue: null };
        }

        const dataOption = attribute.data_option;
        let options = [];

        if (Array.isArray(dataOption.options)) {
            options = dataOption.options.map(opt => ({
                value: String(opt.value ?? ''),
                label: String(opt.name ?? opt.value ?? '')
            })).filter(o => o.value);
        } else if (dataOption.options && typeof dataOption.options === 'object') {
            options = Object.entries(dataOption.options).map(([value, label]) => ({
                value: String(value),
                label: String(label)
            }));
        }

        // Filter options based on configuration
        const allowedRequestTypes = NF_CONFIG.ui.filters.allowedRequestTypes;
        if (Array.isArray(allowedRequestTypes) && allowedRequestTypes.length > 0) {
            const allowedSet = new Set(allowedRequestTypes.map(v => String(v)));
            options = options.filter(opt => allowedSet.has(opt.value));
        }

        const defaultValue = typeof dataOption.default === 'string' ? dataOption.default : null;

        return { options, defaultValue };
    }

    /**
     * Get user ID from state (helper method)
     * @private
     * @returns {number|string|null} User ID
     */
    _getUserId() {
        // Get from appState
        if (typeof window !== 'undefined' && window.appState) {
            return window.appState.get('userId');
        }
        return null;
    }
}

/**
 * Create a new API client instance
 * @param {string} [baseUrl] - Base URL (defaults to NF_CONFIG.api.baseUrl)
 * @param {string|null} [authToken] - Initial auth token
 * @returns {ZammadApiClient} New API client instance
 */
export function createApiClient(baseUrl, authToken = null) {
    const url = baseUrl || NF_CONFIG.api.baseUrl;
    if (!url) {
        throw createApiError('API base URL is required', 'MISSING_BASE_URL');
    }
    return new ZammadApiClient(url, authToken);
}

export default ZammadApiClient;

