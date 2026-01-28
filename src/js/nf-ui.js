// Author: Daniel Könning
// ===============================
// nf-ui.js - UI control and navigation
// ===============================
// This file manages navigation between different views
// of the ticket frontend and controls the modal system with overlays.

// ===============================
// SHOW MAIN MENU
// ===============================

/**
 * Shows the main menu (start screen) and hides all other containers
 * Resets the UI state to the start page
 */
function nfShowStart() {
    nfOpenModal('nf_modal_overlay');
    nfShow(nf.start);                 // Show main menu
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // ===============================
    // EVENT HANDLER CLEANUP
    // ===============================
    // Clean up login handlers when login modal is closed
    nfCleanupLoginHandlers();
    
    // ===============================
    // REMOVE BLUR EFFECT
    // ===============================
    // Remove blur effect as main menu is in the foreground
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox) modalCenterbox.classList.remove('nf-blur-bg');
    
    // Remove blur effect from ticket list
    const ticketListContainer = document.querySelector('.nf-ticketlist-container');
    if (ticketListContainer) ticketListContainer.classList.remove('nf-blur-bg');
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after main menu is shown
    nfSetLoading(false);
}

// ===============================
// SHOW TICKET LIST
// ===============================

/**
 * Shows the ticket list with main menu in the background
 * Implements layered modal system with blur effect
 */
function nfShowTicketList() {
    nfOpenModal('nf_ticketlist_container');
    nfShow(nf.start);                 // Show main menu in background
    nfShow(nf.ticketListContainer);   // Show ticket list in foreground
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // ===============================
    // BACKGROUND BLUR FOR LAYER SYSTEM
    // ===============================
    // Apply blur effect to main menu in background
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox && !modalCenterbox.classList.contains('nf-blur-bg')) {
        modalCenterbox.classList.add('nf-blur-bg');
    }
    
    // Remove blur effect from ticket list (if returning from details)
    const ticketListContainer = document.querySelector('.nf-ticketlist-container');
    if (ticketListContainer) ticketListContainer.classList.remove('nf-blur-bg');
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after ticket list is shown
    nfSetLoading(false);
}

// ===============================
// SHOW TICKET DETAILS
// ===============================

/**
 * Shows the ticket details with nested background modals
 * Implements three-layer modal system: Details > List > Main menu
 */
function nfShowTicketDetail() {
    nfOpenModal('nf_ticketdetail_container');
    nfShow(nf.start);                 // Show main menu in background
    nfShow(nf.ticketListContainer);   // Show ticket list in middle layer
    nfShow(nf.ticketDetailContainer); // Show ticket details in foreground
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // ===============================
    // BACKGROUND BLUR FOR DEEP NAVIGATION
    // ===============================
    // Blur background elements for visual separation
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox && !modalCenterbox.classList.contains('nf-blur-bg')) {
        modalCenterbox.classList.add('nf-blur-bg');
    }
    // Also blur the ticket list
    const ticketListContainer = document.querySelector('.nf-ticketlist-container');
    if (ticketListContainer && !ticketListContainer.classList.contains('nf-blur-bg')) {
        ticketListContainer.classList.add('nf-blur-bg');
    }
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after ticket details are shown
    nfSetLoading(false);
}

// ===============================
// SHOW LOGIN FORM
// ===============================

/**
 * Shows the login form with main menu in the background
 * Used for authentication before protected actions
 */
function nfShowLogin() {
    nfOpenModal('nf_login_container');
    nfShow(nf.start);                 // Show main menu in background
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfShow(nf.loginContainer);        // Show login form in foreground
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // ===============================
    // MANAGE LOGIN HINTS AND STATE
    // ===============================
    nfUpdateLoginDisplay();
    
    // ===============================
    // BACKGROUND BLUR FOR LOGIN FOCUS
    // ===============================
    // Blur main menu for better focus on login
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox && !modalCenterbox.classList.contains('nf-blur-bg')) {
        modalCenterbox.classList.add('nf-blur-bg');
    }
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after login form is shown
    nfSetLoading(false);
}

// ===============================
// UPDATE LOGIN DISPLAY
// ===============================

/**
 * Updates the display of the login form based on the current state
 * Shows hints, warnings, or lockout messages as appropriate
 */
