/**
 * @fileoverview Ticket list management and display with filters
 * @author danielknng
 * @module NFTicketList
 * @since 2025-07-15
 * @version 1.0.0
 */

import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfSetLoading } from './nf-helpers.js';
import { nfShow, nfHide } from './nf-helpers.js';
import { nfShowStatus } from './nf-status.js';
import { nfFetchTicketsFiltered } from './nf-api.js';
import { nfShowTicketList, nfShowTicketDetail } from './nf-ui.js';
import { nfShowTicketDetailView } from './nf-ticket-detail.js';

/**
 * Global filter state for ticket list display
 * @namespace NFTicketList.filters
 * @property {string} statusCategory - Current status filter (active|closed|inactive)
 * @property {number} year - Selected year for filtering
 * @property {string} sortOrder - Current sort order (date_desc|date_asc|priority)
 */
let nfCurrentFilters = {
    statusCategory: 'active',  // Default: Only active tickets
    year: new Date().getFullYear(),
    sortOrder: 'date_desc'
};

let nfFiltersInitialized = false;

/**
 * Loads all user tickets based on current filters and displays them
 * Uses new filter system with smart caching
 */
async function nfLoadAndShowTicketList() {
    const statusLabel = nfCurrentFilters.statusCategory === 'closed' ? 'closed' : 'active';
    if (typeof nfLogger !== 'undefined') {
        nfLogger.debug(`Loading ${statusLabel} tickets...`);
    } else {
        window.nfLogger.debug(`Loading ${statusLabel} tickets...`);
    }
    window.nfLogger.debug('nfLoadAndShowTicketList called');
    nfSetLoading(true);  // Show loading spinner during API call
    try {
        if (!nfFiltersInitialized) {
            nfInitializeFilters();
            nfFiltersInitialized = true;
            window.nfLogger.debug('Filters initialized');
        }
        
        const tickets = await nfFetchTicketsFiltered(nfCurrentFilters);
        window.nfLogger.debug('Tickets fetched in nfLoadAndShowTicketList:', { tickets });
        nfRenderTicketList(tickets);
        nfShowTicketList();
    } catch (error) {
        window.nfLogger.error('Error in nfLoadAndShowTicketList:', { error });
        nfShowStatus(window.nfLang.getUtilsMessage('ticketListLoadError') + error.message, 'error', 'ticketlist');
    } finally {
        nfSetLoading(false);
    }
}

/**
 * Initializes the filter UI elements and event listeners
 */
function nfInitializeFilters() {
    const statusFilter = document.getElementById('nf_filter_status');
    const sortFilter = document.getElementById('nf_sort');
    const yearFilter = document.getElementById('nf_filter_year');
    const reloadBtn = document.getElementById('nf_ticketlist_reload');
    // Set reload button label from config
    if (reloadBtn) {
        const reloadButtonText = window.nfLang.getLabel('reloadButton');
        reloadBtn.textContent = reloadButtonText;
        reloadBtn.setAttribute('aria-label', reloadButtonText);
        reloadBtn.setAttribute('title', reloadButtonText);
    }
    if (!statusFilter || !sortFilter || !yearFilter) return;
    
    const availableYears = NF_CONFIG?.ui?.filters?.availableYears || [
        new Date().getFullYear(),
        new Date().getFullYear() - 1,
        new Date().getFullYear() - 2
    ];
    yearFilter.innerHTML = '';
    availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === nfCurrentFilters.year) option.selected = true;
        yearFilter.appendChild(option);
    });
    
    statusFilter.value = nfCurrentFilters.statusCategory;
    sortFilter.value = nfCurrentFilters.sortOrder;
    // Only show year filter for closed tickets
    nfToggleYearFilter(nfCurrentFilters.statusCategory === 'closed');
    
    statusFilter.addEventListener('change', nfOnStatusFilterChange);
    sortFilter.addEventListener('change', nfOnSortFilterChange);
    yearFilter.addEventListener('change', nfOnYearFilterChange);
    if (reloadBtn) {
        reloadBtn.addEventListener('click', async () => {
            // Log reload action with current context
            if (typeof window.nfLogger !== 'undefined') {
                window.nfLogger.debug('Reload button clicked', {
                    currentFilters: nfCurrentFilters,
                    statusCategory: nfCurrentFilters.statusCategory,
                    year: nfCurrentFilters.year,
                    sortOrder: nfCurrentFilters.sortOrder,
                    userId: nf.userId,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Invalidate current context caches before reload
            nfInvalidateCurrentTicketCaches();
            await nfReloadTicketsWithFilters();
        });
    }
    
    const headers = document.querySelectorAll('.nf-ticketlist-header-cell[data-sort]');
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const sortType = header.getAttribute('data-sort');
            nfOnHeaderSort(sortType);
        });
    });
}

