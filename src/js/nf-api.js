/**
 * @fileoverview API communication and authentication with Zammad
 * @author Daniel Könning
 * @module NFApi
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nfApiFetch, nfApiGet, nfApiPost, nfApiPut, createApiError } from './nf-api-utils.js';
import { ZAMMAD_API_URL, nf } from './nf-dom.js';
import { nfFileToBase64 } from './nf-file-upload.js';
import appState from './nf-state.js';
import nfEventBus from './nf-event-bus.js';
import { createApiClient } from './nf-api-client.js';

/**
 * Singleton API client instance
 * @type {ZammadApiClient|null}
 */
let apiClient = null;

/**
 * Get or create the API client instance
 * @returns {ZammadApiClient} API client instance
 */
function getApiClient() {
    if (!apiClient) {
        const baseUrl = ZAMMAD_API_URL();
        const userToken = getUserToken();
        apiClient = createApiClient(baseUrl, userToken);
    } else {
        // Update auth token if it changed
        const userToken = getUserToken();
        if (userToken) {
            apiClient.setAuthToken(userToken);
        }
    }
    return apiClient;
}

/**
 * Helper function to get user token from state management
 * Falls back to nf.userToken for backward compatibility
 * @returns {string|null} User authentication token
 */
function getUserToken() {
    return appState.get('userToken') || nf.userToken;
}

/**
 * Helper function to get user ID from state management
 * Falls back to nf.userId for backward compatibility
 * @returns {number|string|null} User ID
 */
function getUserId() {
    return appState.get('userId') || nf.userId;
}

/**
 * Authenticates a user against the Zammad API and stores the credentials
 * Uses HTTP Basic Authentication and validates credentials via /users/me endpoint
 * 
 * @param {string} username - Username or email address
 * @param {string} password - User password in plain text
 * @returns {Promise<Object>} User data object from Zammad or throws error
 */
async function nfAuthenticateUser(username, password) {
    // Input validation
    if (!username || typeof username !== 'string') {
        throw createApiError('Username is required and must be a string', 'INVALID_USERNAME');
    }
    if (!password || typeof password !== 'string') {
        throw createApiError('Password is required and must be a string', 'INVALID_PASSWORD');
    }
    
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark('auth-start');
    }
    
    try {
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();
        nfLogger.debug('Cleaned username', { cleanUsername });
        nfLogger.debug('Cleaned password length', { length: cleanPassword.length, masked: true });
        
        if (!cleanUsername || !cleanPassword) {
            nfLogger.error('Missing credentials', { cleanUsername, cleanPassword });
            const errorMessage = nfGetMessage('missingCredentials');
            throw createApiError(errorMessage, 'MISSING_CREDENTIALS');
        }
        
        const authString = `${cleanUsername}:${cleanPassword}`;
        const credentials = btoa(authString);
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Attempting authentication', { username: cleanUsername });
        }
        
        window.nfLogger.debug('Authentication starting', { 
            username: cleanUsername,
            hasConfig: !!window.NF_CONFIG,
            apiUrl: ZAMMAD_API_URL()
        });
        // Use /users/me endpoint to validate credentials
        nfLogger.debug('About to fetch', { url: `${ZAMMAD_API_URL()}/users/me` });
        const response = await nfApiGet(`${ZAMMAD_API_URL()}/users/me`, {
            headers: {
                'Authorization': `Basic ${credentials}`,  // HTTP Basic Authentication Header
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                const currentAttempts = appState.get('loginAttempts') || 0;
                const newAttempts = currentAttempts + 1;
                appState.set('loginAttempts', newAttempts);
                const maxAttempts = window.NF_CONFIG.ui.login.maxAttempts;
                
                if (newAttempts >= maxAttempts) {
                    appState.set('isAccountLocked', true);
                    const lockoutMessage = nfGetMessage('lockoutMessage');
                    nfEventBus.emit('login:failed', { reason: 'ACCOUNT_LOCKED', message: lockoutMessage });
                    throw createApiError(lockoutMessage, 'ACCOUNT_LOCKED');
                }
                
                // 401 = Unauthorized - invalid credentials
                // Simplified: no remaining attempts, just a generic warning
                const errorMessage = nfGetMessage('invalidCredentials');
                const warningMessage = nfGetMessage('attemptsWarning');
                const error = createApiError(errorMessage, 'INVALID_CREDENTIALS');
                error.attemptsWarning = warningMessage;
                nfEventBus.emit('login:failed', { reason: 'INVALID_CREDENTIALS', message: errorMessage, attempts: newAttempts });
                throw error;
            }
            // Other HTTP errors (500, 503, etc.)
            const errorMessage = nfGetMessage('authFailed', undefined, { status: response.status });
            nfEventBus.emit('login:failed', { reason: 'AUTH_FAILED', message: errorMessage, status: response.status });
            throw createApiError(errorMessage, 'AUTH_FAILED', { status: response.status });
        }
        
        const userData = await response.json();
        // Update state management
        appState.setMultiple({
            userToken: credentials,
            userId: userData.id,
            loginAttempts: 0,
            isAccountLocked: false
        });
        
        // Emit login success event
        nfEventBus.emit('login:success', { userId: userData.id, userData });
        
        // Backward compatibility: also set on nf object for legacy code
        nf.userToken = credentials;
        nf.userId = userData.id;
        
        if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
            NFUtils.storage.set('nf_session', {
                userId: userData.id,
                username: cleanUsername,
                timestamp: Date.now()              // Timestamp for session timeout
            });
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Authentication successful', { userId: userData.id });
        }
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure('Authentication', 'auth-start');  // Complete performance measurement
        }
        
        return userData;  // Return user data to calling function
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Authentication failed', { error: error.message });
        }
        throw error;  // Pass error to calling function
    }
}

