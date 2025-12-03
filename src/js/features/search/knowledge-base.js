/**
 * @fileoverview Smart search functionality for the Zammad knowledge base
 * @author Daniel Könning
 * @module features/search/knowledge-base
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { KnowledgeBaseService } from '../../api/knowledge-base.js';
import { cloneTemplate } from '../../utils/template.js';
import { NF_CONFIG } from '../../core/config.js';
import { dom } from '../../ui/dom.js';
import { ZAMMAD_API_URL } from '../../ui/dom.js';
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
                this.showSearchDropdown(res, query);
            } catch (error) {
                nfLogger.warn('Search failed', { query, error: error.message });
                this.showSearchDropdown({ results: [], highlights: {} }, query);
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
    showSearchDropdown(resultsRaw, query) {
        const details = resultsRaw.details || resultsRaw.results || [];
        const highlights = resultsRaw.highlights || {};
        
        // Extract highlights from API response if needed
        if (resultsRaw.result) {
            for (const r of resultsRaw.result) {
                highlights[r.id] = r.highlight;
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
        details.forEach(res => {
            let div;
            let title = res.title || '';
            let summary = '';
            
            if (searchResultTemplate) {
                div = cloneTemplate(searchResultTemplate.firstElementChild);
                
                // Process title with highlights
                if (highlights[res.id] && highlights[res.id]["content.title"]) {
                    title = highlights[res.id]["content.title"].join(' ');
                }
                title = this.highlightText(title, query);
                
                // Process summary with highlights
                if (highlights[res.id] && highlights[res.id]["content.body"]) {
                    summary = highlights[res.id]["content.body"].join(' ... ');
                } else {
                    summary = res.body || '';
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
                
                const helpdeskBase = NF_CONFIG.links.helpdeskBase;
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => {
                    window.open(helpdeskBase + res.url, '_blank');
                    this.hideSearchDropdown();
                });
                div.addEventListener('mouseenter', () => div.classList.add('nf-search-result--hover'));
                div.addEventListener('mouseleave', () => div.classList.remove('nf-search-result--hover'));
            }
            
            dom.searchDropdown.appendChild(div);
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


