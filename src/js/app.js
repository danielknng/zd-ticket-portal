/**
 * @fileoverview Main application entry point and bootstrap
 * @author danielknng
 * @module app
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from './core/config.js';
import nfLogger from './core/logger.js';
import { dom } from './ui/dom.js';
import { Modal } from './ui/modal.js';
import appState from './state/store.js';
import eventBus from './state/events.js';
import Storage from './core/storage.js';
import ZammadApiClient from './api/client.js';
import { CacheRepository } from './api/cache.js';
import TicketService from './api/tickets.js';
import AuthService from './api/auth.js';
import KnowledgeBaseService from './api/knowledge-base.js';
import { TicketList } from './features/tickets/list.js';
import { handleNewTicketSubmit } from './features/tickets/create.js';
import { handleCloseTicket } from './features/tickets/actions.js';
import { KnowledgeBaseSearch } from './features/search/knowledge-base.js';
import { closeGallery, galleryPrevious, galleryNext } from './features/gallery/viewer.js';
import { initializeDragAndDrop } from './features/upload/file-handler.js';
import { UIInit } from './ui/init.js';

/**
 * Main application class
 * Handles initialization, dependency injection, and service orchestration
 */
class App {
    constructor() {
        /** @type {ZammadApiClient} */
        this.apiClient = null;
        
        /** @type {CacheRepository} */
        this.cache = null;
        
        /** @type {TicketService} */
        this.ticketService = null;
        
        /** @type {AuthService} */
        this.authService = null;
        
        /** @type {KnowledgeBaseService} */
        this.knowledgeBaseService = null;
        
        /** @type {TicketList} */
        this.ticketList = null;
        
        /** @type {KnowledgeBaseSearch} */
        this.search = null;
        
        /** @type {Modal} */
        this.modal = Modal;
        
        /** @type {boolean} */
        this.initialized = false;
    }

    /**
     * Initializes the application
     * Sets up all services, components, and event handlers
     */
    async init() {
        if (this.initialized) {
            nfLogger.warn('App already initialized');
            return;
        }

        try {
            nfLogger.info('Initializing application...');

            // 1. Initialize core services
            await this._initServices();

            // 2. Initialize UI components
            await this._initComponents();

            // 2.5. Initialize UI text labels (after language system is ready)
            this._initUILabels();

            // 3. Setup event handlers
            this._setupEventHandlers();

            // 4. Setup global event listeners
            this._setupGlobalListeners();

            // 5. Make services available globally for backward compatibility
            this._exposeGlobals();

            this.initialized = true;
            nfLogger.info('Application initialized successfully');

            // Fire ready event
            window.dispatchEvent(new CustomEvent('appReady'));

        } catch (error) {
            nfLogger.error('Failed to initialize application', { error });
            throw error;
        }
    }

    /**
     * Initializes all services with dependency injection
     * @private
     */
    async _initServices() {
        nfLogger.debug('Initializing services...');

        // Initialize cache
        this.cache = new CacheRepository();
        
        // Initialize API client
        const baseUrl = NF_CONFIG.api.baseUrl;
        this.apiClient = new ZammadApiClient(baseUrl);

        // Restore session from localStorage if available
        this._restoreSession();

        // Initialize services with dependencies
        this.ticketService = new TicketService(this.apiClient, this.cache);
        this.authService = new AuthService(this.apiClient);
        // Pass API client to knowledge base service so it can fetch article details when authenticated
        this.knowledgeBaseService = new KnowledgeBaseService(this.cache, this.apiClient);

        nfLogger.debug('Services initialized', {
            hasApiClient: !!this.apiClient,
            hasCache: !!this.cache,
            hasTicketService: !!this.ticketService,
            hasAuthService: !!this.authService,
            hasKnowledgeBaseService: !!this.knowledgeBaseService
        });
    }

    /**
     * Restores user session from localStorage if available
     * @private
     */
    _restoreSession() {
        try {
            const session = Storage.get('nf_session', null);
            if (session && session.userToken && session.userId) {
                // Restore session to appState
                appState.setMultiple({
                    userToken: session.userToken,
                    userId: session.userId,
                    loginAttempts: 0,
                    isAccountLocked: false
                }, true); // Silent update to avoid triggering events
                
                // Set token on API client
                if (this.apiClient) {
                    this.apiClient.setAuthToken(session.userToken);
                }
                
                nfLogger.debug('Session restored from localStorage', { userId: session.userId });
            }
        } catch (error) {
            nfLogger.warn('Failed to restore session from localStorage', { error: error.message });
        }
    }