/**
 * Event handler for status filter changes
 */
async function nfOnStatusFilterChange(event) {
    const newStatusCategory = event.target.value;
    window.nfLogger.debug('Status filter changed:', { newStatusCategory });
    // Show/hide year filter depending on status category
    nfToggleYearFilter(newStatusCategory === 'closed');
    // Update filter and reload
    nfCurrentFilters.statusCategory = newStatusCategory;
    await nfReloadTicketsWithFilters();
}

/**
 * Event handler for sort filter changes
 */
async function nfOnSortFilterChange(event) {
    window.nfLogger.debug('Sort filter changed:', { value: event.target.value });
    nfCurrentFilters.sortOrder = event.target.value;
    await nfReloadTicketsWithFilters();
}

/**
 * Event handler for year filter changes
 */
async function nfOnYearFilterChange(event) {
    window.nfLogger.debug('Year filter changed:', { value: event.target.value });
    nfCurrentFilters.year = parseInt(event.target.value);
    await nfReloadTicketsWithFilters();
}

/**
 * Event handler for header click sorting
 */
async function nfOnHeaderSort(sortType) {
    // Toggle between ASC/DESC for same sort type
    if (nfCurrentFilters.sortOrder === sortType) {
        if (sortType === 'date_desc') sortType = 'date_asc';
        else if (sortType === 'date_asc') sortType = 'date_desc';
    }
    nfCurrentFilters.sortOrder = sortType;
    // Sync dropdown filter
    const sortFilter = document.getElementById('nf_sort');
    if (sortFilter) sortFilter.value = sortType;
    await nfReloadTicketsWithFilters();
}

/**
 * Show/hide the year filter depending on status category
 */
function nfToggleYearFilter(show) {
    const yearFilter = document.getElementById('nf_filter_year');
    if (yearFilter) {
        if (show) {
            nfShow(yearFilter);
        } else {
            nfHide(yearFilter);
        }
    }
}

/**
 * Reloads tickets with current filters
 */
async function nfReloadTicketsWithFilters() {
    const statusLabel = nfCurrentFilters.statusCategory === 'closed' ? 'closed' : 'active';
    if (typeof nfLogger !== 'undefined') {
        nfLogger.debug(`Loading ${statusLabel} tickets...`);
    } else {
        window.nfLogger.debug(`Loading ${statusLabel} tickets...`);
    }
    nfSetLoading(true);
    try {
        const tickets = await nfFetchTicketsFiltered(nfCurrentFilters);
        nfRenderTicketList(tickets);
    } catch (error) {
        nfShowStatus(window.nfLang.getUtilsMessage('ticketListFilterError') + error.message, 'error', 'ticketlist');
    } finally {
        nfSetLoading(false);
    }
}

/**
 * Maps a ticket state ID or name to a readable status label using NF_CONFIG and current language
 */
function nfStateLabel(state) {
    const ticketStates = window.nfLang.getSystemData('ticketStates');
    // State can be a number or string (id or name)
    if (typeof state === 'number' && ticketStates[state]) return ticketStates[state];
    if (typeof state === 'string') {
        // Try as number string
        if (ticketStates[Number(state)]) return ticketStates[Number(state)];
        // Try as lowercased string key
        if (ticketStates[state.toLowerCase()]) return ticketStates[state.toLowerCase()];
    }
    // No fallback: always defined in config
    return '';
}

/**
 * Renders the ticket list into the table
 */
