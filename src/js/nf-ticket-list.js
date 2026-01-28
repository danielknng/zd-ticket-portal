// Author: Daniel Könning
// ===============================
// nf-ticket-list.js - Ticket list management and display with filters
// ===============================
// This file contains all functions for displaying the ticket list.
// It handles loading, formatting, filtering, and template-based display
// of tickets in the overview list with smart caching.

// ===============================
// GLOBAL FILTER VARIABLES
// ===============================
let nfCurrentFilters = {
    statusCategory: 'active',  // Default: Only active tickets
    year: new Date().getFullYear(),
    sortOrder: 'date_desc'
};

// ===============================
// LOAD AND DISPLAY TICKET LIST
// ===============================

/**
 * Loads all user tickets based on current filters and displays them
 * Uses new filter system with smart caching
 */
async function nfLoadAndShowTicketList() {
    nfSetLoading(true);  // Show loading spinner during API call
    
    try {
        // ===============================
        // INITIALIZE FILTER UI
        // ===============================
        nfInitializeFilters();
        
        // ===============================
        // LOAD TICKETS FROM SERVER (FILTERED)
        // ===============================
        const tickets = await nfFetchTicketsFiltered(nfCurrentFilters);
        
        // ===============================
        // DISPLAY TICKETS
        // ===============================
        nfRenderTicketList(tickets);
        
        // ===============================
        // SHOW TICKET LIST
        // ===============================
        nfShowTicketList();  // Show the ticket list modal
    } catch (error) {
        // ===============================
        // ERROR HANDLING
        // ===============================
        nfShowStatus(NF_CONFIG.utilsMessages.ticketListLoadError + error.message, 'error', 'ticketlist');
    } finally {
        // ===============================
        // CLEANUP
        // ===============================
        nfSetLoading(false);  // Always hide loading spinner
    }
}

/**
 * Initializes the filter UI elements and event listeners
 */
function nfInitializeFilters() {
    // ===============================
    // GET DOM ELEMENTS
    // ===============================
    const statusFilter = document.getElementById('nf_filter_status');
    const sortFilter = document.getElementById('nf_sort');
    const yearFilter = document.getElementById('nf_filter_year');
    const reloadBtn = document.getElementById('nf_ticketlist_reload');
    // Set reload button label from config
    if (reloadBtn && window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage)?.reloadButton) {
        reloadBtn.textContent = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage).reloadButton;
        reloadBtn.setAttribute('aria-label', window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage).reloadButton);
        reloadBtn.setAttribute('title', window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage).reloadButton);
    }
    if (!statusFilter || !sortFilter || !yearFilter) return;
    // ===============================
    // DYNAMICALLY FILL YEAR FILTER
    // ===============================
    const availableYears = window.NF_CONFIG?.ui?.filters?.availableYears || [
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
    // ===============================
    // SET FILTER DEFAULTS
    // ===============================
    statusFilter.value = nfCurrentFilters.statusCategory;
    sortFilter.value = nfCurrentFilters.sortOrder;
    // Only show year filter for closed tickets
    nfToggleYearFilter(nfCurrentFilters.statusCategory === 'closed');
    // ===============================
    // EVENT LISTENERS FOR FILTER CHANGES
    // ===============================
    statusFilter.addEventListener('change', nfOnStatusFilterChange);
    sortFilter.addEventListener('change', nfOnSortFilterChange);
    yearFilter.addEventListener('change', nfOnYearFilterChange);
    // ===============================
    // EVENT LISTENER FOR RELOAD BUTTON
    // ===============================
    if (reloadBtn) {
        reloadBtn.addEventListener('click', async () => {
            // Invalidate ticket list cache for current filters
            const cacheKey = `tickets_${nfCurrentFilters.statusCategory}_${nfCurrentFilters.year}_${nf.userId}`;
            if (typeof nfCache !== 'undefined') nfCache.invalidate(cacheKey);
            await nfReloadTicketsWithFilters();
        });
    }
    // ===============================
    // SORT HEADER CLICKS
    // ===============================
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
    nfCurrentFilters.sortOrder = event.target.value;
    await nfReloadTicketsWithFilters();
}

/**
 * Event handler for year filter changes
 */
async function nfOnYearFilterChange(event) {
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
            yearFilter.classList.remove('nf-hidden');
        } else {
            yearFilter.classList.add('nf-hidden');
        }
    }
}

/**
 * Reloads tickets with current filters
 */
async function nfReloadTicketsWithFilters() {
    nfSetLoading(true);
    try {
        const tickets = await nfFetchTicketsFiltered(nfCurrentFilters);
        nfRenderTicketList(tickets);
    } catch (error) {
        nfShowStatus(NF_CONFIG.utilsMessages.ticketListFilterError + error.message, 'error', 'ticketlist');
    } finally {
        nfSetLoading(false);
    }
}

