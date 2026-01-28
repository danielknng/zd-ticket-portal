/**
 * @fileoverview Knowledge base service for search operations
 * @author danielknng
 * @module api/knowledge-base
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { apiPost, apiGet } from './http.js';
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
     * @param {ZammadApiClient|null} apiClient - Optional authenticated API client for fetching article details
     */
    constructor(cache, apiClient = null) {
        this.cache = cache;
        this.apiClient = apiClient;
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
                
                // Log the full API response structure for debugging
                nfLogger.debug('Raw API response structure', {
                    topLevelKeys: Object.keys(result || {}),
                    hasResult: !!result.result,
                    hasDetails: !!result.details,
                    hasResults: !!result.results,
                    resultType: Array.isArray(result.result) ? 'array' : typeof result.result,
                    resultLength: Array.isArray(result.result) ? result.result.length : 'N/A',
                    detailsLength: Array.isArray(result.details) ? result.details.length : 'N/A',
                    firstDetail: Array.isArray(result.details) && result.details.length > 0 ? result.details[0] : null
                });
                
                // Extract results - the search API returns both 'result' (minimal) and 'details' (full with URLs)
                // According to Zammad community: https://community.zammad.org/t/how-to-find-knowledge-base-answers-via-api/12168
                // The 'details' array contains full information including the URL
                let results = [];
                if (Array.isArray(result.details)) {
                    // Use details array - it contains full info including URLs
                    results = result.details;
                } else if (Array.isArray(result.result)) {
                    results = result.result;
                } else if (Array.isArray(result.results)) {
                    results = result.results;
                } else if (result.answers && Array.isArray(result.answers)) {
                    results = result.answers;
                }
                
                // Check if results are answer objects with nested data
                // Zammad search may return KnowledgeBase::Answer::Translation objects
                // which might have answer_id instead of id
                results = results.map(item => {
                    // If the item has an answer_id, it might be a translation object
                    // We need to preserve the structure but also extract useful data
                    if (item.answer_id && !item.id) {
                        // This might be a translation, use answer_id as id
                        return { ...item, id: item.answer_id };
                    }
                    return item;
                });
                
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

    /**
     * Get knowledge base article details by ID
     * According to Zammad API docs: https://docs.zammad.org/en/latest/api/knowledgebase/answers.html
     * This endpoint requires knowledge_base.reader or knowledge_base.editor permission
     * Returns category information in the assets object
     * @param {number|string} articleId - Article ID
     * @returns {Promise<Object|null>} Article object with full details including category, or null if not accessible
     */
    async getArticle(articleId) {
        return withPerformance(
            withErrorHandling(async () => {
                const cacheKey = `kb_article_${articleId}`;
                
                // Check cache first
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    nfLogger.debug('Loaded article from cache', { articleId });
                    return cached;
                }

                // Use authenticated API client if available, otherwise try public endpoint
                const apiUrl = NF_CONFIG.api.baseUrl;
                const kbConfig = NF_CONFIG.api.knowledgeBase;
                const url = `${apiUrl}/knowledge_bases/${kbConfig.id}/answers/${articleId}?locale=${kbConfig.locale}`;

                let response;
                if (this.apiClient && this.apiClient.authToken) {
                    // Use authenticated request
                    const authUrl = this.apiClient._buildUrl(`/knowledge_bases/${kbConfig.id}/answers/${articleId}?locale=${kbConfig.locale}`);
                    response = await apiGet(authUrl, {
                        headers: this.apiClient._getHeaders()
                    });
                } else {
                    // Try public endpoint (may fail with 403)
                    response = await apiGet(url, {});
                }

                if (!response.ok) {
                    if (response.status === 403) {
                        nfLogger.debug('Article details require authentication', { articleId });
                        return null;
                    }
                    throw new Error(`Failed to fetch article ${articleId}: ${response.status}`);
                }

                const articleData = await response.json();
                
                // Extract category information from assets as per Zammad API docs
                // The response includes assets.KnowledgeBaseAnswer, assets.KnowledgeBaseCategory, etc.
                let categoryInfo = null;
                if (articleData.assets) {
                    const answer = articleData.assets.KnowledgeBaseAnswer?.[articleId];
                    if (answer && answer.category_id) {
                        const category = articleData.assets.KnowledgeBaseCategory?.[answer.category_id];
                        const categoryTranslation = articleData.assets.KnowledgeBaseCategoryTranslation?.[
                            category?.translation_ids?.[0]
                        ];
                        
                        if (category && categoryTranslation) {
                            categoryInfo = {
                                id: category.id,
                                slug: this._generateSlug(categoryTranslation.title),
                                title: categoryTranslation.title
                            };
                        }
                    }
                }

                // Extract article translation for slug
                let articleSlug = null;
                if (articleData.assets?.KnowledgeBaseAnswerTranslation) {
                    const translations = Object.values(articleData.assets.KnowledgeBaseAnswerTranslation);
                    const translation = translations.find(t => t.answer_id == articleId);
                    if (translation && translation.title) {
                        articleSlug = this._generateSlug(translation.title);
                    }
                }

                // Create a normalized article object with all the info we need
                const article = {
                    id: articleId,
                    category: categoryInfo,
                    slug: articleSlug,
                    ...articleData
                };

                // Cache for a shorter time (5 minutes)
                const ttl = 5 * 60 * 1000;
                this.cache.set(cacheKey, article, ttl);

                nfLogger.debug('Fetched and cached article', { 
                    articleId,
                    hasCategory: !!categoryInfo,
                    categoryId: categoryInfo?.id,
                    articleSlug
                });

                return article;
            }, 'Get Knowledge Base Article'),
            'Get Knowledge Base Article'
        )();
    }

    /**
     * Generate a URL-friendly slug from a title
     * @private
     * @param {string} title - Title to convert to slug
     * @returns {string} URL-friendly slug
     */
    _generateSlug(title) {
        if (!title) return '';
        return title
            .toLowerCase()
            .replace(/[äöü]/g, (match) => {
                const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
                return map[match] || match;
            })
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Try to get category information from public knowledge base frontend
     * Since public articles are accessible via the web interface, we can try to
     * fetch the page and extract category info from the URL or page structure
     * @param {number|string} articleId - Article ID
     * @param {string} articleSlug - Article slug (generated from title)
     * @returns {Promise<Object|null>} Category info if available, null otherwise
     */
    async getCategoryInfoFromFrontend(articleId, articleSlug) {
        try {
            const helpdeskBase = NF_CONFIG.links.helpdeskBase;
            const locale = NF_CONFIG.api.knowledgeBase.locale;
            
            // Try to fetch the article page - Zammad might redirect to the correct URL
            // We'll try a simple URL format that might redirect to the full path
            const testUrl = `${helpdeskBase}/help/${locale}/answer/${articleId}`;
            
            try {
                // Use fetch with redirect: 'follow' to get the final URL
                // Note: This might fail due to CORS, but it's worth trying
                const response = await fetch(testUrl, { 
                    method: 'HEAD',
                    redirect: 'follow',
                    mode: 'no-cors' // This prevents CORS errors but we won't see the redirect
                });
                
                // If CORS allows, check the final URL
                // Otherwise, we'll need to construct the URL differently
            } catch (corsError) {
                // CORS blocked - try a different approach
                nfLogger.debug('CORS blocked frontend fetch, trying alternative method', { articleId });
            }
            
            // Alternative: Try to parse category from known URL structure
            // Since we can't fetch due to CORS, we'll need to rely on the user
            // providing category info or finding another way
            
            // For now, return null - we'll need to find another solution
            // One option: Cache category mappings, or allow manual configuration
            return null;
        } catch (error) {
            nfLogger.debug('Could not get category info from frontend', { articleId, error: error.message });
        }
        
        return null;
    }
}

export default KnowledgeBaseService;