function nfRenderTicketList(tickets) {
    window.nfLogger.debug('nfRenderTicketList called');
    nf.ticketListBody.innerHTML = '';
    
    if (!tickets.length) {
        nfShow(nf.ticketListEmpty);  // Show "No tickets" message
        nf.ticketListEmpty.textContent = window.nfLang.getLabel('ticketListEmpty');
        return;
    } else {
        nfHide(nf.ticketListEmpty);  // Hide "No tickets" message
    }
    
    const ticketRowTemplate = nf.templates.ticketListRow;
    
    tickets.forEach((t) => {
        let tr;  // Table row for current ticket
        
        if (ticketRowTemplate) {
            // Use querySelector to reliably find the <tr> inside the template
            const trTemplate = ticketRowTemplate.querySelector('tr.nf-ticketlist-row');
            if (trTemplate) {
                // Extract <tr> from template with correct table context
                const tempTable = document.createElement('table');
                tempTable.innerHTML = trTemplate.outerHTML;
                tr = tempTable.querySelector('tr');
                
                try {
                    const idCell = tr.querySelector('.nf-ticketlist-cell--id');
                    if (idCell) idCell.textContent = t.number || t.id || '';
                    const subjectCell = tr.querySelector('.nf-ticketlist-cell--subject');
                    if (subjectCell) subjectCell.textContent = t.title || t.subject || '';
                    const createdCell = tr.querySelector('.nf-ticketlist-cell--created');
                    if (createdCell) createdCell.textContent = t.created_at ? new Date(t.created_at).toLocaleString(window.nfLang.getCurrentLocale()) : '';
                    const statusSpan = tr.querySelector('.nf-ticketlist-cell--status span');
                    if (statusSpan) {
                        statusSpan.className = 'nf-ticketlist-status nf-ticketlist-status--' + (t.state || t.state_id);
                        statusSpan.textContent = nfStateLabel(t.state || t.state_id);
                    } else {
                        if (typeof nfLogger !== 'undefined') {
                            nfLogger.warn(window.nfLang.getUtilsMessage('ticketListStatusSpanMissing'), { ticket: t });
                        }
                    }
                } catch (e) {
                    window.nfLogger.error('Error while filling ticket row:', { error: e, ticket: t, element: tr });
                }
            } else {
                // Log error and skip rendering this row
                window.nfLogger.error('Ticket row template <tr> not found. Skipping ticket row rendering.');
                return;
            }
        } else {
            // Log error and skip rendering this row
            window.nfLogger.error('Ticket row template not found. Skipping ticket row rendering.');
            return;
        }
        
        // On row click: open ticket detail view
        tr.addEventListener('click', async (event) => {
            // Check if the click is on a link element (to prevent double handling)
            if (event.target.closest('.nf-ticketlist-link')) {
                window.nfLogger.debug('Click intercepted by link handler, skipping row handler');
                return;
            }
            
            window.nfLogger.debug('Ticket row clicked', { ticketId: t.id, event });
            nf.ticketDetailContainer.setAttribute('data-ticket-id', t.id);  // Store internal ticket ID
            await nfShowTicketDetailView(t.id); // Load and render content
            nfShowTicketDetail();               // Show the modal and manage blur
        });
        // CLICK HANDLER FOR THE LINK (TICKET TITLE)
        const subjectLink = tr.querySelector('.nf-ticketlist-link');
        if (subjectLink) {
            subjectLink.addEventListener('click', async (event) => {
                window.nfLogger.debug('Ticket subject link clicked', { ticketId: t.id, event });
                event.preventDefault(); // Prevent closing the modal
                event.stopPropagation(); // Prevent row click from firing twice
                nf.ticketDetailContainer.setAttribute('data-ticket-id', t.id);
                await nfShowTicketDetailView(t.id);
                nfShowTicketDetail();
            });
        }
        
        nf.ticketListBody.appendChild(tr);  // Add row to ticket table
    });
}

/**
 * Invalidates ticket caches based on current filter context
 * Only invalidates current year tickets (active/closed), not archived
 */
function nfInvalidateCurrentTicketCaches() {
    const currentYear = new Date().getFullYear();
    
    // Only invalidate current year caches (archived tickets shouldn't be refreshed)
    if (nfCurrentFilters.year === currentYear && typeof window.nfCache !== 'undefined') {
        const cacheKey = `tickets_${nfCurrentFilters.statusCategory}_${nfCurrentFilters.year}_${nf.userId}`;
        
        // Invalidate ticket list cache for current context
        window.nfCache.invalidate(cacheKey);
        
        if (typeof window.nfLogger !== 'undefined') {
            window.nfLogger.debug('Invalidated current year ticket caches on reload', {
                cacheKey,
                statusCategory: nfCurrentFilters.statusCategory,
                year: nfCurrentFilters.year,
                reason: 'manual reload button pressed'
            });
        }
        
        // Note: Individual ticket detail caches are NOT invalidated here
        // They have their own TTL and will expire naturally
        // Only invalidate if user is actively working on tickets (replies/actions)
    }
}

// Exporting the function for use in other modules
export { nfLoadAndShowTicketList };
