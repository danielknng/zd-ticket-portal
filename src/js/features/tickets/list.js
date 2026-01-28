/**
 * @fileoverview Ticket list management and display with filters
 * @author danielknng
 * @module features/tickets/list
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from '../../core/config.js';
import { CURRENT_YEAR } from '../../core/constants.js';
import { dom } from '../../ui/dom.js';
import { setLoading, stateLabel, show, hide } from '../../ui/helpers.js';
import { showStatus } from '../../ui/status.js';
import { TicketService } from '../../api/tickets.js';
import appState from '../../state/store.js';
import nfLogger from '../../core/logger.js';
import { Modal } from '../../ui/modal.js';
import languageManager from '../../i18n/manager.js';

/**
 * Ticket list component
 * Manages ticket list display, filtering, and sorting
 */
export class TicketList {
    /**
     * @param {TicketService} ticketService - Ticket service instance
     * @param {Modal} modal - Modal instance
     */
    constructor(ticketService, modal) {
        this.ticketService = ticketService;
        this.modal = modal;
        
        /** @type {Object} Current filter state */
        this.filters = {
            statusCategory: NF_CONFIG?.ui?.filters?.defaultStatusFilter || 'active',
            year: CURRENT_YEAR,
            sortOrder: NF_CONFIG?.ui?.filters?.defaultSortOrder || 'date_desc'
        };
        
        /** @type {boolean} Whether filters have been initialized */
        this.filtersInitialized = false;
    }

    /**
     * Loads and displays the ticket list with current filters
     */
    async loadAndShow() {
        const statusLabel = this.filters.statusCategory === 'closed' ? 'closed' : 'active';
        nfLogger.debug(`Loading ${statusLabel} tickets...`);
        
        setLoading(true);
        try {
            if (!this.filtersInitialized) {
                this.initializeFilters();
                this.filtersInitialized = true;
                nfLogger.debug('Filters initialized');
            }
            
            const tickets = await this.ticketService.getTickets(this.filters);
            nfLogger.debug('Tickets fetched', { tickets });
            this.render(tickets);
            this.show();
        } catch (error) {
            nfLogger.error('Error loading ticket list', { error });
            const errorMsg = this._getLanguageMessage('ticketListLoadError') + error.message;
            showStatus(errorMsg, 'error', 'ticketlist');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Initializes filter UI elements and event listeners
     */
    initializeFilters() {
        const statusFilter = document.getElementById('nf_filter_status');
        const sortFilter = document.getElementById('nf_sort');
        const yearFilter = document.getElementById('nf_filter_year');
        const reloadBtn = document.getElementById('nf_ticketlist_reload');
        
        // Set reload button label
        if (reloadBtn) {
            const reloadButtonText = this._getLanguageLabel('reloadButton');
            reloadBtn.textContent = reloadButtonText;
            reloadBtn.setAttribute('aria-label', reloadButtonText);
            reloadBtn.setAttribute('title', reloadButtonText);
        }
        
        if (!statusFilter || !sortFilter || !yearFilter) return;
        
        // Populate year filter
        const availableYears = NF_CONFIG?.ui?.filters?.availableYears || [
            CURRENT_YEAR,
            CURRENT_YEAR - 1,
            CURRENT_YEAR - 2
        ];
        yearFilter.innerHTML = '';
        availableYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === this.filters.year) option.selected = true;
            yearFilter.appendChild(option);
        });
        
        statusFilter.value = this.filters.statusCategory;
        sortFilter.value = this.filters.sortOrder;
        
        // Show/hide year filter based on status
        this.toggleYearFilter(this.filters.statusCategory === 'closed');
        
        // Add event listeners
        statusFilter.addEventListener('change', (e) => this.onStatusFilterChange(e));
        sortFilter.addEventListener('change', (e) => this.onSortFilterChange(e));
        yearFilter.addEventListener('change', (e) => this.onYearFilterChange(e));
        
