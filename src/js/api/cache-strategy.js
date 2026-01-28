/**
 * @fileoverview Cache strategy utilities to eliminate TTL calculation duplication
 * @author danielknng
 * @module api/cache-strategy
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from '../core/config.js';
import { CURRENT_YEAR } from '../core/constants.js';

/**
 * Cache strategy utilities to eliminate 2+ duplications of cache TTL calculation
 * @namespace CacheStrategy
 */
export const CacheStrategy = {
    /**
     * Gets cache TTL for ticket detail based on ticket year and status
     * @param {number} ticketYear - Year the ticket was created
     * @param {number} [currentYear] - Current year (defaults to CURRENT_YEAR constant)
     * @param {boolean} isClosed - Whether the ticket is closed
     * @returns {Object} Cache strategy object with ttl, description, and reason
     */
    getTicketDetailTTL(ticketYear, currentYear = CURRENT_YEAR, isClosed) {
        if (ticketYear < currentYear) {
            return {
                ttl: NF_CONFIG.ui.cache.archivedTicketDetailTTL,
                description: 'long-term (archived)',
                reason: 'previous year'
            };
        } else if (isClosed) {
            return {
                ttl: NF_CONFIG.ui.cache.currentYearClosedTicketDetailTTL,
                description: 'medium-term (closed current year)',
                reason: 'closed current year'
            };
        } else {
            return {
                ttl: NF_CONFIG.ui.cache.currentYearActiveTicketDetailTTL,
                description: 'short-term (active current year)',
                reason: 'active current year'
            };
        }
    },

    /**
     * Gets cache TTL for ticket list based on year and status category
     * @param {number} year - Year filter
     * @param {number} [currentYear] - Current year (defaults to CURRENT_YEAR constant)
     * @param {string} statusCategory - Status category ('active', 'closed', 'inactive')
     * @returns {Object} Cache strategy object with ttl and description
     */
    getTicketListTTL(year, currentYear = CURRENT_YEAR, statusCategory) {
        if (year < currentYear) {
            return {
                ttl: NF_CONFIG.ui.cache.archivedTicketListTTL,
                description: 'archived (30 days)'
            };
        } else if (statusCategory === 'closed') {
            return {
                ttl: NF_CONFIG.ui.cache.currentYearClosedTicketListTTL,
                description: 'current year closed (4 hours)'
            };
        } else {
            return {
                ttl: NF_CONFIG.ui.cache.currentYearActiveTicketListTTL,
                description: 'current year active (15 minutes)'
            };
        }
    }
};

export default CacheStrategy;

