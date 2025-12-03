/**
 * @fileoverview Knowledge base service for search operations
 * @author Daniel Könning
 * @module api/knowledge-base
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { apiPost } from './http.js';
import { NF_CONFIG } from '../core/config.js';
import { CacheRepository } from './cache.js';
import { withPerformance } from '../utils/performance.js';
import { withErrorHandling } from '../utils/error-boundary.js';
import nfLogger from '../core/logger.js';

/**
 * Knowledge base service
 * Handles knowledge base search operations with caching
 */
export class KnowledgeBaseService {
    /**
     * @param {CacheRepository} cache - Cache repository instance
     */
    constructor(cache) {
        this.cache = cache;
    }

    /**
     * Search knowledge base
     * @param {string} query - Search query
     * @returns {Promise<Object>} Search results with highlights
     */
    async search(query) {
        return withPerformance(
            withErrorHandling(async () => {
                if (!query || typeof query !== 'string' || query.trim().length < NF_CONFIG.ui.searchMinLength) {
                    throw new Error(`Search query must be at least ${NF_CONFIG.ui.searchMinLength} characters`);
                }

                const cleanQuery = query.trim();
                const cacheKey = `search_${cleanQuery}`;
                
                // Check cache first
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    nfLogger.debug('Loaded search results from cache', { query: cleanQuery });
                    return cached;
                }

                // Fetch from API
                const apiUrl = NF_CONFIG.api.baseUrl;
                const kbConfig = NF_CONFIG.api.knowledgeBase;

                const response = await apiPost(
                    `${apiUrl}/knowledge_bases/search`,
                    {
                        knowledge_base_id: kbConfig.id,
                        locale: kbConfig.locale,
                        query: cleanQuery,
                        flavor: kbConfig.flavor
                    }
                );

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const result = await response.json();
                const results = result.result || [];
                const highlights = result.highlights || {};

                // Cache results
                const ttl = NF_CONFIG.ui.cache.searchResultsTTL;
                this.cache.set(cacheKey, { results, highlights }, ttl);

                nfLogger.debug('Cached search results', {
                    query: cleanQuery,
                    count: results.length,
                    ttlMinutes: Math.round(ttl / (60 * 1000))
                });

                return { results, highlights };
            }, 'Knowledge Base Search'),
            'Knowledge Base Search'
        )();
    }
}

export default KnowledgeBaseService;

