/**
 * @fileoverview DOM selectors and UI references for the ticket system
 * @author danielknng
 * @module ui/dom
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from '../core/config.js';

/**
 * Memoized API base URL to avoid repeated config lookups
 * @type {string|undefined}
 */
let _cachedApiUrl = undefined;

/**
 * Returns the base URL for the Zammad API from configuration (memoized)
 * @function ZAMMAD_API_URL
 * @returns {string|undefined} The API base URL or undefined if config not loaded
 */
export const ZAMMAD_API_URL = () => {
    if (_cachedApiUrl === undefined) {
        _cachedApiUrl = NF_CONFIG?.api?.baseUrl;
    }
    return _cachedApiUrl;
};

/**
 * Central DOM object containing all UI element references and application state.
 * Provides unified access to all HTML elements and state variables across modules.
 * 
 * @namespace dom
 */
export const dom = {
    /**
     * Main UI container elements
     * @namespace dom.ui
     */
    trigger: document.getElementById('nf-zammad-trigger'),
    overlay: document.getElementById('nf_modal_overlay'),
    start: document.querySelector('.nf-modal-centerbox'),

    /**
     * Ticket list view elements
     * @namespace dom.ticketList
     */
    btnTicketCreate: document.getElementById('nf_btn_ticketcreate'),
    btnTicketView: document.getElementById('nf_btn_ticketview'),
    ticketListContainer: document.getElementById('nf_ticketlist_container'),
    ticketListTable: document.getElementById('nf_ticketlist_table'),
    ticketListBody: document.getElementById('nf_ticketlist_body'),
    ticketListEmpty: document.getElementById('nf_ticketlist_empty'),
    btnBackStart: document.getElementById('nf_btn_back_start'),

    /**
     * Ticket detail view elements
     * @namespace dom.ticketDetail
     */
    ticketDetailContainer: document.getElementById('nf_ticketdetail_container'),
    ticketDetailHeader: document.getElementById('nf_ticketdetail_header'),
    ticketDetailTitle: document.getElementById('nf_ticketdetail_title'),
    ticketDetailStatus: document.getElementById('nf_ticketdetail_status'),
    ticketDetailMeta: document.getElementById('nf_ticketdetail_meta'),
    ticketDetailMessages: document.getElementById('nf_ticketdetail_messages'),
    ticketDetailReplyBox: document.getElementById('nf_ticketdetail_replybox'),
    ticketDetailReplyInput: document.getElementById('nf_ticketdetail_replyinput'),
    ticketDetailReplyBtn: document.getElementById('nf_ticketdetail_replybtn'),
    ticketDetailAttachBtn: document.getElementById('nf_ticketdetail_attachbtn'),
    ticketDetailAttachment: document.getElementById('nf_ticketdetail_attachment'),
    ticketDetailFilePreview: document.getElementById('nf_ticketdetail_filepreview'),
    ticketDetailFilePreviewList: document.getElementById('nf_ticketdetail_filepreview_list'),
    btnBackList: document.getElementById('nf_btn_back_list'),

    /**
     * Status and loader elements
     * @namespace dom.status
     */
    statusMsg: document.getElementById('nf_status_msg'),
    loader: document.getElementById('nf_loader'),

    /**
     * Filter and search elements
     * @namespace dom.filter
     */
    filterStatus: document.getElementById('nf_filter_status'),
    sort: document.getElementById('nf_sort'),
    searchInput: document.getElementById('nf_search_input'),
    searchDropdown: document.getElementById('nf_search_dropdown'),

    /**
     * Login authentication elements
     * @namespace dom.login
     */
    loginContainer: document.getElementById('nf_login_container'),
    loginForm: document.getElementById('nf_login_form'),
    loginUser: document.getElementById('nf_login_user'),
    loginPass: document.getElementById('nf_login_pass'),
    loginHint: document.getElementById('nf_login_hint'),
    loginWarning: document.getElementById('nf_login_warning'),
    loginLockout: document.getElementById('nf_login_lockout'),
    loginSubmit: document.getElementById('nf_login_submit'),

    /**
     * New ticket creation form elements
     * @namespace dom.newTicket
     */
    newTicketContainer: document.getElementById('nf_new_ticket_container'),
    newTicketForm: document.getElementById('nf_new_ticket_form'),
    newTicketRequestType: document.getElementById('nf_new_ticket_requesttype'),
    newTicketSubject: document.getElementById('nf_new_ticket_subject'),
    newTicketBody: document.getElementById('nf_new_ticket_body'),
    newTicketAttachment: document.getElementById('nf_new_ticket_attachment'),
    filePreviewContainer: document.getElementById('nf_file_preview_container'),
    filePreviewList: document.getElementById('nf_file_preview_list'),

    /**
     * Dialog close buttons
     * @namespace dom.closeButtons
     */
    closeBtnMain: document.getElementById('nf_modal_closebtn_main'),
    closeBtnTicketList: document.getElementById('nf_modal_closebtn_ticketlist'),
    closeBtnTicketDetail: document.getElementById('nf_modal_closebtn_ticketdetail'),
    closeBtnLogin: document.getElementById('nf_modal_closebtn_login'),
    closeBtnNewTicket: document.getElementById('nf_modal_closebtn_newticket'),
    btnCancelNewTicket: document.getElementById('nf_btn_cancel_newticket'),

    /**
     * HTML templates for dynamic content generation
     * @namespace dom.templates
     */
    templates: {
        ticketListRow: document.getElementById('nf_ticketlist_row_template'),
        ticketDetailHeader: document.getElementById('nf_ticketdetail_header_template'),
        ticketDetailMessage: document.getElementById('nf_ticketdetail_message_template'),
        searchResult: document.getElementById('nf_search_result_template')
    }
};
