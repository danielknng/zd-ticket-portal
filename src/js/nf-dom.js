/**
 * @fileoverview DOM selectors and UI references for the ticket system
 * @author danielknng
 * @module NFDom
 * @since 2025-07-15
 * @version 1.0.0
 */

/**
 * Returns the base URL for the Zammad API from configuration
 * @function ZAMMAD_API_URL
 * @returns {string|undefined} The API base URL or undefined if config not loaded
 */
const ZAMMAD_API_URL = () => window.NF_CONFIG?.api?.baseUrl;

/**
 * Central DOM object containing all UI element references and application state.
 * Provides unified access to all HTML elements and state variables across modules.
 * 
 * @namespace nf
 * @property {string|null} userToken - JWT token after successful login
 * @property {string|null} userId - Unique user ID after successful login
 * @property {HTMLElement} trigger - Button/element to open the ticket system
 * @property {HTMLElement} overlay - Background overlay for modal dialogs
 * @property {HTMLElement} start - Main container for the central dialog
 * @property {Object} templates - HTML templates for dynamic content generation
 */
const nf = {
    /**
     * Authentication state properties
     * @namespace nf.auth
     * @property {string|null} userToken - JWT token for API authentication
     * @property {string|null} userId - Unique user identifier for permissions
     */
    userToken: null, // JWT token after successful login - used for API requests
    userId: null,    // Unique user ID after successful login - for permissions
    
    /**
     * Main UI container elements
     * @namespace nf.ui
     * @property {HTMLElement} trigger - Primary trigger button for opening ticket system
     * @property {HTMLElement} overlay - Modal background overlay
     * @property {HTMLElement} start - Main dialog container
     */
    trigger: document.getElementById('nf-zammad-trigger'),    // Button/element to open the ticket system
    overlay: document.getElementById('nf_modal_overlay'),     // Background overlay for modal dialogs
    start: document.querySelector('.nf-modal-centerbox'),    // Main container for the central dialog

    /**
     * Ticket list view elements for overview and navigation
     * @namespace nf.ticketList
     * @property {HTMLElement} btnTicketCreate - Create new ticket button
     * @property {HTMLElement} btnTicketView - View tickets button  
     * @property {HTMLElement} ticketListContainer - Main ticket list container
     * @property {HTMLElement} ticketListTable - Ticket display table
     * @property {HTMLElement} ticketListBody - Table body for ticket rows
     * @property {HTMLElement} ticketListEmpty - Empty list message element
     * @property {HTMLElement} btnBackStart - Back to main menu button
     */
    btnTicketCreate: document.getElementById('nf_btn_ticketcreate'), // Button "Create new ticket"
    btnTicketView: document.getElementById('nf_btn_ticketview'),     // Button "View tickets"
    ticketListContainer: document.getElementById('nf_ticketlist_container'), // Container for the complete ticket list
    ticketListTable: document.getElementById('nf_ticketlist_table'),         // Table element for ticket display
    ticketListBody: document.getElementById('nf_ticketlist_body'),           // Tbody element for ticket rows
    ticketListEmpty: document.getElementById('nf_ticketlist_empty'),         // Empty list message
    btnBackStart: document.getElementById('nf_btn_back_start'),              // Back button to main menu

    /**
     * Ticket detail view elements for individual ticket display and interaction
     * @namespace nf.ticketDetail
     * @property {HTMLElement} ticketDetailContainer - Main ticket detail container
     * @property {HTMLElement} ticketDetailHeader - Ticket header information area
     * @property {HTMLElement} ticketDetailTitle - Ticket title/subject display
     * @property {HTMLElement} ticketDetailStatus - Status indicator element
     * @property {HTMLElement} ticketDetailMeta - Meta information container
     * @property {HTMLElement} ticketDetailMessages - Messages/replies container
     * @property {HTMLElement} ticketDetailReplyBox - Reply input container
     * @property {HTMLElement} ticketDetailReplyInput - Reply text input field
     * @property {HTMLElement} ticketDetailReplyBtn - Send reply button
     * @property {HTMLElement} ticketDetailAttachBtn - Attach files button
     * @property {HTMLElement} ticketDetailAttachment - File input element
     * @property {HTMLElement} ticketDetailFilePreview - File preview container
     * @property {HTMLElement} ticketDetailFilePreviewList - File preview list
     * @property {HTMLElement} btnBackList - Back to ticket list button
     */
    ticketDetailContainer: document.getElementById('nf_ticketdetail_container'), // Main container for ticket details
    ticketDetailHeader: document.getElementById('nf_ticketdetail_header'),       // Header area with ticket info
    ticketDetailTitle: document.getElementById('nf_ticketdetail_title'),         // Ticket title/subject
    ticketDetailStatus: document.getElementById('nf_ticketdetail_status'),       // Status display (open, closed, etc.)
    ticketDetailMeta: document.getElementById('nf_ticketdetail_meta'),           // Meta information (date, priority, etc.)
    ticketDetailMessages: document.getElementById('nf_ticketdetail_messages'),   // Container for all messages/replies
    ticketDetailReplyBox: document.getElementById('nf_ticketdetail_replybox'),   // Container for reply input
    ticketDetailReplyInput: document.getElementById('nf_ticketdetail_replyinput'), // Text field for new reply
    ticketDetailReplyBtn: document.getElementById('nf_ticketdetail_replybtn'),   // Button "Send reply"
    ticketDetailAttachBtn: document.getElementById('nf_ticketdetail_attachbtn'), // Button "Attach files"
    ticketDetailAttachment: document.getElementById('nf_ticketdetail_attachment'), // File input for reply attachments
    ticketDetailFilePreview: document.getElementById('nf_ticketdetail_filepreview'), // Container for reply file preview
    ticketDetailFilePreviewList: document.getElementById('nf_ticketdetail_filepreview_list'), // List of reply file previews
    btnBackList: document.getElementById('nf_btn_back_list'),                    // Back button to ticket list

    /**
     * Status and loader elements for user feedback
     * @namespace nf.status
     * @property {HTMLElement} statusMsg - General status messages container
     * @property {HTMLElement} loader - Loading spinner animation element
     */
    statusMsg: document.getElementById('nf_status_msg'),  // Container for general status messages
    loader: document.getElementById('nf_loader'),        // Loader/spinner animation

    /**
     * Filter and search elements for data filtering and searching
     * @namespace nf.filter
     * @property {HTMLElement} filterStatus - Status filter dropdown
     * @property {HTMLElement} sort - Sort options dropdown  
     * @property {HTMLElement} searchInput - Search terms input field
     * @property {HTMLElement} searchDropdown - Search suggestions dropdown
     */
    filterStatus: document.getElementById('nf_filter_status'),    // Dropdown for status filter (open, closed, etc.)
    sort: document.getElementById('nf_sort'),                    // Dropdown for sort options (date, priority, etc.)
    searchInput: document.getElementById('nf_search_input'),     // Input field for search terms
    searchDropdown: document.getElementById('nf_search_dropdown'), // Dropdown with search suggestions/results

    /**
     * Login authentication elements and state tracking
     * @namespace nf.login
     * @property {HTMLElement} loginContainer - Complete login dialog container
     * @property {HTMLElement} loginForm - Login form element
     * @property {HTMLElement} loginUser - Username/email input field
     * @property {HTMLElement} loginPass - Password input field
     * @property {HTMLElement} loginHint - Windows credentials hint element
     * @property {HTMLElement} loginWarning - Login attempts warning element
     * @property {HTMLElement} loginLockout - Account lockout message element
     * @property {HTMLElement} loginSubmit - Login submit button
     */
    loginContainer: document.getElementById('nf_login_container'), // Container for complete login dialog
    loginForm: document.getElementById('nf_login_form'),          // Form element for login data
    loginUser: document.getElementById('nf_login_user'),          // Input field for username/email
    loginPass: document.getElementById('nf_login_pass'),          // Input field for password
    loginHint: document.getElementById('nf_login_hint'),          // Hint element for Windows credentials
    loginWarning: document.getElementById('nf_login_warning'),    // Warning for remaining attempts
    loginLockout: document.getElementById('nf_login_lockout'),    // Lockout message
    loginSubmit: document.getElementById('nf_login_submit'),      // Submit button for login
    
    /**
     * Login attempt tracking properties
     * @namespace nf.loginState
     * @property {number} _loginAttempts - Counter for failed login attempts
     * @property {boolean} _isAccountLocked - Account lockout status flag
     */
    _loginAttempts: 0,  // Counter for failed login attempts
    _isAccountLocked: false,  // Flag if account is locked

    /**
     * New ticket creation form elements
     * @namespace nf.newTicket
     * @property {HTMLElement} newTicketContainer - Complete ticket form container
     * @property {HTMLElement} newTicketForm - Ticket creation form element
     * @property {HTMLElement} newTicketSubject - Ticket subject input field
     * @property {HTMLElement} newTicketBody - Ticket description textarea
     * @property {HTMLElement} newTicketAttachment - File upload input
     * @property {HTMLElement} filePreviewContainer - File preview container
     * @property {HTMLElement} filePreviewList - File preview list element
     */
    newTicketContainer: document.getElementById('nf_new_ticket_container'), // Container for complete ticket form
    newTicketForm: document.getElementById('nf_new_ticket_form'),           // Form element for ticket data
    newTicketRequestType: document.getElementById('nf_new_ticket_requesttype'), // Select for ticket request type
    newTicketSubject: document.getElementById('nf_new_ticket_subject'),     // Input field for ticket subject
    newTicketBody: document.getElementById('nf_new_ticket_body'),           // Textarea for ticket description
    newTicketAttachment: document.getElementById('nf_new_ticket_attachment'), // File upload for attachments
    filePreviewContainer: document.getElementById('nf_file_preview_container'), // Container for file preview
    filePreviewList: document.getElementById('nf_file_preview_list'),       // List of file previews

    /**
     * Dialog close buttons for various modal windows
     * @namespace nf.closeButtons
     * @property {HTMLElement} closeBtnMain - Main dialog close button
     * @property {HTMLElement} closeBtnTicketList - Ticket list close button
     * @property {HTMLElement} closeBtnTicketDetail - Ticket detail close button
     * @property {HTMLElement} closeBtnLogin - Login dialog close button
     * @property {HTMLElement} closeBtnNewTicket - New ticket dialog close button
     * @property {HTMLElement} btnCancelNewTicket - New ticket form cancel button
     */
    closeBtnMain: document.getElementById('nf_modal_closebtn_main'),           // X button for main dialog
    closeBtnTicketList: document.getElementById('nf_modal_closebtn_ticketlist'), // X button for ticket list
    closeBtnTicketDetail: document.getElementById('nf_modal_closebtn_ticketdetail'), // X button for ticket details
    closeBtnLogin: document.getElementById('nf_modal_closebtn_login'),         // X button for login dialog
    closeBtnNewTicket: document.getElementById('nf_modal_closebtn_newticket'), // X button for new ticket dialog
    btnCancelNewTicket: document.getElementById('nf_btn_cancel_newticket'),    // Cancel button in ticket form

    /**
     * HTML templates for dynamic content generation
     * @namespace nf.templates
     * @property {HTMLElement} ticketListRow - Template for ticket rows in list view
     * @property {HTMLElement} ticketDetailHeader - Template for ticket detail headers
     * @property {HTMLElement} ticketDetailMessage - Template for individual messages
     * @property {HTMLElement} searchResult - Template for search result items
     */
    templates: {
        ticketListRow: document.getElementById('nf_ticketlist_row_template'),       // Template for ticket row in list
        ticketDetailHeader: document.getElementById('nf_ticketdetail_header_template'), // Template for ticket detail header
        ticketDetailMessage: document.getElementById('nf_ticketdetail_message_template'), // Template for single messages
        searchResult: document.getElementById('nf_search_result_template')          // Template for search results
    }
};

export { nf, ZAMMAD_API_URL };
