/**
 * @fileoverview Smart search functionality for the Zammad knowledge base
 * @author danielknng
 * @module features/search/knowledge-base
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { KnowledgeBaseService } from '../../api/knowledge-base.js';
import { cloneTemplate } from '../../utils/template.js';
import { NF_CONFIG } from '../../core/config.js';
import { dom } from '../../ui/dom.js';
import { debounce } from '../../utils/debounce.js';
import nfLogger from '../../core/logger.js';

/**
 * Knowledge base search component
 * Handles search input, debouncing, and result display
 */
export class KnowledgeBaseSearch {
    /**
     * @param {KnowledgeBaseService} kbService - Knowledge base service instance
     */
    constructor(kbService) {
        this.kbService = kbService;
        this.minLength = NF_CONFIG.ui.searchMinLength;
        this.debouncedSearch = null;
    }

    /**
     * Initializes the search functionality
     */
    initialize() {
        if (!dom.searchInput) return;
        
        this.createSearchDropdown();
        
        // Create debounced search function
        const debounceTimeout = NF_CONFIG.ui.debounceTimeout;
        this.debouncedSearch = debounce(async (query) => {
            try {
                nfLogger.debug('Performing search', { query });
                const res = await this.kbService.search(query);
                await this.showSearchDropdown(res, query);
            } catch (error) {
                nfLogger.warn('Search failed', { query, error: error.message });
                await this.showSearchDropdown({ results: [], highlights: {} }, query);
            }
        }, debounceTimeout);
        
        // Event listeners
        dom.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        dom.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        document.addEventListener('click', (e) => this.handleClickOutside(e));
    }

    /**
     * Handles search input events
     * @private
     * @param {Event} e - Input event
     */
    handleSearchInput(e) {
        const val = e.target.value.trim();
        if (val.length < this.minLength) {
            this.hideSearchDropdown();
            return;
        }
        this.debouncedSearch(val);
    }

    /**
     * Handles search keyboard events
     * @private
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val.length < this.minLength) return;
            this.kbService.search(val)
                .then(res => this.showSearchDropdown(res, val))
                .catch(() => this.showSearchDropdown({ results: [], highlights: {} }, val));
        }
        if (e.key === 'Escape') {
            this.hideSearchDropdown();
        }
    }

    /**
     * Handles clicks outside search area
     * @private
     * @param {Event} e - Click event
     */
    handleClickOutside(e) {
        if (dom.searchDropdown && !dom.searchDropdown.contains(e.target) && e.target !== dom.searchInput) {
            this.hideSearchDropdown();
        }
    }

    /**
     * Creates the search dropdown element
     * @private
     */
    createSearchDropdown() {
        if (dom.searchDropdown) {
            dom.searchDropdown.innerHTML = '';
        } else {
            nfLogger.warn('Search dropdown element not found in DOM');
        }
    }

