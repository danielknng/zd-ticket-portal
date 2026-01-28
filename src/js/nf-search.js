// Author: Daniel Könning
// ===============================
// nf-search.js - Smart search functionality for the Zammad knowledge base
// ===============================
// This file implements a full search in the Zammad knowledge base
// with autocomplete, search term highlighting, and a user-friendly
// dropdown with search results. Uses debouncing for performance optimization.

// ===============================
// KNOWLEDGEBASE SEARCH (API INTEGRATION)
// ===============================

/**
 * Performs a search in the Zammad knowledge base
 * Uses the official Zammad API for Knowledge Base Search
 * 
 * @param {string} query - Search term from the user
 * @returns {Promise<Object>} Search results from Zammad API or throws error
 */
async function nfSearchKnowledgebase(query) {
    try {
        // ===============================
        // API REQUEST CONFIGURATION
        // ===============================
        const kbConfig = window.NF_CONFIG?.api?.knowledgeBase || {};
        const res = await fetch(`${ZAMMAD_API_URL}/knowledge_bases/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                knowledge_base_id: kbConfig.id,    // Knowledge base ID from config
                locale: kbConfig.locale,       // Article language from config
                query: query,                              // Search term
                flavor: kbConfig.flavor       // Access mode from config
            })
        });
        // ===============================
        // RESPONSE VALIDATION
        // ===============================
        if (!res.ok) throw new Error('Search failed');
        return await res.json();  // Return JSON response
    } catch (e) {
        throw e;  // Pass error to calling function
    }
}

// ===============================
// DROPDOWN CREATION AND MANAGEMENT
// ===============================

/**
 * Prepares the dropdown element for search results
 * The dropdown element already exists in the HTML and is only cleared here
 */
function nfCreateSearchDropdown() {
    // ===============================
    // PREPARE DROPDOWN
    // ===============================
    if (nf.searchDropdown) {
        nf.searchDropdown.innerHTML = '';  // Clear previous results
    } else {
        // ===============================
        // FALLBACK: DROPDOWN NOT FOUND
        // ===============================
        nfLogger.warn('Search dropdown element not found in DOM');
        return;  // Exit function if dropdown element is missing
    }
}

// ===============================
// SHOW AND FORMAT SEARCH RESULTS
// ===============================

/**
 * Shows search results in the dropdown with highlighting and click handling
 * Processes Zammad API response and creates user-friendly display
 * 
 * @param {Object} resultsRaw - Raw API response from Zammad Knowledge Base
 * @param {string} query - Original search term for highlighting
 */
function nfShowSearchDropdown(resultsRaw, query) {
    // ===============================
    // API-RESPONSE PARSEN
    // ===============================
    let details = resultsRaw.details || [];        // Array of article details
    let highlights = {};                           // Mapping for highlighting info
    
    // Extract highlighting data from API response
    if (resultsRaw.result) {
        for (const r of resultsRaw.result) {
            highlights[r.id] = r.highlight;        // Store highlights per article ID
        }
    }
    
    // ===============================
    // PREPARE DROPDOWN
    // ===============================
    if (!nf.searchDropdown) nfCreateSearchDropdown();  // Create dropdown if needed
    nf.searchDropdown.innerHTML = '';                   // Clear previous results
    
    // ===============================
    // HANDLE NO RESULTS
    // ===============================
    if (!details.length) {
        nf.searchDropdown.innerHTML = '<div style="padding:1rem;color:#888;">No results found.</div>';
        nf.searchDropdown.style.display = 'block';
        return;  // Exit function if results are empty
    }
    
    // ===============================
    // LOAD TEMPLATE SYSTEM
    // ===============================
    // Load HTML template for search results (if present)
    const searchResultTemplate = document.getElementById('nf_search_result_template');
    
    // ===============================
    // ITERATE AND DISPLAY RESULTS
    // ===============================
    details.forEach(res => {
        let div;  // Container for single search result
        
        // ===============================
        // TEMPLATE-BASED CREATION
        // ===============================
        if (searchResultTemplate) {
            // Use predefined HTML template
            div = searchResultTemplate.firstElementChild.cloneNode(true);  // Deep Clone
            
            // ===============================
            // PROCESS TITLE WITH HIGHLIGHTING
            // ===============================
            let title = res.title || '';
            // Check for highlighting in title from API
            if (highlights[res.id] && highlights[res.id]["content.title"]) {
                title = highlights[res.id]["content.title"].join(' ');  // Use API highlighting
            }
            
            // Convert <em> tags in title to <mark> for better visibility
            if (/<em>/.test(title)) {
                title = title.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
                div.querySelector('.nf-search-result-title').innerHTML = title;  // Use innerHTML for HTML tags
            } else {
                // If no highlighting, add our own
                const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                title = title.replace(re, '<mark>$1</mark>');
                div.querySelector('.nf-search-result-title').innerHTML = title;
            }
            
            // ===============================
            // CONTENT SUMMARY WITH HIGHLIGHTING
            // ===============================
            let summary = '';
            // Prefer API highlights if available
            if (highlights[res.id] && highlights[res.id]["content.body"]) {
                summary = highlights[res.id]["content.body"].join(' ... ');  // Join highlight snippets
            } else {
                summary = res.body || '';  // Fallback to full body
            }
            
            // ===============================
            // SEARCH TERM HIGHLIGHTING IN SUMMARY
            // ===============================
            if (!/<em>/.test(summary)) {
                // If no highlighting, add our own
                const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                summary = summary.replace(re, '<mark>$1</mark>');  // Wrap search term in <mark>
            } else {
                // Convert Zammad <em> tags to <mark> for consistent styling
                summary = summary.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
            }
            
            // Set formatted summary in template
            div.querySelector('.nf-search-result-summary').innerHTML = summary;
            // Set link and ARIA for title
            const helpdeskBase = window.NF_CONFIG?.links?.helpdeskBase;
            const titleLink = div.querySelector('.nf-search-result-title');
            if (titleLink) {
                titleLink.href = helpdeskBase + res.url;
                titleLink.setAttribute('target', '_blank');
                titleLink.setAttribute('rel', 'noopener');
                titleLink.setAttribute('role', 'heading');
                titleLink.setAttribute('aria-level', '3');
                const ariaLabelTemplate = window.NF_CONFIG?.system?.assets?.aria?.openArticle || 'Open article: {title}';
                titleLink.setAttribute('aria-label', ariaLabelTemplate.replace('{title}', res.title || ''));
                // Click on link closes dropdown
                titleLink.addEventListener('click', (ev) => {
                    nf.searchDropdown.style.display = 'none';
                    // No window.open needed, href+target is set
                });
            }
        } else {
            // ===============================
            // FALLBACK: PROGRAMMATIC CREATION
            // ===============================
            // If no template, create element programmatically
            div = document.createElement('div');
            div.className = 'nf-search-result';
            div.style.padding = '0.7rem 1.2rem';      // Padding
            div.style.cursor = 'pointer';              // Pointer cursor for clickability
            div.style.borderBottom = '1px solid #f0f0f0'; // Divider between results
            
            let title = res.title || '';               // Article title
            let summary = '';                          // Article summary
            
            // ===============================
            // TITLE HIGHLIGHTING FOR FALLBACK
            // ===============================
            // Check for highlighting in title from API
            if (highlights[res.id] && highlights[res.id]["content.title"]) {
                title = highlights[res.id]["content.title"].join(' ');  // Use API highlighting
            }
            
            // Convert <em> tags in title to <mark> or add our own highlighting
            if (/<em>/.test(title)) {
                title = title.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
            } else {
                // If no highlighting, add our own
                const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                title = title.replace(re, '<mark>$1</mark>');
            }
            
            // ===============================
            // CONTENT PROCESSING FOR FALLBACK
            // ===============================
            // Same highlighting logic as template version
            if (highlights[res.id] && highlights[res.id]["content.body"]) {
                summary = highlights[res.id]["content.body"].join(' ... ');
            } else {
                summary = res.body || '';
            }
            
            // ===============================
            // SUMMARY HIGHLIGHTING FOR FALLBACK
            // ===============================
            if (!/<em>/.test(summary)) {
                // Escape regex special characters in search term
                const re = new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')+')', 'gi');
                summary = summary.replace(re, '<mark>$1</mark>');
            } else {
                summary = summary.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
            }
            
            // ===============================
            // HTML STRUCTURE FOR FALLBACK
            // ===============================
            div.innerHTML = `
                <div style='font-weight:600;font-size:1.1rem;'>${title}</div>
                <div class='nf-search-result-summary' style='font-size:0.97rem;color:#555;'>${summary}</div>
            `;
            // ===============================
            // CLICK HANDLER FOR FALLBACK
            // ===============================
            div.addEventListener('click', () => {
                const helpdeskBase = window.NF_CONFIG?.links?.helpdeskBase;
                window.open(helpdeskBase + res.url, '_blank');
                nf.searchDropdown.style.display = 'none';
            });
        }
        
        // ===============================
        // ADD RESULT TO DROPDOWN
        // ===============================
        nf.searchDropdown.appendChild(div);
    });
    
    // ===============================
    // SHOW DROPDOWN
    // ===============================
    nf.searchDropdown.style.display = 'block';
}

// ===============================
// DROPDOWN-HIDE HELPER FUNCTION
// ===============================

/**
 * Hides the search dropdown
 * Called on ESC key, click outside, or after article selection
 */
function nfHideSearchDropdown() {
    if (nf.searchDropdown) {
        nf.searchDropdown.style.display = 'none';
    }
}

// ===============================
// SEARCH-SYSTEM INIT AND EVENT-HANDLER
// ===============================

/**
 * Initializes the complete search functionality with all event listeners
 * Configures debouncing, keyboard navigation, and click-outside handling
 */
function nfInitializeSearch() {
    // ===============================
    // EARLY EXIT IF SEARCH FIELD IS MISSING
    // ===============================
    if (!nf.searchInput) return;  // Exit if no search field present
    
    // ===============================
    // CREATE DROPDOWN
    // ===============================
    nfCreateSearchDropdown();  // Create dropdown container
    
    // ===============================
    // LOAD CONFIGURATION
    // ===============================
    // Load minimum search term length from configuration
    const minLength = window.NF_CONFIG?.ui?.searchMinLength || 2;
    
    // ===============================
    // DEBOUNCED SEARCH FUNCTION
    // ===============================
    // Create debounced search function for performance optimization
    // Uses the configured debounce timeout from NF_CONFIG.ui.debounceTimeout
    const debouncedSearch = NFUtils.debounceConfigured(async (query) => {
        try {
            nfLogger.debug('Performing search', { query });
            const res = await nfSearchKnowledgebase(query);    // API call
            nfShowSearchDropdown(res, query);                  // Show results
        } catch (error) {
            nfLogger.warn('Search failed', { query, error: error.message });
            nfShowSearchDropdown({details: []}, query);        // Show empty results on error
        }
    });
    
    // ===============================
    // INPUT EVENT LISTENER (LIVE SEARCH)
    // ===============================
    // React to every text input in the search field
    nf.searchInput.addEventListener('input', e => handleSearchInput(e, minLength, debouncedSearch));
    
    // ===============================
    // KEYBOARD EVENT LISTENER
    // ===============================
    // Handle special keys in the search field
    nf.searchInput.addEventListener('keydown', e => handleSearchKeydown(e, minLength));
    
    // ===============================
    // CLICK-OUTSIDE EVENT LISTENER
    // ===============================
    // Close dropdown on click outside the search area
    document.addEventListener('click', handleClickOutside);
}

function handleSearchInput(e, minLength, debouncedSearch) {
    const val = e.target.value.trim();
    if (val.length < minLength) {
        nfHideSearchDropdown();
        return;
    }
    debouncedSearch(val);
}

function handleSearchKeydown(e, minLength) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val.length < minLength) return;
        nfSearchKnowledgebase(val)
            .then(res => nfShowSearchDropdown(res, val))
            .catch(() => nfShowSearchDropdown({details: []}, val));
    }
    if (e.key === 'Escape') {
        nfHideSearchDropdown();
    }
}

function handleClickOutside(ev) {
    if (nf.searchDropdown && !nf.searchDropdown.contains(ev.target) && ev.target !== nf.searchInput) {
        nfHideSearchDropdown();
    }
}
