// Author: Daniel Könning
// ===============================
// nf-ui-init.js - UI initialization with configuration values
// ===============================
// This module sets all UI texts, asset paths, and other configurable values
// from nf-config.js into the HTML elements. All comments, section headers, and variables are in English.

const NF_UI_INIT = {
    /**
     * Initializes all UI elements with configuration values.
     * Should be called after the page has loaded.
     */
    init: function() {
        if (!window.NF_CONFIG) {
            console.error('NF_CONFIG not available - UI initialization failed');
            return;
        }

        this.initTriggerButton();
        this.initMainModal();
        this.initTicketList();
        this.initTicketDetail();
        this.initGallery();
        this.initLogin();
        this.initNewTicket();
        this.initLinks();
    },

    /**
     * Initializes the trigger button with configurable values.
     */
    initTriggerButton: function() {
        const config = window.NF_CONFIG.system.assets;
        const triggerBtn = document.getElementById('nf-zammad-trigger');
        const triggerImg = triggerBtn ? triggerBtn.querySelector('img') : null;

        if (triggerBtn && config) {
            triggerBtn.setAttribute('aria-label', config.triggerButtonLabel);
        }

        if (triggerImg && config) {
            triggerImg.src = config.triggerButtonImage;
            triggerImg.alt = config.triggerButtonAlt;
        }
    },

    /**
     * Initializes the main modal with configurable texts.
     */
    initMainModal: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        const aria = window.NF_CONFIG.getAriaLabels(window.NF_CONFIG.currentLanguage);
        
        // Modal title and subtitle
        const modalTitle = document.querySelector('.nf-modal-title');
        const modalSubtitle = document.querySelector('.nf-modal-subtitle');
        const searchInput = document.getElementById('nf_search_input');
        
        if (modalTitle && labels.modalTitle) {
            modalTitle.textContent = labels.modalTitle;
        }
        
        if (modalSubtitle && labels.modalSubtitle) {
            modalSubtitle.textContent = labels.modalSubtitle;
        }
        
        if (searchInput && labels.searchPlaceholder) {
            searchInput.placeholder = labels.searchPlaceholder;
        }

        // Close buttons
        const closeButtons = document.querySelectorAll('.nf-modal-closebtn');
        closeButtons.forEach(btn => {
            if (aria) {
                // Assign ARIA label based on button context
                if (btn.id === 'nf_modal_closebtn_main') btn.setAttribute('aria-label', aria.closeMainDialog);
                else if (btn.id === 'nf_modal_closebtn_ticketlist') btn.setAttribute('aria-label', aria.closeTicketList);
                else if (btn.id === 'nf_modal_closebtn_ticketdetail') btn.setAttribute('aria-label', aria.closeTicketDetails);
                else if (btn.id === 'nf_modal_closebtn_login') btn.setAttribute('aria-label', aria.closeLogin);
                else if (btn.id === 'nf_modal_closebtn_newticket') btn.setAttribute('aria-label', aria.closeNewTicket);
                else btn.setAttribute('aria-label', labels.closeButton);
            } else if (labels.closeButton) {
                btn.setAttribute('aria-label', labels.closeButton);
            }
        });

        // Card contents
        this.initKnowledgePortalCard();
        this.initTicketSystemCard();
    },

    /**
     * Initializes the knowledge portal card.
     */
    initKnowledgePortalCard: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        const knowledgeCard = document.querySelector('.nf-card--knowledge');
        
        if (knowledgeCard && labels) {
            const title = knowledgeCard.querySelector('.nf-section-title');
            const desc = knowledgeCard.querySelector('.nf-section-desc');
            const button = knowledgeCard.querySelector('.nf-section-btn');
            
            if (title && labels.knowledgePortalTitle) {
                title.textContent = labels.knowledgePortalTitle;
            }
            
            if (desc && labels.knowledgePortalDesc) {
                desc.textContent = labels.knowledgePortalDesc;
            }
            
            if (button && labels.knowledgePortalButton) {
                button.textContent = labels.knowledgePortalButton;
            }
        }
    },

    /**
     * Initializes the ticket system card.
     */
    initTicketSystemCard: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        const ticketCard = document.querySelector('.nf-card--tickets');
        
        if (ticketCard && labels) {
            const title = ticketCard.querySelector('.nf-section-title');
            const desc = ticketCard.querySelector('.nf-section-desc');
            const createBtn = document.getElementById('nf_btn_ticketcreate');
            const viewBtn = document.getElementById('nf_btn_ticketview');
            
            if (title && labels.ticketSystemTitle) {
                title.textContent = labels.ticketSystemTitle;
            }
            
            if (desc && labels.ticketSystemDesc) {
                desc.textContent = labels.ticketSystemDesc;
            }
            
            if (createBtn && labels.createTicketButton) {
                createBtn.textContent = labels.createTicketButton;
            }
            
            if (viewBtn && labels.viewTicketsButton) {
                viewBtn.textContent = labels.viewTicketsButton;
            }
        }
    },

    /**
     * Initializes the ticket list with configurable texts.
     */
    initTicketList: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        
        // Filter options
        const statusFilter = document.getElementById('nf_filter_status');
        if (statusFilter && labels.ticketListFilters) {
            const options = statusFilter.querySelectorAll('option');
            options.forEach(option => {
                const value = option.value;
                if (labels.ticketListFilters[value]) {
                    option.textContent = labels.ticketListFilters[value];
                }
            });
        }

        // Sorting
        const sortSelect = document.getElementById('nf_sort');
        if (sortSelect && labels.ticketListSort) {
            const options = sortSelect.querySelectorAll('option');
            options.forEach(option => {
                const value = option.value;
                if (labels.ticketListSort[value]) {
                    option.textContent = labels.ticketListSort[value];
                }
            });
        }

        // Table headers
        const headerCells = document.querySelectorAll('.nf-ticketlist-header-cell');
        if (headerCells && labels.ticketListHeaders) {
            headerCells.forEach(cell => {
                const sortAttr = cell.getAttribute('data-sort');
                let headerKey = null;
                
                if (sortAttr === 'id') headerKey = 'id';
                else if (sortAttr === 'subject') headerKey = 'subject';
                else if (sortAttr === 'date_desc') headerKey = 'created';
                else if (sortAttr === 'status') headerKey = 'status';
                
                if (headerKey && labels.ticketListHeaders[headerKey]) {
                    cell.textContent = labels.ticketListHeaders[headerKey];
                }
            });
        }

        // Empty list message
        const emptyMsg = document.getElementById('nf_ticketlist_empty');
        if (emptyMsg && labels.ticketListEmpty) {
            emptyMsg.textContent = labels.ticketListEmpty;
        }
    },

    /**
     * Initializes the ticket detail view.
     */
    initTicketDetail: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        
        if (!labels.ticketDetailActions) return;

        const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
        const replyInput = document.getElementById('nf_ticketdetail_replyinput');
        const replyBtn = document.getElementById('nf_ticketdetail_replybtn');
        const cancelBtn = document.getElementById('nf_ticketdetail_replycancel');
        const closeBtn = document.getElementById('nf_ticketdetail_closebtn');

        if (replyToggle && labels.ticketDetailActions.reply) {
            replyToggle.textContent = labels.ticketDetailActions.reply;
        }

        if (replyInput && labels.ticketDetailActions.replyPlaceholder) {
            replyInput.placeholder = labels.ticketDetailActions.replyPlaceholder;
        }

        if (replyBtn && labels.ticketDetailActions.sendReply) {
            replyBtn.textContent = labels.ticketDetailActions.sendReply;
        }

        if (cancelBtn && labels.ticketDetailActions.cancelReply) {
            cancelBtn.textContent = labels.ticketDetailActions.cancelReply;
        }

        if (closeBtn && labels.ticketDetailActions.closeTicket) {
            closeBtn.textContent = labels.ticketDetailActions.closeTicket;
        }
    },

    /**
     * Initializes the gallery.
     */
    initGallery: function() {
        const aria = window.NF_CONFIG.getAriaLabels(window.NF_CONFIG.currentLanguage);
        const galleryOverlay = document.getElementById('nf_gallery_overlay');
        const galleryClose = document.getElementById('nf_gallery_close');
        const galleryPrev = document.getElementById('nf_gallery_prev');
        const galleryNext = document.getElementById('nf_gallery_next');
        if (galleryOverlay && aria) galleryOverlay.setAttribute('aria-label', aria.galleryView);
        if (galleryClose && aria) galleryClose.setAttribute('aria-label', aria.closeGallery);
        if (galleryPrev && aria) galleryPrev.setAttribute('aria-label', aria.previousImage);
        if (galleryNext && aria) galleryNext.setAttribute('aria-label', aria.nextImage);
    },

    /**
     * Initializes the login form.
     */
    initLogin: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        
        if (!labels.loginTitle || !labels.loginLabels) return;

        const loginTitle = document.querySelector('.nf-login-title');
        const usernameLabel = document.querySelector('label[for="nf_login_user"]');
        const passwordLabel = document.querySelector('label[for="nf_login_pass"]');
        const usernameInput = document.getElementById('nf_login_user');
        const passwordInput = document.getElementById('nf_login_pass');
        const submitBtn = document.getElementById('nf_login_submit');

        if (loginTitle) {
            loginTitle.textContent = labels.loginTitle;
        }

        if (usernameLabel) {
            usernameLabel.textContent = labels.loginLabels.username;
        }

        if (passwordLabel) {
            passwordLabel.textContent = labels.loginLabels.password;
        }

        if (usernameInput) {
            usernameInput.placeholder = labels.loginLabels.usernamePlaceholder;
        }

        if (passwordInput) {
            passwordInput.placeholder = labels.loginLabels.passwordPlaceholder;
        }

        if (submitBtn) {
            submitBtn.textContent = labels.loginLabels.submitButton;
        }
    },

    /**
     * Initializes the new ticket form.
     */
    initNewTicket: function() {
        const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
        
        if (!labels.newTicketTitle || !labels.newTicketLabels) return;

        const title = document.querySelector('.nf-newticket-title');
        const subjectLabel = document.querySelector('label[for="nf_new_ticket_subject"]');
        const bodyLabel = document.querySelector('label[for="nf_new_ticket_body"]');
        const attachmentLabel = document.querySelector('label[for="nf_new_ticket_attachment"]');
        const subjectInput = document.getElementById('nf_new_ticket_subject');
        const bodyInput = document.getElementById('nf_new_ticket_body');
        const uploadText = document.querySelector('.upload-text');
        const submitBtn = document.querySelector('#nf_new_ticket_form .nf-btn--primary');
        const cancelBtn = document.getElementById('nf_btn_cancel_newticket');

        if (title) {
            title.textContent = labels.newTicketTitle;
        }

        if (subjectLabel) {
            subjectLabel.textContent = labels.newTicketLabels.subject;
        }

        if (bodyLabel) {
            bodyLabel.textContent = labels.newTicketLabels.body;
        }

        if (attachmentLabel) {
            attachmentLabel.textContent = labels.newTicketLabels.attachment;
        }

        if (subjectInput) {
            subjectInput.placeholder = labels.newTicketLabels.subjectPlaceholder;
        }

        if (bodyInput) {
            bodyInput.placeholder = labels.newTicketLabels.bodyPlaceholder;
        }

        if (uploadText) {
            uploadText.textContent = labels.newTicketLabels.attachmentText;
        }

        if (submitBtn) {
            submitBtn.textContent = labels.newTicketLabels.submitButton;
        }

        if (cancelBtn) {
            cancelBtn.textContent = labels.newTicketLabels.cancelButton;
        }
    },

    /**
     * Initializes configurable links.
     */
    initLinks: function() {
        const links = window.NF_CONFIG.links;
        
        // Helpdesk/knowledge portal link
        const knowledgePortalLink = document.getElementById('nf_knowledge_portal_link');
        if (knowledgePortalLink && links.knowledgePortal) {
            knowledgePortalLink.href = links.knowledgePortal;
        }
    }
};

// Global availability
window.NF_UI_INIT = NF_UI_INIT;