    /**
     * Shows search results in the dropdown
     * @param {Object} resultsRaw - Search results from API
     * @param {string} query - Original search query
     */
    async showSearchDropdown(resultsRaw, query) {
        nfLogger.debug('Processing search results', { 
            hasDetails: !!resultsRaw.details,
            hasResults: !!resultsRaw.results,
            hasResult: !!resultsRaw.result,
            rawKeys: Object.keys(resultsRaw || {}),
            fullStructure: resultsRaw
        });
        
        // Extract results from various possible response structures
        // According to Zammad community posts, the public search API returns:
        // - 'result': minimal data (id, type, highlight)
        // - 'details': full data including URL, title, subtitle, etc.
        // https://community.zammad.org/t/how-to-find-knowledge-base-answers-via-api/12168
        let details = [];
        if (resultsRaw.details && Array.isArray(resultsRaw.details)) {
            // Priority: Use details array - it contains full info including URLs
            details = resultsRaw.details;
        } else if (resultsRaw.results && Array.isArray(resultsRaw.results)) {
            details = resultsRaw.results;
        } else if (resultsRaw.result && Array.isArray(resultsRaw.result)) {
            details = resultsRaw.result;
        } else if (resultsRaw.data) {
            if (Array.isArray(resultsRaw.data)) {
                // Some APIs wrap results in a data property
                details = resultsRaw.data;
            } else if (resultsRaw.data.results) {
                // Nested data.results
                details = resultsRaw.data.results;
            } else if (resultsRaw.data.result) {
                // Nested data.result
                details = resultsRaw.data.result;
            }
        }
        
        // Ensure details is an array
        if (!Array.isArray(details)) {
            nfLogger.warn('Search results is not an array', { 
                details, 
                type: typeof details,
                isNull: details === null,
                isUndefined: details === undefined
            });
            details = [];
        }
        
        nfLogger.debug('Extracted search results', { 
            count: details.length,
            firstResultKeys: details.length > 0 ? Object.keys(details[0]) : null
        });
        
        const highlights = resultsRaw.highlights || {};
        
        // Extract highlights from API response if needed
        if (resultsRaw.result && Array.isArray(resultsRaw.result)) {
            for (const r of resultsRaw.result) {
                if (r.id && r.highlight) {
                    highlights[r.id] = r.highlight;
                }
            }
        }
        
        if (!dom.searchDropdown) this.createSearchDropdown();
        dom.searchDropdown.innerHTML = '';
        
        if (!details.length) {
            dom.searchDropdown.innerHTML = '<div style="padding:1rem;color:#888;">No results found.</div>';
            dom.searchDropdown.style.display = 'block';
            return;
        }
        
        const searchResultTemplate = dom.templates.searchResult;
        const helpdeskBase = NF_CONFIG.links.helpdeskBase;
        
        // Log first result structure for debugging
        if (details.length > 0) {
            nfLogger.debug('First result structure', {
                keys: Object.keys(details[0]),
                sample: details[0],
                fullResult: JSON.stringify(details[0], null, 2)
            });
        }
        
        // Process results directly
        // The public search API already provides the URL in the details array
        details.forEach(res => {
            // Handle Zammad search response structure
            // Search may return KnowledgeBase::Answer::Translation objects
            // which have answer_id instead of id, and may have category_id
            const articleId = res.id || res.answer_id;
            
            // Log each result structure for debugging
            nfLogger.debug('Processing result', {
                id: articleId,
                answerId: res.answer_id,
                type: res.type,
                hasTitle: !!res?.title,
                hasUrl: !!res?.url,
                hasUrlPath: !!res?.url_path,
                hasInternalUrl: !!res?.internal_url,
                hasCategory: !!res?.category,
                hasSlug: !!res?.slug,
                allKeys: Object.keys(res || {})
            });
            
            // Skip if result doesn't have required properties
            if (!res || !articleId) {
                nfLogger.warn('Skipping invalid search result', { res });
                return;
            }
            
            // Normalize the result to always have id
            const normalizedRes = { ...res, id: articleId };
            
            let div;
            let title = normalizedRes.title || '';
            let summary = '';
            
            if (searchResultTemplate) {
                div = cloneTemplate(searchResultTemplate.firstElementChild);
                
                // Process title with highlights
                // Check result's own highlight property first
                if (normalizedRes.highlight && normalizedRes.highlight.title && Array.isArray(normalizedRes.highlight.title)) {
                    title = normalizedRes.highlight.title.join(' ');
                } else if (highlights[normalizedRes.id] && highlights[normalizedRes.id]["content.title"]) {
                    title = highlights[normalizedRes.id]["content.title"].join(' ');
                }
                title = this.highlightText(title, query);
                
                // Process summary with highlights
                // Check result's own highlight property first
                if (normalizedRes.highlight && normalizedRes.highlight["content.body"] && Array.isArray(normalizedRes.highlight["content.body"])) {
                    summary = normalizedRes.highlight["content.body"].join(' ... ');
                } else if (highlights[normalizedRes.id] && highlights[normalizedRes.id]["content.body"]) {
                    summary = highlights[normalizedRes.id]["content.body"].join(' ... ');
                } else {
                    summary = normalizedRes.body || '';
                }
                summary = this.highlightText(summary, query);
                
                const titleElem = div.querySelector('.nf-search-result-title');
                if (titleElem) {
                    titleElem.innerHTML = title;
                    titleElem.removeAttribute('href');
                    titleElem.removeAttribute('tabindex');
                    titleElem.style.cursor = 'inherit';
                }
                const summaryElem = div.querySelector('.nf-search-result-summary');
                if (summaryElem) {
                    summaryElem.innerHTML = summary;
                }
                
                // Construct URL for the article
                // According to Zammad community posts, the search API returns the URL in the 'details' array
                // https://community.zammad.org/t/how-to-find-knowledge-base-answers-via-api/12168
                let articleUrl = '';
                
                // Priority 1: Use URL directly from search result details (most reliable for public articles)
                // The public search API includes the full URL in the details array
                if (normalizedRes.url) {
                    // URL from search API - may be relative or absolute
                    if (normalizedRes.url.startsWith('http')) {
                        articleUrl = normalizedRes.url;
                    } else {
                        // Relative URL - prepend helpdesk base
                        articleUrl = helpdeskBase + normalizedRes.url;
                    }
                    nfLogger.debug('Using URL from search API details', { 
                        articleId: normalizedRes.id, 
                        url: articleUrl 
                    });
                } 
                // Priority 2: Use url_path or internal_url if available
                else if (normalizedRes.url_path) {
                    articleUrl = normalizedRes.url_path.startsWith('http') ? normalizedRes.url_path : (helpdeskBase + normalizedRes.url_path);
                } else if (normalizedRes.internal_url) {
                    articleUrl = normalizedRes.internal_url.startsWith('http') ? normalizedRes.internal_url : (helpdeskBase + normalizedRes.internal_url);
                }
                
                // Only add click handler if we have a valid URL
                if (articleUrl) {
                    nfLogger.debug('Using article URL from search result', { 
                        articleUrl, 
                        resultId: normalizedRes.id
                    });
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => {
                        window.open(articleUrl, '_blank');
                    this.hideSearchDropdown();
                });
                div.addEventListener('mouseenter', () => div.classList.add('nf-search-result--hover'));
                div.addEventListener('mouseleave', () => div.classList.remove('nf-search-result--hover'));
                } else {
                    nfLogger.warn('Cannot construct URL for search result', { 
                        res,
                        availableFields: Object.keys(res)
                    });
                    div.style.cursor = 'not-allowed';
                }
            }
            
            if (div) {
            dom.searchDropdown.appendChild(div);
            }
        });
        
        dom.searchDropdown.style.display = 'block';
    }

    /**
     * Highlights text with search query
     * @private
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} Highlighted text
     */
    highlightText(text, query) {
        if (/<em>/.test(text)) {
            return text.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
        } else {
            const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + ')', 'gi');
            return text.replace(re, '<mark>$1</mark>');
        }
    }

    /**
     * Hides the search dropdown
     */
    hideSearchDropdown() {
        if (dom.searchDropdown) {
            dom.searchDropdown.style.display = 'none';
        }
    }
}