function showLockoutMessage() {
    const lockoutMessage = window.NF_CONFIG?.ui?.login?.lockoutMessage || 'Account locked. Please contact support.';
    if (nf.loginLockout) {
        nf.loginLockout.textContent = lockoutMessage;
        nfShow(nf.loginLockout);
    }
    nfHide(nf.loginHint);
    nfHide(nf.loginWarning);
    nf.loginSubmit.disabled = true;
}

function showNormalLoginDisplay() {
    nfHide(nf.loginLockout);
    nf.loginSubmit.disabled = false;
    const credentialsHint = (window.NF_CONFIG?.currentLanguage === 'de')
        ? window.NF_CONFIG?.ui?.login_de?.credentialsHint
        : window.NF_CONFIG?.ui?.login?.credentialsHint;
    if (credentialsHint && nf.loginHint) {
        nf.loginHint.textContent = credentialsHint;
        nfShow(nf.loginHint);
    } else {
        nfHide(nf.loginHint);
    }
}

function showAttemptsWarning() {
    const maxAttempts = window.NF_CONFIG?.ui?.login?.maxAttempts || 3;
    const remaining = maxAttempts - nf._loginAttempts;
    if (remaining > 0) {
        const attemptsTemplate = window.NF_CONFIG?.ui?.login?.attemptsWarningTemplate || 'Error! Is the username/password correct?';
        const warningMessage = attemptsTemplate.replace('{remaining}', remaining);
        if (nf.loginWarning) {
            nf.loginWarning.textContent = warningMessage;
            nfShow(nf.loginWarning);
        }
    }
}

function nfUpdateLoginDisplay() {
    if (!nf.loginContainer || !nf.loginHint || !nf.loginWarning || !nf.loginLockout || !nf.loginSubmit) return;
    if (nf._isAccountLocked) {
        showLockoutMessage();
        return;
    }
    showNormalLoginDisplay();
    if (nf._loginAttempts > 0) {
        showAttemptsWarning();
    } else {
        nfHide(nf.loginWarning);
    }
}

// ===============================
// HIDE ALL MODALS
// ===============================

/**
 * Hides all modals and overlays and resets the UI
 * Used for a complete reset of the user interface
 */
function nfHideAll() {
    nfHide(nf.overlay);               // Hide overlay (closes modal system)
    nfHide(nf.start);                 // Hide main menu
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    // ===============================
    // EVENT HANDLER CLEANUP
    // ===============================
    // Clean up login handlers on complete close
    nfCleanupLoginHandlers();
    // ===============================
    // REMOVE ALL BLUR EFFECTS
    // ===============================
    // Remove all visual effects for a clean reset
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox) modalCenterbox.classList.remove('nf-blur-bg');
    // Remove blur effect from ticket list
    const ticketListContainer = document.querySelector('.nf-ticketlist-container');
    if (ticketListContainer) ticketListContainer.classList.remove('nf-blur-bg');
    // Focus back on trigger button
    const trigger = document.getElementById('nf-zammad-trigger');
    if (trigger) trigger.focus();
    // Reset aria attributes
    const ids = [
        'nf_modal_overlay',
        'nf_ticketlist_container',
        'nf_ticketdetail_container',
        'nf_gallery_overlay',
        'nf_login_container',
        'nf_new_ticket_container'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('aria-hidden', 'true');
    });
    // Make main content accessible again
    const mainContent = document.querySelector('body > :not(.nf-modal-overlay):not(.nf-ticketlist-container):not(.nf-ticketdetail-container):not(.nf-gallery-overlay):not(.nf-login-container):not(.nf-newticket-container)');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'false');
}

// ===============================
// SHOW NEW TICKET FORM
// ===============================

/**
 * Shows the form for a new ticket with main menu in the background
 * Allows users to create new support requests
 */
function nfShowNewTicket() {
    nfOpenModal('nf_new_ticket_container');
    nfShow(nf.start);                 // Show main menu in background
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfShow(nf.newTicketContainer);    // Show new ticket form in foreground
    
    // ===============================
    // BACKGROUND BLUR FOR FORM FOCUS
    // ===============================
    // Blur main menu for better focus on form
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox && !modalCenterbox.classList.contains('nf-blur-bg')) {
        modalCenterbox.classList.add('nf-blur-bg');
    }
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after form is shown
    nfSetLoading(false);
}

// ===============================
// AUTHENTICATION REQUIRED - WRAPPER FUNCTION
// ===============================