        if (reloadBtn) {
            reloadBtn.addEventListener('click', async () => {
                nfLogger.debug('Reload button clicked', {
                    currentFilters: this.filters,
                    statusCategory: this.filters.statusCategory,
                    year: this.filters.year,
                    sortOrder: this.filters.sortOrder,
                    userId: appState.get('userId'),
                    timestamp: new Date().toISOString()
                });
                
                this.invalidateCurrentCaches();
                await this.reload();
            });
        }
        
        // Setup header sorting
        const headers = document.querySelectorAll('.nf-ticketlist-header-cell[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const sortType = header.getAttribute('data-sort');
                this.onHeaderSort(sortType);
            });
        });
    }

    /**
     * Event handler for status filter changes
     * @param {Event} event - Change event
     */
    async onStatusFilterChange(event) {
        const newStatusCategory = event.target.value;
        nfLogger.debug('Status filter changed', { newStatusCategory });
        this.toggleYearFilter(newStatusCategory === 'closed');
        this.filters.statusCategory = newStatusCategory;
        await this.reload();
    }

    /**
     * Event handler for sort filter changes
     * @param {Event} event - Change event
     */
    async onSortFilterChange(event) {
        nfLogger.debug('Sort filter changed', { value: event.target.value });
        this.filters.sortOrder = event.target.value;
        await this.reload();
    }

    /**
     * Event handler for year filter changes
     * @param {Event} event - Change event
     */
    async onYearFilterChange(event) {
        nfLogger.debug('Year filter changed', { value: event.target.value });
        this.filters.year = parseInt(event.target.value);
        await this.reload();
    }

    /**
     * Event handler for header click sorting
     * @param {string} sortType - Sort type to apply
     */
    async onHeaderSort(sortType) {
        // Toggle between ASC/DESC for same sort type
        if (this.filters.sortOrder === sortType) {
            if (sortType === 'date_desc') sortType = 'date_asc';
            else if (sortType === 'date_asc') sortType = 'date_desc';
        }
        this.filters.sortOrder = sortType;
        
        // Sync dropdown filter
        const sortFilter = document.getElementById('nf_sort');
        if (sortFilter) sortFilter.value = sortType;
        
        await this.reload();
    }

    /**
     * Show/hide the year filter based on status category
     * @param {boolean} shouldShow - Whether to show the year filter
     */
    toggleYearFilter(shouldShow) {
        const yearFilter = document.getElementById('nf_filter_year');
        if (yearFilter) {
            shouldShow ? show(yearFilter) : hide(yearFilter);
        }
    }

    /**
     * Reloads tickets with current filters
     */
    async reload() {
        const statusLabel = this.filters.statusCategory === 'closed' ? 'closed' : 'active';
        nfLogger.debug(`Loading ${statusLabel} tickets...`);
        
        setLoading(true);
        try {
            const tickets = await this.ticketService.getTickets(this.filters);
            this.render(tickets);
        } catch (error) {
            const errorMsg = this._getLanguageMessage('ticketListFilterError') + error.message;
            showStatus(errorMsg, 'error', 'ticketlist');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Renders the ticket list into the table
     * @param {Array} tickets - Array of ticket objects
     */
    render(tickets) {
        nfLogger.debug('Rendering ticket list', { count: tickets.length });
        dom.ticketListBody.innerHTML = '';
        
        if (!tickets.length) {
            show(dom.ticketListEmpty);
            dom.ticketListEmpty.textContent = this._getLanguageLabel('ticketListEmpty');
            return;
        } else {
            hide(dom.ticketListEmpty);
        }
        
        const ticketRowTemplate = dom.templates.ticketListRow;
        
        // Use DocumentFragment for batch DOM operations to minimize reflows
        const fragment = document.createDocumentFragment();
        
        tickets.forEach((t) => {
            let tr;
            
            if (ticketRowTemplate) {
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
                        if (createdCell) {
                            const locale = this._getCurrentLocale();
                            createdCell.textContent = t.created_at ? 
                                new Date(t.created_at).toLocaleString(locale) : '';
                        }
                        
                        const statusSpan = tr.querySelector('.nf-ticketlist-cell--status span');
                        if (statusSpan) {
                            statusSpan.className = 'nf-ticketlist-status nf-ticketlist-status--' + (t.state || t.state_id);
                            statusSpan.textContent = stateLabel(t.state || t.state_id);
                        } else {
                            nfLogger.warn('Status span missing in ticket row template', { ticket: t });
                        }
                    } catch (e) {
                        nfLogger.error('Error while filling ticket row', { error: e, ticket: t, element: tr });
                    }
                } else {
                    nfLogger.error('Ticket row template <tr> not found. Skipping ticket row rendering.');
                    return;
                }
            } else {
                nfLogger.error('Ticket row template not found. Skipping ticket row rendering.');
                return;
            }
            
            // On row click: open ticket detail view
            tr.addEventListener('click', async (event) => {
                if (event.target.closest('.nf-ticketlist-link')) {
                    nfLogger.debug('Click intercepted by link handler, skipping row handler');
                    return;
                }
                
                nfLogger.debug('Ticket row clicked', { ticketId: t.id, event });
                dom.ticketDetailContainer.setAttribute('data-ticket-id', t.id);
                
                // Import dynamically to avoid circular dependency
                const { showTicketDetailView } = await import('./detail.js');
                await showTicketDetailView(t.id, this.ticketService, this.modal);
            });
            
            // Click handler for the link (ticket title)
            const subjectLink = tr.querySelector('.nf-ticketlist-link');
            if (subjectLink) {
                subjectLink.addEventListener('click', async (event) => {
                    nfLogger.debug('Ticket subject link clicked', { ticketId: t.id, event });
                    event.preventDefault();
                    event.stopPropagation();
                    dom.ticketDetailContainer.setAttribute('data-ticket-id', t.id);
                    
                    const { showTicketDetailView } = await import('./detail.js');
                    await showTicketDetailView(t.id, this.ticketService, this.modal);
                });
            }
            
            fragment.appendChild(tr);
        });
        
        // Append all rows at once to minimize reflows
        dom.ticketListBody.appendChild(fragment);
    }

    /**
     * Shows the ticket list modal
     */
    show() {
        // Close any open modals first (especially login modal)
        if (dom.loginContainer && !dom.loginContainer.classList.contains('nf-hidden')) {
            this.modal.close('nf_login_container');
        }
        
        // Show main menu in background
        show(dom.start);
        hide(dom.ticketDetailContainer);
        hide(dom.loginContainer);
        hide(dom.newTicketContainer);
        
        // Open the ticket list modal
        this.modal.open('nf_ticketlist_container');
        setLoading(false);
    }

    /**
     * Invalidates ticket caches based on current filter context
     * Only invalidates current year tickets (active/closed), not archived
     */
    invalidateCurrentCaches() {
        if (this.filters.year === CURRENT_YEAR && this.ticketService.cache) {
            const cacheKey = `tickets_${this.filters.statusCategory}_${this.filters.year}_${appState.get('userId')}`;
            this.ticketService.cache.invalidate(cacheKey);
            
            nfLogger.debug('Invalidated current year ticket caches on reload', {
                cacheKey,
                statusCategory: this.filters.statusCategory,
                year: this.filters.year,
                reason: 'manual reload button pressed'
            });
        }
    }

    /**
     * Gets language label
     * @private
     * @param {string} key - Label key
     * @returns {string} Label text
     */
    _getLanguageLabel(key) {
        if (!languageManager) return '';
        return languageManager.getLabel(key) || '';
    }

    /**
     * Gets language message
     * @private
     * @param {string} key - Message key
     * @returns {string} Message text
     */
    _getLanguageMessage(key) {
        if (!languageManager) return '';
        return languageManager.getUtilsMessage(key) || '';
    }

    /**
     * Gets current locale
     * @private
     * @returns {string} Locale code
     */
    _getCurrentLocale() {
        if (!languageManager) return 'en';
        return languageManager.getCurrentLocale() || 'en';
    }
}

// Export factory function for dependency injection
export function createTicketList(ticketService, modal) {
    return new TicketList(ticketService, modal);
}

// Export default instance (will be initialized by app.js)
export default TicketList;