    /**
     * Initializes UI components
     * @private
     */
    async _initComponents() {
        nfLogger.debug('Initializing UI components...');

        // Initialize ticket list component
        this.ticketList = new TicketList(this.ticketService, this.modal);

        // Initialize search (will be called when DOM is ready)
        // Search initialization happens in event handlers

        nfLogger.debug('UI components initialized');
    }

    /**
     * Initializes UI text labels from language system
     * @private
     */
    _initUILabels() {
        nfLogger.debug('Initializing UI labels...');
        
        // UI labels are initialized after language system is ready
        // This is called from app.js init() which waits for nfLanguageReady event
        UIInit.init();
        nfLogger.debug('UI labels initialized');
    }

    /**
     * Sets up application event handlers
     * @private
     */
    _setupEventHandlers() {
        nfLogger.debug('Setting up event handlers...');

        // Main trigger button
        if (dom.trigger) {
            dom.trigger.addEventListener('click', () => {
                this._showStart();
            });
        }

        // Ticket list button
        if (dom.btnTicketView) {
            dom.btnTicketView.addEventListener('click', async () => {
                await this._requireLogin(async () => {
                    await this.ticketList.loadAndShow();
                });
            });
        }

        // Create ticket button
        if (dom.btnTicketCreate) {
            dom.btnTicketCreate.addEventListener('click', async () => {
                await this._requireLogin(async () => {
                    await this._showNewTicket();
                });
            });
        }

        // New ticket form submit
        if (dom.newTicketForm) {
            dom.newTicketForm.addEventListener('submit', async (e) => {
                await handleNewTicketSubmit(e, this.ticketService, this.modal);
            });
        }

        // Login form submit
        if (dom.loginForm) {
            dom.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this._handleLoginSubmit();
            });
        }

        // Ticket detail close button
        const closeTicketBtn = document.getElementById('nf_ticketdetail_closebtn');
        if (closeTicketBtn) {
            closeTicketBtn.addEventListener('click', async () => {
                await handleCloseTicket(this.ticketService, this.modal);
            });
        }

        // Gallery controls
        const galleryClose = document.getElementById('nf_gallery_close');
        const galleryPrev = document.getElementById('nf_gallery_prev');
        const galleryNextBtn = document.getElementById('nf_gallery_next');

        if (galleryClose) {
            galleryClose.addEventListener('click', closeGallery);
        }
        if (galleryPrev) {
            galleryPrev.addEventListener('click', galleryPrevious);
        }
        if (galleryNextBtn) {
            galleryNextBtn.addEventListener('click', galleryNext);
        }

        // Modal close handlers (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nf-modal-closebtn')) {
                e.preventDefault();
                const modal = e.target.closest('.nf-ticketdetail-container, .nf-ticketlist-container, .nf-newticket-container, .nf-login-container, .nf-modal-centerbox');
                if (!modal) return;
                
                this.modal.close(modal);
                
                if (modal.classList.contains('nf-ticketdetail-container')) {
                    this.ticketList.show();
                } else if (modal.classList.contains('nf-ticketlist-container')) {
                    this._showStart();
                } else if (modal.classList.contains('nf-newticket-container')) {
                    this._showStart();
                } else if (modal.classList.contains('nf-login-container')) {
                    this._resetLoginState();
                    this._showStart();
                } else if (modal.classList.contains('nf-modal-centerbox')) {
                    this._hideAll();
                }
            }
        });

        // Keyboard handlers
        document.addEventListener('keydown', (e) => {
            this._handleKeyboard(e);
        });

        // Initialize search when DOM is ready
        // Use our knowledge base service instance
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._initializeSearch();
            });
        } else {
            this._initializeSearch();
        }

        // Initialize drag and drop
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initializeDragAndDrop();
            });
        } else {
            initializeDragAndDrop();
        }

        nfLogger.debug('Event handlers set up');
    }

    /**
     * Sets up global event listeners (login, state changes, etc.)
     * @private
     */
    _setupGlobalListeners() {
        // Listen for login events
        eventBus.on('auth:login', (userData) => {
            nfLogger.info('User logged in', { userId: userData.id });
            // Update UI or perform other actions
        });

        eventBus.on('auth:logout', () => {
            nfLogger.info('User logged out');
            this._resetLoginState();
        });

        // Listen for ticket events
        eventBus.on('ticket:created', ({ ticket }) => {
            nfLogger.info('Ticket created', { ticketId: ticket.id });
        });

        eventBus.on('ticket:updated', ({ ticketId }) => {
            nfLogger.info('Ticket updated', { ticketId });
        });

        eventBus.on('ticket:closed', ({ ticketId }) => {
            nfLogger.info('Ticket closed', { ticketId });
        });
    }

    /**
     * Exposes services globally for backward compatibility
     * @private
     */
    _exposeGlobals() {
        // Make services available globally
        if (typeof window !== 'undefined') {
            window.app = this;
            window.ticketService = this.ticketService;
            window.authService = this.authService;
            window.knowledgeBaseService = this.knowledgeBaseService;
            window.cache = this.cache;
            window.modal = this.modal;
            window.ticketList = this.ticketList;
            window.search = this.search;
        }
    }

    /**
     * Shows the start screen
     * @private
     */
    _showStart() {
        nfLogger.debug('Showing start screen');
        // Import UI helpers dynamically
        import('./ui/helpers.js').then(({ hide, show, setLoading }) => {
            hide(dom.ticketListContainer);
            hide(dom.ticketDetailContainer);
            hide(dom.loginContainer);
            hide(dom.newTicketContainer);

            show(dom.start);
            this.modal.open('nf_modal_overlay');
            setLoading(false);
        });
    }

    /**
     * Shows the new ticket form
     * @private
     */
    async _showNewTicket() {
        nfLogger.debug('Showing new ticket form');
        const { hide, show, setLoading } = await import('./ui/helpers.js');
        hide(dom.ticketListContainer);
        hide(dom.ticketDetailContainer);
        hide(dom.loginContainer);

        show(dom.start);
        show(dom.newTicketContainer);
        this.modal.open('nf_new_ticket_container');
        setLoading(false);

        // Load request types if enabled
        if (NF_CONFIG.api.allowRequestType && dom.newTicketRequestType) {
            await this._loadRequestTypes();
        }
    }

    /**
     * Loads and populates request types dropdown
     * @private
     */
    async _loadRequestTypes() {
        try {
            const cacheKey = 'request_types';
            const cache = this.cache;
            const ttl = NF_CONFIG.ui.cache.requestTypeTTL;

            // Check cache first
            let requestTypes = cache.get(cacheKey);
            if (requestTypes) {
                nfLogger.debug('Loaded request types from cache');
                this._populateRequestTypes(requestTypes);
                return;
            }

            // Fetch from API
            const { options, defaultValue } = await this.apiClient.getRequestTypes();
            
            // Cache the results
            cache.set(cacheKey, { options, defaultValue }, ttl);
            
            nfLogger.debug('Loaded request types from API', { count: options.length });
            this._populateRequestTypes({ options, defaultValue });
        } catch (error) {
            nfLogger.error('Failed to load request types', { error: error.message });
            // Don't show error to user, just leave dropdown empty
        }
    }

    /**
     * Populates the request type dropdown
     * @private
     */
    _populateRequestTypes({ options, defaultValue }) {
        if (!dom.newTicketRequestType || !options || options.length === 0) {
            return;
        }

        // Clear all existing options
        const select = dom.newTicketRequestType;
        select.innerHTML = '';
        
        // Always add an empty option first (for "no selection")
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '';
        select.appendChild(emptyOption);

        // Add request type options
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        // Set default value if provided (this will override the empty selection)
        if (defaultValue && defaultValue.trim() !== '') {
            // Verify the default value exists in options
            const defaultExists = options.some(opt => opt.value === defaultValue);
            if (defaultExists) {
                select.value = defaultValue;
            } else {
                nfLogger.warn('Default request type value not found in options', { defaultValue, availableValues: options.map(o => o.value) });
            }
        }
    }

    /**
     * Hides all modals
     * @private
     */
    _hideAll() {
        import('./ui/helpers.js').then(({ hide }) => {
            hide(dom.start);
            hide(dom.ticketListContainer);
            hide(dom.ticketDetailContainer);
            hide(dom.loginContainer);
            hide(dom.newTicketContainer);
        });
    }

    /**
     * Requires login before executing a function
     * @private
     * @param {Function} next - Function to execute after login
     */
    async _requireLogin(next) {
        const userToken = appState.get('userToken');
        const userId = appState.get('userId');
        
        if (userToken && userId) {
            // Ensure API client has the token set before proceeding
            if (this.apiClient) {
                this.apiClient.setAuthToken(userToken);
            }
            next();
            return;
        }
        
        // Show login form
        this._showLogin();
        
        // Wait for login event
        return new Promise((resolve) => {
            const unsubscribe = eventBus.once('auth:login', () => {
                unsubscribe();
                // Ensure API client has the token set after login
                const token = appState.get('userToken');
                if (this.apiClient && token) {
                    this.apiClient.setAuthToken(token);
                }
                next();
                resolve();
            });
        });
    }

    /**
     * Shows the login form
     * @private
     */
    _showLogin() {
        nfLogger.debug('Showing login form');
        import('./ui/helpers.js').then(({ hide, show, setLoading }) => {
            show(dom.start);
            hide(dom.ticketListContainer);
            hide(dom.ticketDetailContainer);
            hide(dom.newTicketContainer);
            
            this.modal.open('nf_login_container');
            setLoading(false);
        });
    }

    /**
     * Handles login form submission
     * @private
     */
    async _handleLoginSubmit() {
        const username = dom.loginUser?.value?.trim();
        const password = dom.loginPass?.value?.trim();

        if (!username || !password) {
            import('./ui/status.js').then(({ showStatus }) => {
                showStatus('Please enter both username and password', 'error', 'login');
            });
            return;
        }

        import('./ui/helpers.js').then(({ setLoading }) => {
            setLoading(true);
        });

        try {
            await this.authService.authenticate(username, password);
            
            // Login successful - close login modal and hide form (synchronously)
            // Note: The auth:login event is fired by AuthService.authenticate()
            // We need to close the modal before the callback in _requireLogin runs
            const { hide, setLoading } = await import('./ui/helpers.js');
            this.modal.close('nf_login_container');
            hide(dom.loginContainer);
            setLoading(false);
            
            nfLogger.info('Login successful');
            
        } catch (error) {
            nfLogger.error('Login failed', { error });
            
            import('./ui/status.js').then(({ showStatus }) => {
                showStatus(error.message || 'Login failed', 'error', 'login');
            });
            
            import('./ui/helpers.js').then(({ setLoading }) => {
                setLoading(false);
            });
        }
    }

    /**
     * Resets login state
     * @private
     */
    _resetLoginState() {
        const isAccountLocked = appState.get('isAccountLocked') || false;
        if (!isAccountLocked) {
            appState.set('loginAttempts', 0);
        }
        
        // Clear form contents
        if (dom.loginForm) {
            dom.loginForm.reset();
        }
    }

    /**
     * Initializes search functionality
     * @private
     */
    _initializeSearch() {
        if (!this.knowledgeBaseService) {
            nfLogger.warn('Knowledge base service not available for search initialization');
            return;
        }
        
        this.search = new KnowledgeBaseSearch(this.knowledgeBaseService);
        this.search.initialize();
        nfLogger.debug('Search initialized');
    }

    /**
     * Handles keyboard events
     * @private
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeyboard(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            
            // Priority 1: Gallery
            const galleryOverlay = document.getElementById('nf_gallery_overlay');
            if (galleryOverlay && galleryOverlay.classList.contains('nf-gallery-active')) {
                closeGallery();
                return;
            }
            
            // Priority 2: Search dropdown
            if (dom.searchDropdown && dom.searchDropdown.style.display === 'block') {
                if (this.search) {
                    this.search.hideSearchDropdown();
                } else {
                    nfHideSearchDropdown();
                }
                return;
            }
            
            // Priority 3: Close current modal
            const activeModal = document.querySelector('.nf-modal-overlay:not(.nf-hidden), .nf-ticketlist-container:not(.nf-hidden), .nf-ticketdetail-container:not(.nf-hidden), .nf-newticket-container:not(.nf-hidden), .nf-login-container:not(.nf-hidden)');
            if (activeModal) {
                this.modal.close(activeModal);
                if (activeModal.classList.contains('nf-ticketdetail-container')) {
                    this.ticketList.show();
                } else if (activeModal.classList.contains('nf-ticketlist-container')) {
                    this._showStart();
                } else {
                    this._showStart();
                }
            }
        }
    }
}

// Create singleton instance
const app = new App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for language system to be ready
        window.addEventListener('nfLanguageReady', () => {
            app.init();
        });
    });
} else {
    // DOM already loaded - wait for language system
    window.addEventListener('nfLanguageReady', () => {
        app.init();
    });
}

// Make available globally
if (typeof window !== 'undefined') {
    window.app = app;
}

export default app;