/**
 * Loads detailed information for a specific ticket including all messages/articles
 * Combines ticket data and related articles in a single object
 * 
 * @param {number} ticketId - The unique ID of the ticket in Zammad
 * @returns {Promise<Object>} Ticket object with attached messages or throws error
 */
async function nfFetchTicketDetail(ticketId) {
    const cacheKey = `ticket_detail_${ticketId}`;
    
    if (typeof nfCache !== 'undefined') {
        const cached = nfCache.get(cacheKey);
        if (cached) {
            if (typeof nfLogger !== 'undefined') {
                const cacheAgeMs = Date.now() - (cached.cachedAt || 0);
                const cacheAgeSeconds = Math.round(cacheAgeMs / 1000);
                nfLogger.debug('Using cached ticket detail', { key: cacheKey, ticketId, cacheAgeSeconds });
                nfLogger.info('Ticket detail loaded from cache', { ticketId, cacheAgeSeconds });
            }
            return cached;
        } else {
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('No cached ticket detail found, fetching from API', { key: cacheKey, ticketId });
            }
        }
    }
    
    // Performance measurement start (with fallback)
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark('fetch-ticket-detail-start');
    }
    
    try {
        // Use API client to fetch ticket with articles
        const ticket = await getApiClient().getTicket(ticketId);
        const articles = ticket.articles || [];
        
        ticket.messages = (articles || []).map(a => ({
            from: a.from || (a.sender_id === 1 ? 'Support' : 'User'),
            date: a.created_at,
            body: a.body || ''
        }));
        
        if (typeof nfCache !== 'undefined') {
            const ticketYear = new Date(ticket.created_at).getFullYear();
            const ticketStateId = ticket.state_id;
            
            // Get closed state IDs from config
            const closedStateIds = window.NF_CONFIG.ui.filters.statusCategories.closed;
            const isClosedTicket = closedStateIds.includes(ticketStateId);
            
            let cacheTTL;
            let cacheDescription;
            let cacheReason;
            
            if (ticketYear < currentYear) {
                // Archived tickets (any status): long cache
                cacheTTL = window.NF_CONFIG.ui.cache.archivedTicketDetailTTL;
                cacheDescription = 'long-term (archived)';
                cacheReason = 'previous year';
            } else if (isClosedTicket) {
                // Current year closed tickets: medium cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearClosedTicketDetailTTL;
                cacheDescription = 'medium-term (closed current year)';
                cacheReason = 'closed current year';
            } else {
                // Current year active tickets: short cache (refreshable)
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearActiveTicketDetailTTL;
                cacheDescription = 'short-term (active current year)';
                cacheReason = 'active current year';
            }
            
            // Add timestamp for better logging
            ticket.cachedAt = Date.now();
            nfCache.set(cacheKey, ticket, cacheTTL);
            
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Ticket detail cache strategy', { 
                    key: cacheKey, 
                    ticketId, 
                    articleCount: articles.length, 
                    strategy: cacheDescription,
                    reason: cacheReason,
                    ttlMinutes: Math.round(cacheTTL / (60 * 1000)),
                    ticketYear,
                    currentYear: currentYear,
                    ticketStateId,
                    isClosedTicket,
                    localStorage: true 
                });
            }
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Ticket detail fetched successfully', { ticketId, articleCount: articles.length });
        }
        
        // Performance measurement complete (with fallback)
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure('Fetch Ticket Detail', 'fetch-ticket-detail-start');
        }
        
        return ticket;  // Return complete ticket object
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Failed to fetch ticket detail', { ticketId, error: error.message });
        }
        throw error;  // Pass error to calling function
    }
}