/**
 * Renders the ticket list into the table
 */
function nfRenderTicketList(tickets) {
    nf.ticketListBody.innerHTML = '';
    // ===============================
    // HANDLE EMPTY LIST
    // ===============================
    if (!tickets.length) {
        nfShow(nf.ticketListEmpty);  // Show "No tickets" message
        nf.ticketListEmpty.textContent = NF_CONFIG.getLabels(NF_CONFIG.currentLanguage).ticketListEmpty;
        return;
    } else {
        nfHide(nf.ticketListEmpty);  // Hide "No tickets" message
    }
    // ===============================
    // TEMPLATE SYSTEM FOR TICKET ROWS
    // ===============================
    const ticketRowTemplate = nf.templates.ticketListRow;
    // ===============================
    // INSERT EACH TICKET INTO TABLE
    // ===============================
    tickets.forEach((t) => {
        let tr;  // Table row for current ticket
        // ===============================
        // TEMPLATE-BASED CREATION
        // ===============================
        if (ticketRowTemplate) {
            // Navigate template structure: div > table > tbody > tr
            const table = ticketRowTemplate.firstElementChild;
            const tbody = table && table.firstElementChild;
            const trTemplate = tbody && tbody.firstElementChild;
            tr = trTemplate.cloneNode(true);  // Deep clone of template row
            // ===============================
            // FILL TEMPLATE FIELDS
            // ===============================
            // Set ticket data in predefined template elements
            tr.querySelector('.nf-ticketlist-cell--id').textContent = t.number || t.id || '';
            tr.querySelector('.nf-ticketlist-cell--subject').textContent = t.title || t.subject || '';
            tr.querySelector('.nf-ticketlist-cell--created').textContent = t.created_at ? 
                new Date(t.created_at).toLocaleString('en-US') : '';
            // ===============================
            // STATUS STYLING AND TEXT
            // ===============================
            const statusSpan = tr.querySelector('.nf-ticketlist-cell--status span');
            if (statusSpan) {
                statusSpan.className = 'nf-ticketlist-status nf-ticketlist-status--' + (t.state || t.state_id);
                statusSpan.textContent = nfStateLabel(t.state || t.state_id);
            } else {
                if (typeof nfLogger !== 'undefined') {
                    nfLogger.warn(NF_CONFIG.utilsMessages.ticketListStatusSpanMissing, { ticket: t });
                }
            }
            // Ticket title as plain text (no link)
            const subjectCell = tr.querySelector('.nf-ticketlist-cell--subject');
            if (subjectCell) {
                const ticketTitle = t.title || t.subject || '';
                subjectCell.textContent = ticketTitle;
            }
        } else {
            // ===============================
            // FALLBACK: PROGRAMMATIC CREATION
            // ===============================
            // Create table row without template
            tr = document.createElement('tr');
            tr.className = 'nf-ticketlist-row';
            tr.innerHTML = `
                <td class="nf-ticketlist-cell nf-ticketlist-cell--id nf-center-text">${t.number || t.id || ''}</td>
                <td class="nf-ticketlist-cell nf-ticketlist-cell--subject">${t.title || t.subject || ''}</td>
                <td class="nf-ticketlist-cell nf-ticketlist-cell--created nf-center-text">${t.created_at ? new Date(t.created_at).toLocaleString('en-US') : ''}</td>
                <td class="nf-ticketlist-cell nf-ticketlist-cell--status nf-center-text"><span class="nf-ticketlist-status nf-ticketlist-status--${t.state || t.state_id}">${nfStateLabel(t.state || t.state_id)}</span></td>
            `;
        }
        // ===============================
        // CLICK HANDLER FOR TICKET DETAILS
        // ===============================
        // On row click: open ticket detail view
        tr.addEventListener('click', async () => {
            nf.ticketDetailContainer.setAttribute('data-ticket-id', t.id);  // Store ticket ID
            await nfShowTicketDetailView(t.id);                            // Load and show details
        });
        // CLICK HANDLER FOR THE LINK (TICKET TITLE)
        const subjectLink = tr.querySelector('.nf-ticketlist-link');
        if (subjectLink) {
            subjectLink.addEventListener('click', async (event) => {
                event.preventDefault(); // Prevent closing the modal
                event.stopPropagation(); // Prevent row click from firing twice
                nf.ticketDetailContainer.setAttribute('data-ticket-id', t.id);
                await nfShowTicketDetailView(t.id);
            });
        }
        // ===============================
        // ADD ROW TO TABLE
        // ===============================
        nf.ticketListBody.appendChild(tr);  // Add row to ticket table
    });
}
