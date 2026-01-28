/**
 * @fileoverview Ticket creation business logic and form handling
 * @author danielknng
 * @module features/tickets/create
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { dom } from '../../ui/dom.js';
import { NF_CONFIG } from '../../core/config.js';
import { setLoading, show } from '../../ui/helpers.js';
import { showStatus } from '../../ui/status.js';
import { TicketService } from '../../api/tickets.js';
import { validateFile } from '../upload/file-handler.js';
import { clearFilePreview } from '../upload/file-handler.js';
import { Modal } from '../../ui/modal.js';
import nfLogger from '../../core/logger.js';
import languageManager from '../../i18n/manager.js';

/**
 * Handles submitting the new ticket form
 * @param {Event} e - Submit event from the form
 * @param {TicketService} ticketService - Ticket service instance
 * @param {Modal} modal - Modal instance
 */
export async function handleNewTicketSubmit(e, ticketService, modal) {
    e.preventDefault();
    setLoading(true);
    try {
        const subject = dom.newTicketSubject.value.trim();
        const body = dom.newTicketBody.value.trim();
        const requestType = dom.newTicketRequestType ? dom.newTicketRequestType.value : '';
        const files = dom.newTicketAttachment.files;
        
        if (!subject || !body) {
            throw new Error(getLanguageMessage('missingFields', {}, languageManager));
        }
        
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    validateFile(file);
                } catch (error) {
                    throw new Error(getLanguageMessage('fileValidationFailed', { file: file.name, error: error.message }, languageManager));
                }
            }
        }
        
        nfLogger.info('Creating ticket', { 
            subject, 
            hasFiles: files && files.length > 0,
            requestType: requestType || 'none'
        });
        
        // Only include request type if it's enabled and a valid value is selected
        const effectiveRequestType = (NF_CONFIG.api?.allowRequestType && requestType && requestType.trim() !== '') 
            ? requestType.trim() 
            : undefined;

        await ticketService.createTicket({
            subject,
            body,
            files,
            requestType: effectiveRequestType
        });
        
        showStatus(getLanguageMessage('ticketCreated', {}, languageManager), 'success', 'newticket');
        
        dom.newTicketForm.reset();
        clearFilePreview();
        
        // Show start screen
        show(dom.start);
        modal.open('nf_modal_overlay');
    } catch (error) {
        nfLogger.error('Failed to create ticket', { error: error.message });
        showStatus(error.message || 'Error creating ticket', 'error', 'newticket');
    } finally {
        setLoading(false);
    }
}

/**
 * Gets language message
 * @private
 */
function getLanguageMessage(key, params = {}, languageManager) {
    if (!languageManager) return '';
    return languageManager.getUtilsMessage(key, params) || '';
}

export default handleNewTicketSubmit;

