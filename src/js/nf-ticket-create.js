/**
 * @fileoverview Ticket creation business logic and form handling
 * @author danielknng
 * @module NFTicketCreate
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nfCreateTicket } from './nf-api.js';
import { nfSetLoading } from './nf-helpers.js';
import { nfShowStatus } from './nf-status.js';
import { nfClearFilePreview, nfValidateFile } from './nf-file-upload.js';
import { nfShowStart } from './nf-ui.js';
import { nf } from './nf-dom.js';
import { NF_CONFIG } from './nf-config.js';

/**
 * Handles submitting the new ticket form
 * Performs full validation, file upload, and API call
 *
 * @param {Event} e - Submit event from the form
 */
export async function handleNewTicketSubmit(e) {
    e.preventDefault();
    nfSetLoading(true);
    try {
        const subject = nf.newTicketSubject.value.trim();
        const body = nf.newTicketBody.value.trim();
        const requestType = nf.newTicketRequestType ? nf.newTicketRequestType.value : '';
        const files = nf.newTicketAttachment.files;
        
        if (!subject || !body) {
            throw new window.NFError(window.nfGetMessage('missingFields'), 'MISSING_FIELDS');
        }
        
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    nfValidateFile(file);
                } catch (error) {
                    throw new window.NFError(window.nfGetMessage('fileValidationFailed', undefined, { file: file.name, error: error.message }), 'FILE_VALIDATION_FAILED');
                }
            }
        }
        window.nfLogger.info('Creating ticket', { 
            subject, 
            hasFiles: files && files.length > 0,
            requestType: requestType || 'none'
        });
        
        // Only include request type if it's enabled and a valid value is selected
        const effectiveRequestType = (NF_CONFIG.api?.allowRequestType && requestType && requestType.trim() !== '') 
            ? requestType.trim() 
            : undefined;

        await nfCreateTicket(subject, body, files, effectiveRequestType);
        nfShowStatus(window.nfGetMessage('ticketCreated'), 'success', 'newticket');
        
        nf.newTicketForm.reset();
        nfClearFilePreview();
        nfShowStart();
    } catch (error) {
        window.nfLogger.error('Failed to create ticket', { error: error.message });
        nfShowStatus(error.message || 'Error creating ticket', 'error', 'newticket');
    } finally {
        nfSetLoading(false);
    }
}