/**
 * Creates a new ticket in Zammad with optional file attachments
 * Automatically converts files to Base64 for API upload
 * 
 * @param {string} subject - Subject/title of the new ticket
 * @param {string} body - Message text of the ticket (can contain HTML)
 * @param {FileList|Array} files - Optional: array of file objects for attachments
 * @param {string} [requestType] - Optional ticket request type (custom object \"type\")
 * @returns {Promise<Object>} The created ticket object or throws error
 */
async function nfCreateTicket(subject, body, files, requestType) {
    // Input validation
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
        throw createApiError('Subject is required and must be a non-empty string', 'INVALID_SUBJECT');
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
        throw createApiError('Message body is required and must be a non-empty string', 'INVALID_BODY');
    }
    if (files && !Array.isArray(files) && !(files instanceof FileList)) {
        throw createApiError('Files must be an array or FileList', 'INVALID_FILES');
    }
    if (requestType !== undefined && (typeof requestType !== 'string' || !requestType.trim())) {
        throw createApiError('Request type must be a non-empty string if provided', 'INVALID_REQUEST_TYPE');
    }
    
    try {
        // Use API client to create ticket (handles file conversion and payload building internally)
        const client = getApiClient();
        const createdTicket = await client.createTicket({
            subject,
            body,
            files,
            requestType
        });
        nfEventBus.emit('ticket:created', { ticket: createdTicket });
        return createdTicket;  // Return created ticket object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}

/**
 * Sends a reply/note to an existing ticket with optional attachments
 * Distinguishes between public replies and internal notes
 * 
 * @param {number} ticketId - ID of the ticket to reply to
 * @param {string} text - Reply text (can contain HTML)
 * @param {FileList|Array} files - Optional: array of file objects for attachments
 * @returns {Promise<Object>} Updated ticket object or throws error
 */
async function nfSendReply(ticketId, text, files) {
    // Input validation
    if (!ticketId || (typeof ticketId !== 'number' && typeof ticketId !== 'string')) {
        throw createApiError('Ticket ID is required and must be a number or string', 'INVALID_TICKET_ID');
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
        throw createApiError('Reply text is required and must be a non-empty string', 'INVALID_REPLY_TEXT');
    }
    if (files && !Array.isArray(files) && !(files instanceof FileList)) {
        throw createApiError('Files must be an array or FileList', 'INVALID_FILES');
    }
    
    try {
        // Use API client to send reply
        const client = getApiClient();
        const replyArticle = await client.sendReply(ticketId, text, files);
        nfEventBus.emit('ticket:reply-sent', { ticketId, article: replyArticle });
        return replyArticle;  // Return reply article object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}

/**
 * Closes a ticket by setting the status to 'Closed' (ID: 4)
 * This is a final action - closed tickets can only be reopened by administrators
 * 
 * @param {number} ticketId - ID of the ticket to close
 * @returns {Promise<Object>} Updated ticket object or throws error
 */
async function nfCloseTicket(ticketId) {
    // Input validation
    if (!ticketId || (typeof ticketId !== 'number' && typeof ticketId !== 'string')) {
        throw createApiError('Ticket ID is required and must be a number or string', 'INVALID_TICKET_ID');
    }
    try {
        // Use API client to close ticket
        const client = getApiClient();
        const closedTicket = await client.closeTicket(ticketId);
        nfEventBus.emit('ticket:closed', { ticketId, ticket: closedTicket });
        return closedTicket;  // Return updated ticket object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}
/**
 * Fetches available options for the ticket "type" attribute.
 * Uses Zammad's Object Manager API to retrieve the attribute definition and its options.
 *
 * @returns {Promise<{ options: Array<{value: string, label: string}>, defaultValue: string | null }>} 
 *          Object containing selectable request types and the Zammad default value
 */
async function nfFetchRequestTypes() {
    const baseUrl = ZAMMAD_API_URL();
    if (!baseUrl) {
        throw new Error('Zammad API base URL is not configured');
    }
    // Cache key for request types
    const cacheKey = 'ticket_request_types';

    // Try global TTL cache (configured in NF_CONFIG.ui.cache.requestTypeTTL)
    const requestTypeTTL = window.NF_CONFIG?.ui?.cache?.requestTypeTTL;
    if (requestTypeTTL && typeof window.nfCache !== 'undefined') {
        const cached = window.nfCache.get(cacheKey);
        if (cached && Array.isArray(cached.options) && cached.options.length > 0) {
            return cached;
        }
    }

    // Fetch request types from Zammad
    const response = await nfApiGet(`${baseUrl}/object_manager_attributes?object=Ticket&name=type`, {
        headers: {
            'Authorization': `Basic ${getUserToken()}`,
            'Content-Type': 'application/json'
        }
    });

    // Check if the request was successful
    if (!response.ok) {
        const errorMessage = `Error loading request types: ${response.status} ${response.statusText}`;
        if (typeof NFError !== 'undefined') {
            throw new NFError(errorMessage, 'FETCH_REQUEST_TYPES_FAILED');
        } else {
            throw new Error(errorMessage);
        }
    }
    // Get the data from the response
    const data = await response.json();
    // Check if the data is an array
    const attribute = Array.isArray(data)
        ? data.find(a => a.object === 'Ticket' && a.name === 'type')
        : data;
    // Check if the attribute is found
    if (!attribute || !attribute.data_option) {
        // If the attribute is not found, return an empty array
        nfRequestTypesCache = { options: [], defaultValue: null };
        return nfRequestTypesCache;
    }

    const dataOption = attribute.data_option;
    let options = [];
    // Check if the data option is an array
    if (Array.isArray(dataOption.options)) {
        // Zammad expects the string value (e.g., "problem", "general_request") as the database key
        // The "name" field is the display label, "value" is what we send to the API
        options = dataOption.options
            .map((opt) => ({
                value: String(opt.value ?? ''),  // Database key: "problem", "general_request", etc.
                label: String(opt.name ?? opt.value ?? '')  // Display label
            }))
            .filter(o => o.value);
    } else if (dataOption.options && typeof dataOption.options === 'object') {
        // If the data option is an object, convert it to an array
        options = Object.entries(dataOption.options).map(([value, label]) => ({
            value: String(value),
            label: String(label)
        }));
    }

    // Filter options based on configuration (if allowedRequestTypes is specified)
    const allowedRequestTypes = window.NF_CONFIG?.ui?.filters?.allowedRequestTypes;
    if (Array.isArray(allowedRequestTypes) && allowedRequestTypes.length > 0) {
        const allowedSet = new Set(allowedRequestTypes.map(v => String(v)));
        options = options.filter(opt => allowedSet.has(opt.value));
        if (typeof nfLogger !== 'undefined') {
            nfLogger.debug('Filtered request types based on configuration', {
                totalOptions: dataOption.options?.length || 0,
                allowedCount: allowedRequestTypes.length,
                filteredCount: options.length,
                allowedTypes: allowedRequestTypes
            });
        }
    }

    // Get the default value (but only if it's in the filtered options)
    let defaultValue = typeof dataOption.default === 'string' ? dataOption.default : null;
    if (defaultValue && !options.some(opt => opt.value === defaultValue)) {
        // Default value is not in the allowed list, use first option or null
        defaultValue = options.length > 0 ? options[0].value : null;
        if (typeof nfLogger !== 'undefined') {
            nfLogger.debug('Default request type not in allowed list, using first available', {
                originalDefault: dataOption.default,
                newDefault: defaultValue
            });
        }
    }

    // Store the request types in the cache if configured
    const result = { options, defaultValue };
    if (requestTypeTTL && typeof window.nfCache !== 'undefined') {
        window.nfCache.set(cacheKey, result, requestTypeTTL);
    }
    // Return the request types
    return result;
}


/**
 * Loads tickets based on filter criteria (status category, year, etc.)
 * Supports smart caching for different filter combinations
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.statusCategory - 'active', 'closed', or 'all'
 * @param {number} filters.year - Year for archive filter (only for closed)
 * @param {string} filters.sortOrder - 'date_desc' or 'date_asc'
 * @returns {Promise<Array>} Array of filtered ticket objects
 */
async function nfFetchTicketsFiltered(filters = {}) {
    const currentYear = new Date().getFullYear();
    const {
        statusCategory = window.NF_CONFIG?.ui?.filters?.defaultStatusFilter || 'active',
        year = currentYear,
        sortOrder = window.NF_CONFIG?.ui?.filters?.defaultSortOrder || 'date_desc',
        searchQuery = ''
    } = filters;
    
    const cacheKey = `tickets_${statusCategory}_${year}_${getUserId()}`;
    
    if (typeof nfCache !== 'undefined') {
        const cached = nfCache.get(cacheKey);
        if (cached) {
            let cacheType;
            if (year < currentYear) {
                cacheType = 'archived';
            } else if (statusCategory === 'closed') {
                cacheType = 'current year closed';
            } else {
                cacheType = 'current year active';
            }
            
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug(`Loaded tickets from cache (${cacheType})`, {
                    key: cacheKey,
                    count: cached.length,
                    statusCategory,
                    year,
                    currentYear: currentYear,
                    cacheType
                });
            }
            return nfSortTickets(cached, sortOrder);
        }
    }
    
    // For current year tickets or cache miss, fetch from API
    if (typeof nfLogger !== 'undefined') {
        const cachingStrategy = year < currentYear ? 'archived (will cache)' : 'current year (no cache)';
        nfLogger.debug('Fetching filtered tickets', {
            query: searchQuery,
            statusCategory,
            year,
            cacheKey,
            strategy: cachingStrategy
        });
    }
    
    // Performance measurement start
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark(`fetch-tickets-${statusCategory}-start`);
    }
    
    try {
        let query = `customer_id:${getUserId()}`;
        
        const statusCategories = window.NF_CONFIG?.ui?.filters?.statusCategories;
        if (statusCategory !== 'all' && statusCategories) {
            const stateIds = statusCategories[statusCategory];
            if (stateIds && stateIds.length > 0) {
                const stateQuery = stateIds.map(id => `state_id:${id}`).join(' OR ');
                query += ` AND (${stateQuery})`;
            }
        }
        
        // Add year filter (only for closed tickets or specific years)
        if (statusCategory === 'closed' && year !== currentYear) {
            const yearStart = `${year}-01-01T00:00:00Z`;
            const yearEnd = `${year}-12-31T23:59:59Z`;
            query += ` AND created_at:[${yearStart} TO ${yearEnd}]`;
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.debug('Fetching filtered tickets', { 
                query, 
                statusCategory, 
                year,
                cacheKey 
            });
        }
        
        const baseUrl = window.NF_CONFIG?.api?.baseUrl;
        
        let response;
        if (typeof NFUtils !== 'undefined' && NFUtils.withRetry) {
            response = await NFUtils.withRetry(async () => {
                return nfApiFetch(`${baseUrl}/tickets/search?query=${encodeURIComponent(query)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${getUserToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
            }, window.NF_CONFIG?.api?.retryAttempts || 3);
        } else {
            response = await nfApiFetch(`${baseUrl}/tickets/search?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${getUserToken()}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            const errorMessage = `API error loading filtered tickets: ${response.status} ${response.statusText}`;
            if (typeof NFError !== 'undefined') {
                throw new NFError(errorMessage, 'FETCH_FILTERED_TICKETS_FAILED');
            } else {
                throw new Error(errorMessage);
            }
        }
        
        const result = await response.json();
        const ticketsArray = Array.isArray(result) ? result : (result.tickets || []);
        
        if (typeof nfCache !== 'undefined') {
            let cacheTTL;
            let cacheDescription;
            
            if (year < currentYear) {
                // Archived tickets (previous years): long cache
                cacheTTL = window.NF_CONFIG.ui.cache.archivedTicketListTTL;
                cacheDescription = 'archived (30 days)';
            } else if (statusCategory === 'closed') {
                // Current year closed tickets: medium cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearClosedTicketListTTL;
                cacheDescription = 'current year closed (4 hours)';
            } else {
                // Current year active tickets: short cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearActiveTicketListTTL;
                cacheDescription = 'current year active (15 minutes)';
            }
            
            nfCache.set(cacheKey, ticketsArray, cacheTTL);
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Cached ticket list', {
                    key: cacheKey,
                    count: ticketsArray.length,
                    cacheType: cacheDescription,
                    ttlMinutes: Math.round(cacheTTL / (60 * 1000)),
                    statusCategory,
                    year,
                    currentYear
                });
            }
        }
        
        if (typeof nfLogger !== 'undefined') {
            const cacheStatus = year < currentYear ? 'cached' : 'not cached (current year)';
            nfLogger.info('Filtered tickets fetched successfully', {
                count: ticketsArray.length,
                statusCategory,
                year,
                cacheStatus
            });
        }
        
        // Performance measurement complete
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure(`Fetch Filtered Tickets (${statusCategory})`, `fetch-tickets-${statusCategory}-start`);
        }
        
        return nfSortTickets(ticketsArray, sortOrder);
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Failed to fetch filtered tickets', { 
                error: error.message,
                statusCategory,
                year
            });
        }
        throw error;
    }
}

/**
 * Sorts tickets by various criteria
 * 
 * @param {Array} tickets - Array of ticket objects
 * @param {string} sortOrder - 'date_desc', 'date_asc', 'status', 'subject'
 * @returns {Array} Sorted array of tickets
 */
function nfSortTickets(tickets, sortOrder = 'date_desc') {
    const sortedTickets = [...tickets]; // Create copy to not mutate original
    
    switch (sortOrder) {
        case 'date_asc':
            return sortedTickets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        case 'date_desc':
            return sortedTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'status':
            return sortedTickets.sort((a, b) => (a.state_id || 0) - (b.state_id || 0));
        case 'subject':
            return sortedTickets.sort((a, b) => {
                const titleA = (a.title || a.subject || '').toLowerCase();
                const titleB = (b.title || b.subject || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
        default:
            return sortedTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

export { nfAuthenticateUser, nfFetchTicketsFiltered, nfCloseTicket, nfSendReply, nfFetchTicketDetail, nfCreateTicket, nfFetchRequestTypes };