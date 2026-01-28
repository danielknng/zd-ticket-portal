// Author: Daniel Könning
// ===============================
// nf-dom.js - DOM selectors and UI references
// ===============================
// This file contains all DOM selectors and the global nf object.
// It provides the foundation for all UI interactions and central
// references to all HTML elements.

// ===============================
// API CONFIGURATION
// ===============================
// Base URL for the Zammad API - uses config from nf-config.js if available
const ZAMMAD_API_URL = window.NF_CONFIG?.api?.baseUrl;

// ===============================
// GLOBAL NF OBJECT - CENTRAL STATE STORE
// ===============================
// The 'nf' object is the central container for all DOM references,
// state variables, and templates. It enables unified access to all UI elements from all modules.
const nf = {
    // ===============================
    // AUTHENTICATION STATE
    // ===============================
    userToken: null, // JWT token after successful login - used for API requests
    userId: null,    // Unique user ID after successful login - for permissions
    
    // ===============================
    // MAIN UI ELEMENTS
    // ===============================
    // These elements form the basic structure of the user interface
    trigger: document.getElementById('nf-zammad-trigger'),    // Button/element to open the ticket system
    overlay: document.getElementById('nf_modal_overlay'),     // Background overlay for modal dialogs
    start: document.querySelector('.nf-modal-centerbox'),    // Main container for the central dialog

    // ===============================
    // TICKET LIST ELEMENTS (Overview page)
    // ===============================
    // All DOM references for the ticket overview and navigation
    btnTicketCreate: document.getElementById('nf_btn_ticketcreate'), // Button "Create new ticket"
    btnTicketView: document.getElementById('nf_btn_ticketview'),     // Button "View tickets"
    ticketListContainer: document.getElementById('nf_ticketlist_container'), // Container for the complete ticket list
    ticketListTable: document.getElementById('nf_ticketlist_table'),         // Table element for ticket display
    ticketListBody: document.getElementById('nf_ticketlist_body'),           // Tbody element for ticket rows
    ticketListEmpty: document.getElementById('nf_ticketlist_empty'),         // Empty list message
    btnBackStart: document.getElementById('nf_btn_back_start'),              // Back button to main menu

    // ===============================
    // TICKET DETAIL ELEMENTS (Detail view)
    // ===============================
    // All DOM references for the detailed ticket view
    ticketDetailContainer: document.getElementById('nf_ticketdetail_container'), // Main container for ticket details
    ticketDetailHeader: document.getElementById('nf_ticketdetail_header'),       // Header area with ticket info
    ticketDetailTitle: document.getElementById('nf_ticketdetail_title'),         // Ticket title/subject
    ticketDetailStatus: document.getElementById('nf_ticketdetail_status'),       // Status display (open, closed, etc.)
    ticketDetailMeta: document.getElementById('nf_ticketdetail_meta'),           // Meta information (date, priority, etc.)
    ticketDetailMessages: document.getElementById('nf_ticketdetail_messages'),   // Container for all messages/replies
    ticketDetailReplyBox: document.getElementById('nf_ticketdetail_replybox'),   // Container for reply input
    ticketDetailReplyInput: document.getElementById('nf_ticketdetail_replyinput'), // Text field for new reply
    ticketDetailReplyBtn: document.getElementById('nf_ticketdetail_replybtn'),   // Button "Send reply"
    btnBackList: document.getElementById('nf_btn_back_list'),                    // Back button to ticket list

    // ===============================
    // STATUS & LOADER ELEMENTS (User feedback)
    // ===============================
    // Elements for loading indicators and status messages
    statusMsg: document.getElementById('nf_status_msg'),  // Container for general status messages
    loader: document.getElementById('nf_loader'),        // Loader/spinner animation

    // ===============================
    // FILTER & SEARCH ELEMENTS (Data filtering)
    // ===============================
    // UI elements for filtering and searching in the ticket list
    filterStatus: document.getElementById('nf_filter_status'),    // Dropdown for status filter (open, closed, etc.)
    sort: document.getElementById('nf_sort'),                    // Dropdown for sort options (date, priority, etc.)
    searchInput: document.getElementById('nf_search_input'),     // Input field for search terms
    searchDropdown: document.getElementById('nf_search_dropdown'), // Dropdown with search suggestions/results

    // ===============================
    // LOGIN ELEMENTS (Authentication)
    // ===============================
    // All elements for the login dialog
    loginContainer: document.getElementById('nf_login_container'), // Container for complete login dialog
    loginForm: document.getElementById('nf_login_form'),          // Form element for login data
    loginUser: document.getElementById('nf_login_user'),          // Input field for username/email
    loginPass: document.getElementById('nf_login_pass'),          // Input field for password
    loginHint: document.getElementById('nf_login_hint'),          // Hint element for Windows credentials
    loginWarning: document.getElementById('nf_login_warning'),    // Warning for remaining attempts
    loginLockout: document.getElementById('nf_login_lockout'),    // Lockout message
    loginSubmit: document.getElementById('nf_login_submit'),      // Submit button for login
    
    // ===============================
    // LOGIN ATTEMPT TRACKING
    // ===============================
    _loginAttempts: 0,  // Counter for failed login attempts
    _isAccountLocked: false,  // Flag if account is locked

    // ===============================
    // NEW TICKET FORM (Ticket creation)
    // ===============================
    // All elements for creating new tickets
    newTicketContainer: document.getElementById('nf_new_ticket_container'), // Container for complete ticket form
    newTicketForm: document.getElementById('nf_new_ticket_form'),           // Form element for ticket data
    newTicketSubject: document.getElementById('nf_new_ticket_subject'),     // Input field for ticket subject
    newTicketBody: document.getElementById('nf_new_ticket_body'),           // Textarea for ticket description
    newTicketAttachment: document.getElementById('nf_new_ticket_attachment'), // File upload for attachments
    filePreviewContainer: document.getElementById('nf_file_preview_container'), // Container for file preview
    filePreviewList: document.getElementById('nf_file_preview_list'),       // List of file previews

    // ===============================
    // CLOSE BUTTONS (Dialog closing)
    // ===============================
    // All close buttons for various dialogs (X buttons & cancel buttons)
    closeBtnMain: document.getElementById('nf_modal_closebtn_main'),           // X button for main dialog
    closeBtnTicketList: document.getElementById('nf_modal_closebtn_ticketlist'), // X button for ticket list
    closeBtnTicketDetail: document.getElementById('nf_modal_closebtn_ticketdetail'), // X button for ticket details
    closeBtnLogin: document.getElementById('nf_modal_closebtn_login'),         // X button for login dialog
    closeBtnNewTicket: document.getElementById('nf_modal_closebtn_newticket'), // X button for new ticket dialog
    btnCancelNewTicket: document.getElementById('nf_btn_cancel_newticket'),    // Cancel button in ticket form

    // ===============================
    // TEMPLATES (HTML templates for dynamic content)
    // ===============================
    // Hidden DOM elements used as templates for dynamically generated content
    templates: {
        ticketListRow: document.getElementById('nf_ticketlist_row_template'),       // Template for ticket row in list
        ticketDetailHeader: document.getElementById('nf_ticketdetail_header_template'), // Template for ticket detail header
        ticketDetailMessage: document.getElementById('nf_ticketdetail_message_template'), // Template for single messages
        searchResult: document.getElementById('nf_search_result_template')          // Template for search results
    }
};