/**
 * Ensures that the user is logged in before executing an action
 * Implements automatic login redirection and seamless navigation
 * 
 * @param {Function} next - Callback function to be executed after successful login
 */
function handleLoginSuccess(next) {
    nfHide(nf.loginContainer);
    const modalCenterbox = document.querySelector('.nf-modal-centerbox');
    if (modalCenterbox) modalCenterbox.classList.remove('nf-blur-bg');
    const ticketListContainer = document.querySelector('.nf-ticketlist-container');
    if (ticketListContainer) ticketListContainer.classList.remove('nf-blur-bg');
    nfCleanupLoginHandlers();
    next();
}

function handleLoginError(error) {
    nfUpdateLoginDisplay();
    if (error.code === 'ACCOUNT_LOCKED') {
        nfShowStatus(error.message, 'error', 'login');
        nfCleanupLoginHandlers();
    } else if (error.code === 'INVALID_CREDENTIALS' && error.attemptsWarning) {
        nfShowStatus(error.message, 'error', 'login');
    } else {
        nfShowStatus(error.message || 'Login failed', 'error', 'login');
    }
    nfSetLoading(false);
}

function nfRequireLogin(next) {
    if (nf.userToken && nf.userId) { next(); return; }
    nfShowLogin();
    nfCleanupLoginHandlers();
    const handler = async (e) => {
        e.preventDefault();
        nfSetLoading(true);
        const username = nf.loginUser.value;
        const password = nf.loginPass.value;
        try {
            await nfAuthenticateUser(username, password);
            handleLoginSuccess(next);
        } catch (error) {
            handleLoginError(error);
        }
    };
    nf._currentLoginHandler = handler;
    nf.loginForm.addEventListener('submit', handler);
}

// ===============================
// HELPER FUNCTIONS FOR LOGIN HANDLER MANAGEMENT
// ===============================

/**
 * Cleans up all login event handlers to avoid duplicates
 * Prevents accumulation of event handlers during multiple login attempts
 */
function nfCleanupLoginHandlers() {
    // Remove saved handler if present
    if (nf._currentLoginHandler && nf.loginForm) {
        nf.loginForm.removeEventListener('submit', nf._currentLoginHandler);
        nf._currentLoginHandler = null;
    }
}

// ===============================
// RESET LOGIN STATE
// ===============================

/**
 * Resets the login state completely (except account locking)
 * Called when closing the login modal
 */
function nfResetLoginState() {
    // Clean up event handlers
    nfCleanupLoginHandlers();
    
    // Reset login attempts only if the account is not locked
    // (Lock remains until the next successful login)
    if (!nf._isAccountLocked) {
        nf._loginAttempts = 0;
    }
    
    // Clear form contents for security
    if (nf.loginForm) {
        nf.loginForm.reset();
    }
}

// ===============================
// HELPER FUNCTIONS FOR MODAL SYSTEM
// ===============================

// Helper function: Set focus on the first interactive element in the modal
function nfFocusFirstElement(modal) {
    // No autofocus on anything when opening
    return;
}
// Helper function: Focus trap for modals
function nfTrapFocus(modal) {
    if (!modal) return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    modal.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
        if (e.key === 'Escape') {
            nfHideAll();
        }
    });
}
// Lock background for screen readers as long as modal is open
function nfSetAriaHiddenExcept(modalId) {
    const ids = [
        'nf_modal_overlay',
        'nf_ticketlist_container',
        'nf_ticketdetail_container',
        'nf_gallery_overlay',
        'nf_login_container',
        'nf_new_ticket_container'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === modalId) {
                el.setAttribute('aria-hidden', 'false');
            } else {
                el.setAttribute('aria-hidden', 'true');
            }
        }
    });
    // Additionally hide main content outside the modals
    const mainContent = document.querySelector('body > :not(.nf-modal-overlay):not(.nf-ticketlist-container):not(.nf-ticketdetail-container):not(.nf-gallery-overlay):not(.nf-login-container):not(.nf-newticket-container)');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
}
// When opening a modal, set focus, activate aria attributes, and focus trap
function nfOpenModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('nf-hidden');
        modal.setAttribute('aria-hidden', 'false');
        nfFocusFirstElement(modal);
        nfTrapFocus(modal);
        nfSetAriaHiddenExcept(modalId);
    }
}
