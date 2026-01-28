/**
 * @fileoverview Ticket service for ticket operations
 * @author danielknng
 * @module api/tickets
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { ZammadApiClient } from './client.js';
import { CacheRepository } from './cache.js';
import { CacheStrategy } from './cache-strategy.js';
import eventBus from '../state/events.js';
import { NF_CONFIG } from '../core/config.js';
import { CURRENT_YEAR } from '../core/constants.js';
import { withPerformance } from '../utils/performance.js';
import { withErrorHandling } from '../utils/error-boundary.js';
import nfLogger from '../core/logger.js';
import appState from '../state/store.js';

/**
 * Ticket service
 * Handles all ticket-related operations with caching and event emission
 */
export class TicketService {
    /**
     * @param {ZammadApiClient} apiClient - API client instance
     * @param {CacheRepository} cache - Cache repository instance
     */
    constructor(apiClient, cache) {
        this.apiClient = apiClient;
        this.cache = cache;
    }

    /**
     * Get ticket by ID with caching
     * @param {number|string} ticketId - Ticket ID
     * @returns {Promise<Object>} Ticket object with articles
     */
    async getTicket(ticketId) {
        return withPerformance(
            withErrorHandling(async () => {
                const cacheKey = `ticket_detail_${ticketId}`;
                
                // Check cache first
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    nfLogger.debug('Loaded ticket from cache', { ticketId, cacheKey });
                    return cached;
                }
                
                // Fetch from API
                const ticket = await this.apiClient.getTicket(ticketId);
                const articles = ticket.articles || [];
                
                ticket.messages = (articles || []).map(a => ({
                    from: a.from || (a.sender_id === 1 ? 'Support' : 'User'),
                    date: a.created_at,
                    body: a.body || ''
                }));
                
                // Determine cache TTL using strategy
                const ticketYear = new Date(ticket.created_at).getFullYear();
                const ticketStateId = ticket.state_id;
                const closedStateIds = NF_CONFIG.ui.filters.statusCategories.closed;
                const isClosedTicket = closedStateIds.includes(ticketStateId);
                
                const cacheStrategy = CacheStrategy.getTicketDetailTTL(ticketYear, CURRENT_YEAR, isClosedTicket);
                
                // Add timestamp for better logging
                ticket.cachedAt = Date.now();
                this.cache.set(cacheKey, ticket, cacheStrategy.ttl);
                
                nfLogger.debug('Cached ticket detail', {
                    ticketId,
                    cacheType: cacheStrategy.description,
                    reason: cacheStrategy.reason
                });
                
                return ticket;
            }, 'Get Ticket'),
            'Get Ticket'
        )();
    }

    /**
     * Get filtered tickets with caching
     * @param {Object} filters - Filter options
     * @param {string} [filters.statusCategory='active'] - Status category
     * @param {number} [filters.year] - Year filter
     * @param {string} [filters.sortOrder='date_desc'] - Sort order
     * @param {string} [filters.searchQuery=''] - Search query
     * @returns {Promise<Array>} Array of ticket objects
     */
    async getTickets(filters = {}) {
        return withPerformance(
            withErrorHandling(async () => {
                const {
                    statusCategory = NF_CONFIG.ui.filters.defaultStatusFilter || 'active',
                    year = CURRENT_YEAR,
                    sortOrder = NF_CONFIG.ui.filters.defaultSortOrder || 'date_desc',
                    searchQuery = ''
                } = filters;
                
                const userId = appState.get('userId');
                const cacheKey = `tickets_${statusCategory}_${year}_${userId}`;
                
                // Check cache first
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    const cacheType = year < CURRENT_YEAR ? 'archived' : 
                                    statusCategory === 'closed' ? 'current year closed' : 
                                    'current year active';
                    nfLogger.debug(`Loaded tickets from cache (${cacheType})`, {
                        key: cacheKey,
                        count: cached.length,
                        statusCategory,
                        year
                    });
                    return this._sortTickets(cached, sortOrder);
                }
                
                // Build query
                let query = `customer_id:${userId}`;
                
                const statusCategories = NF_CONFIG.ui.filters.statusCategories;
                if (statusCategory !== 'all' && statusCategories) {
                    const stateIds = statusCategories[statusCategory];
                    if (stateIds && stateIds.length > 0) {
                        const stateQuery = stateIds.map(id => `state_id:${id}`).join(' OR ');
                        query += ` AND (${stateQuery})`;
                    }
                }
                
                // Add year filter (only for closed tickets or specific years)
                if (statusCategory === 'closed' && year !== CURRENT_YEAR) {
                    const yearStart = `${year}-01-01T00:00:00Z`;
                    const yearEnd = `${year}-12-31T23:59:59Z`;
                    query += ` AND created_at:[${yearStart} TO ${yearEnd}]`;
                }
                
                // Fetch from API
                const baseUrl = NF_CONFIG.api.baseUrl;
                const userToken = appState.get('userToken');
                const { apiGet } = await import('./http.js');
                
                const response = await apiGet(`${baseUrl}/tickets/search?query=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Basic ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error loading filtered tickets: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();
                const ticketsArray = Array.isArray(result) ? result : (result.tickets || []);
                
                // Cache using strategy
                const cacheStrategy = CacheStrategy.getTicketListTTL(year, CURRENT_YEAR, statusCategory);
                this.cache.set(cacheKey, ticketsArray, cacheStrategy.ttl);
                
                nfLogger.debug('Cached ticket list', {
                    key: cacheKey,
                    count: ticketsArray.length,
                    cacheType: cacheStrategy.description,
                    ttlMinutes: Math.round(cacheStrategy.ttl / (60 * 1000)),
                    statusCategory,
                    year
                });
                
                return this._sortTickets(ticketsArray, sortOrder);
            }, 'Get Tickets'),
            'Get Tickets'
        )();
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
        return withPerformance(
            withErrorHandling(async () => {
                const ticket = await this.apiClient.createTicket(ticketData);
                
                // Invalidate relevant caches
                this._invalidateTicketCaches();
                
                // Emit event
                eventBus.emit('ticket:created', { ticket });
                
                nfLogger.info('Ticket created', { ticketId: ticket.id });
                
                return ticket;
            }, 'Create Ticket'),
            'Create Ticket'
        )();
    }

    /**
     * Send a reply to a ticket
     * @param {number|string} ticketId - Ticket ID
     * @param {string} text - Reply text
     * @param {FileList|Array} [files] - Optional attachments
     * @returns {Promise<Object>} Created article object
     */
    async sendReply(ticketId, text, files) {
        return withPerformance(
            withErrorHandling(async () => {
                const article = await this.apiClient.sendReply(ticketId, text, files);
                
                // Invalidate ticket detail cache
                this.cache.invalidate(`ticket_detail_${ticketId}`);
                
                // Emit event
                eventBus.emit('ticket:updated', { ticketId, article });
                
                nfLogger.info('Reply sent', { ticketId, articleId: article.id });
                
                return article;
            }, 'Send Reply'),
            'Send Reply'
        )();
    }

    /**
     * Close a ticket
     * @param {number|string} ticketId - Ticket ID
     * @returns {Promise<Object>} Updated ticket object
     */
    async closeTicket(ticketId) {
        return withPerformance(
            withErrorHandling(async () => {
                const ticket = await this.apiClient.closeTicket(ticketId);
                
                // Invalidate caches
                this.cache.invalidate(`ticket_detail_${ticketId}`);
                this._invalidateTicketCaches();
                
                // Emit event
                eventBus.emit('ticket:closed', { ticketId, ticket });
                
                nfLogger.info('Ticket closed', { ticketId });
                
                return ticket;
            }, 'Close Ticket'),
            'Close Ticket'
        )();
    }

    /**
     * Sort tickets by various criteria
     * @private
     * @param {Array} tickets - Array of ticket objects
     * @param {string} sortOrder - 'date_desc', 'date_asc', 'status', 'subject'
     * @returns {Array} Sorted array of tickets
     */
    _sortTickets(tickets, sortOrder = 'date_desc') {
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
                return sortedTickets;
        }
    }

    /**
     * Invalidate ticket list caches
     * @private
     */
    _invalidateTicketCaches() {
        const userId = appState.get('userId');
        if (userId) {
            // Invalidate all ticket list caches for this user
            this.cache.invalidatePattern(`tickets_*_${userId}`);
        }
    }
}

export default TicketService;

