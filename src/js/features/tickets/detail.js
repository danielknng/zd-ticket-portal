/**
 * @fileoverview Ticket detail view and message display functionality
 * @author danielknng
 * @module features/tickets/detail
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from '../../core/config.js';
import { dom } from '../../ui/dom.js';
import { setLoading, stateLabel, show, hide } from '../../ui/helpers.js';
import { showStatus } from '../../ui/status.js';
import { TicketService } from '../../api/tickets.js';
import { apiGet } from '../../api/http.js';
import { cloneTemplate } from '../../utils/template.js';
import { isImageFile, openGalleryForAttachment } from '../gallery/viewer.js';
import appState from '../../state/store.js';
import { Modal } from '../../ui/modal.js';
import nfLogger from '../../core/logger.js';
import languageManager from '../../i18n/manager.js';

/**
 * Shows the ticket detail view
 * @param {number|string} ticketId - Ticket ID
 * @param {TicketService} ticketService - Ticket service instance
 * @param {Modal} modal - Modal instance
 */
export async function showTicketDetailView(ticketId, ticketService, modal) {
    nfLogger.debug('showTicketDetailView called', { ticketId });
    try {
        setLoading(true);
        
        // Load ticket data
        const ticket = await ticketService.getTicket(ticketId);
        nfLogger.debug('Loaded ticket', ticket);
        
        if (!ticket || typeof ticket !== 'object') {
            nfLogger.error('Ticket data invalid or not loaded', { ticket });
            showStatus('Ticket data could not be loaded or is invalid.', 'error', 'ticketdetail');
            return;
        }
        
        // Check DOM elements
        if (!dom.ticketDetailHeader) {
            nfLogger.error('ticketDetailHeader missing');
            showStatus('Ticket detail header DOM element missing. Please check your HTML structure.', 'error', 'ticketdetail');
            return;
        }
        if (!dom.ticketDetailMessages) {
            nfLogger.error('ticketDetailMessages missing');
            showStatus('Ticket detail messages DOM element missing. Please check your HTML structure.', 'error', 'ticketdetail');
            return;
        }
        
        dom.ticketDetailHeader.innerHTML = '';
        
        // Check templates
        const headerTemplate = dom.templates.ticketDetailHeader;
        const msgTemplate = dom.templates.ticketDetailMessage;
        
        if (!headerTemplate || !headerTemplate.firstElementChild) {
            nfLogger.error('Ticket header template missing or empty', { headerTemplate });
            showStatus('Ticket header template missing or empty. Please check your HTML templates.', 'error', 'ticketdetail');
            return;
        }
        if (!msgTemplate || !msgTemplate.firstElementChild) {
            nfLogger.error('Ticket message template missing or empty', { msgTemplate });
            showStatus('Ticket message template missing or empty. Please check your HTML templates.', 'error', 'ticketdetail');
            return;
        }
        
        // Fetch agent name if owner_id exists
        let agentName = '';
        if (ticket.owner_id) {
            try {
                agentName = await fetchUserNameById(ticket.owner_id) || '';
            } catch (e) {
                nfLogger.warn('Failed to fetch agent name', { error: e });
                agentName = '';
            }
        }
        
        // Render header
        const headerCard = cloneTemplate(headerTemplate.firstElementChild);
        nfLogger.debug('Cloned headerCard', { headerCard });
        
        const titleEl = headerCard.querySelector('.nf-ticketdetail-title');
        const statusEl = headerCard.querySelector('.nf-ticketdetail-status');
        const dateEl = headerCard.querySelector('.nf-ticketdetail-date');
        const ticketNumberEl = headerCard.querySelector('.nf-ticketdetail-ticket-number');
        const updatedDateEl = headerCard.querySelector('.nf-ticketdetail-updated-date');
        const processorEl = headerCard.querySelector('.nf-ticketdetail-processor');
        
        if (!titleEl || !statusEl || !dateEl || !ticketNumberEl || !updatedDateEl || !processorEl) {
            nfLogger.error('Ticket detail header template missing fields', {
                titleEl, statusEl, dateEl, ticketNumberEl, updatedDateEl, processorEl
            });
            showStatus('Ticket detail header template is missing required fields.', 'error', 'ticketdetail');
            return;
        }
        
        titleEl.textContent = ticket.title || '';
        statusEl.className = 'nf-ticketdetail-status nf-ticketdetail-status--' + (ticket.state_id || 'default');
        statusEl.style.textAlign = 'center';
        statusEl.textContent = stateLabel(ticket.state_id);
        
        const locale = getCurrentLocale();
        dateEl.textContent = `${getLanguageLabel('ticketDetailCreated')} ${new Date(ticket.created_at).toLocaleString(locale)}`;
        ticketNumberEl.textContent = `${getLanguageLabel('ticketDetailNumber')} ${ticket.number}`;
        updatedDateEl.textContent = `${getLanguageLabel('ticketDetailLastUpdated')} ${new Date(ticket.updated_at || ticket.created_at).toLocaleString(locale)}`;
        processorEl.textContent = agentName;
        
        dom.ticketDetailHeader.appendChild(headerCard);
        
        // Clear messages
        dom.ticketDetailMessages.innerHTML = '';
        
        // Filter visible articles
        const visibleArticles = (ticket.articles || []).filter(a => {
            // Internal notes are only visible to support team
            if (a.type === 'note' && a.internal === true) return false;
            
            // System-generated messages are not relevant for end users
            if (a.sender === 'System') return false;
            
            // Specific filter for system emails
            const supportEmail = NF_CONFIG?.system?.supportEmail;
            const systemEmailFilter = NF_CONFIG?.system?.assets?.systemEmailFilter || [];
            if (a.from && systemEmailFilter.some(filterStr => a.from.includes(filterStr)) && 
                a.from.includes(supportEmail)) {
                return false;
            }
            
            // All emails from the customer are relevant
            if (a.type === 'email' && a.sender === 'Customer') {
                return true;
            }
            
            // Detect and filter automatic system notifications by subject
            if (a.subject && a.sender !== 'Customer') {
                const systemSubjects = [
                    'There is a reply in your ticket',
                    'We have received your reply',
                    'was closed',
                    'has changed',
                    'The status of your ticket'
                ];
                
                if (systemSubjects.some(subject => a.subject.includes(subject))) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Render messages using DocumentFragment for batch DOM operations
        const messagesFragment = document.createDocumentFragment();
        
        visibleArticles.forEach(article => {
            nfLogger.debug('Rendering article', { article });
            let msgDiv;
            
            if (msgTemplate) {
                msgDiv = cloneTemplate(msgTemplate.firstElementChild);
                msgDiv.className = 'nf-ticketdetail-message ' + 
                    (article.sender_id === 1 ? 'nf-ticketdetail-message--agent' : 'nf-ticketdetail-message--user');
                
                const msgHeader = msgDiv.querySelector('.nf-ticketdetail-message-header');
                if (msgHeader) {
                    msgHeader.textContent = `${article.from || (article.sender_id === 1 ? 'Support' : 'You')} • ${new Date(article.created_at).toLocaleString(locale)}`;
                } else {
                    nfLogger.error('Message header element missing', { msgDiv });
                }
                
                const isUserEmail = article.type === 'email' && article.sender === 'Customer';
                let bodyContent = isUserEmail ? extractEmailContent(article.body, true) : (article.body || '');
                
                // Clean HTML if utility available
                if (typeof window !== 'undefined' && window.NFUtils && window.NFUtils.cleanHtml) {
                    bodyContent = window.NFUtils.cleanHtml(bodyContent);
                }
                
                const msgBody = msgDiv.querySelector('.nf-ticketdetail-message-body');
                if (msgBody) {
                    msgBody.innerHTML = bodyContent;
                } else {
                    nfLogger.error('Message body element missing', { msgDiv });
                }
                
                const attDiv = msgDiv.querySelector('.nf-ticketdetail-attachments');
                if (article.attachments && article.attachments.length > 0 && attDiv) {
                    nfLogger.debug('Rendering attachments', { attachments: article.attachments });
                    renderAttachments(article.attachments, attDiv);
                }
            }
            
            messagesFragment.appendChild(msgDiv);
        });
        
        // Append all messages at once to minimize reflows
        dom.ticketDetailMessages.appendChild(messagesFragment);
        
        // Auto-scroll to bottom
        requestAnimationFrame(() => {
            dom.ticketDetailMessages.scrollTop = dom.ticketDetailMessages.scrollHeight;
        });
        
        // Additional scroll after images load
        const images = dom.ticketDetailMessages.querySelectorAll('img');
        let imagesLoaded = 0;
        const totalImages = images.length;
        
        if (totalImages > 0) {
            const scrollAfterImageLoad = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    requestAnimationFrame(() => {
                        dom.ticketDetailMessages.scrollTop = dom.ticketDetailMessages.scrollHeight;
                    });
                }
            };
            
            images.forEach(img => {
                if (img.complete) {
                    scrollAfterImageLoad();
                } else {
                    img.addEventListener('load', scrollAfterImageLoad, { once: true });
                    img.addEventListener('error', scrollAfterImageLoad, { once: true });
                }
            });
        }
        
        // Setup reply interface (imported from actions module)
        const { setupReplyInterface } = await import('./actions.js');
        setupReplyInterface(ticketService, modal);
        
        // Show the detail modal
        show(dom.start);
        show(dom.ticketListContainer);
        hide(dom.loginContainer);
        hide(dom.newTicketContainer);
        modal.open('nf_ticketdetail_container');
        
    } catch (err) {
        nfLogger.error('Error showing ticket detail', { error: err });
        showStatus('Error loading ticket: ' + err.message, 'error', 'ticketdetail');
    } finally {
        setLoading(false);
    }
}

/**
 * Extracts the actual content from email messages
 * @param {string} body - Raw email HTML content
 * @param {boolean} isUserEmail - Whether this is a user email
 * @returns {string} Cleaned and readable message content
 */
function extractEmailContent(body, isUserEmail = false) {
    if (!body || typeof body !== 'string') return body;
    
    if (!isUserEmail) return body;
    
    // Create temporary DOM element for HTML processing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = body;
    
    // Remove <hr> elements (often mark signature start)
    const hrElements = tempDiv.querySelectorAll('hr');
    hrElements.forEach(hr => {
        let nextSibling = hr.nextSibling;
        while (nextSibling) {
            const toRemove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            if (toRemove.parentNode) {
                toRemove.parentNode.removeChild(toRemove);
            }
        }
        if (hr.parentNode) {
            hr.parentNode.removeChild(hr);
        }
    });
    
    // Remove signature markers
    const signatureMarkers = tempDiv.querySelectorAll('.js-signatureMarker, [class*="signature"]');
    signatureMarkers.forEach(marker => {
        let current = marker;
        while (current) {
            const toRemove = current;
            current = current.nextSibling;
            if (toRemove.parentNode) {
                toRemove.parentNode.removeChild(toRemove);
            }
        }
    });
    
    let textContent = tempDiv.textContent || tempDiv.innerText || '';
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Get email separators from config
    const separators = NF_CONFIG?.system?.emailSeparators || [
        'From:', 'Sent:', 'To:', 'Subject:',
        'Best regards', 'Kind regards', 'Department', 'Phone:'
    ];
    
    // Find first separator and cut everything after
    let cleanContent = textContent;
    let cutPosition = findFirstSeparator(textContent, separators);
    cleanContent = textContent.substring(0, cutPosition).trim();
    
    const lines = cleanContent.split(/[\r\n\u2028\u2029]+/);
    const relevantLines = cleanLines(lines);
    let result = relevantLines.join(' ').trim();
    result = result.replace(/\s*Von:\s*$/, '').trim();
    
    if (!result && textContent.length > 0) {
        return textContent.substring(0, 200).trim() + '...';
    }
    return result || body;
}

/**
 * Finds the first separator position in text
 * @private
 */
function findFirstSeparator(textContent, separators) {
    let cutPosition = textContent.length;
    for (const separator of separators) {
        const pos = textContent.indexOf(separator);
        if (pos > 0 && pos < cutPosition) {
            cutPosition = pos;
        }
    }
    return cutPosition;
}

/**
 * Cleans lines by removing quotes and irrelevant content
 * @private
 */
function cleanLines(lines) {
    const relevantLines = [];
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.startsWith('>')) continue;
        if (/^[^\w\u00C0-\u024F\u1E00-\u1EFF]*$/.test(trimmedLine)) continue;
        if (trimmedLine.includes('@') && (trimmedLine.includes('<') || trimmedLine.includes('mailto:'))) continue;
        relevantLines.push(trimmedLine);
    }
    return relevantLines;
}

/**
 * Fetches the name of a user by user ID from the Zammad API
 * @param {number} userId - The unique user ID in Zammad
 * @returns {Promise<string>} Full name or fallback value
 */
async function fetchUserNameById(userId) {
    const url = `${NF_CONFIG?.api?.baseUrl}/users/${userId}`;
    
    const response = await apiGet(url, {
        headers: {
            'Authorization': `Basic ${appState.get('userToken')}`
        }
    });
    
    if (!response.ok) throw new Error('User not found');
    
    const data = await response.json();
    return data.firstname && data.lastname ? 
        `${data.firstname} ${data.lastname}` :
        data.login || 'Unknown';
}

/**
 * Renders attachments for a ticket message
 * @param {Array} attachments - Array of attachment objects
 * @param {HTMLElement} container - Container element to render attachments in
 */
function renderAttachments(attachments, container) {
    nfLogger.debug('renderAttachments called', { attachments, container });
    
    if (!attachments || !attachments.length || !container) {
        nfLogger.debug('No attachments or container missing');
        return;
    }
    
    container.innerHTML = '';
    
    // Collect all image attachments for gallery navigation
    const allImages = attachments
        .filter(attachment => {
            const attachmentUrl = buildAttachmentUrl(attachment);
            return isImageFile(attachmentUrl || attachment.filename);
        })
        .map(attachment => ({
            url: buildAttachmentUrl(attachment),
            name: attachment.filename || 'Attachment'
        }));
    
    attachments.forEach((attachment, index) => {
        const attachDiv = document.createElement('div');
        attachDiv.className = 'nf-attachment-item';
        
        const attachmentUrl = buildAttachmentUrl(attachment);
        const isImage = isImageFile(attachmentUrl || attachment.filename);
        
        if (isImage) {
            // Create thumbnail for images
            const thumbImg = document.createElement('img');
            thumbImg.className = 'nf-ticketdetail-thumb nf-attachment-thumbnail';
            thumbImg.alt = attachment.filename || `Attachment ${index + 1}`;
            thumbImg.style.maxWidth = '150px';
            thumbImg.style.maxHeight = '150px';
            thumbImg.style.cursor = 'pointer';
            thumbImg.style.border = '1px solid #ddd';
            thumbImg.style.borderRadius = '4px';
            thumbImg.style.padding = '4px';
            
            // Load authenticated image for thumbnail
            (async () => {
                try {
                    if (!attachmentUrl) {
                        throw new Error('No attachment URL available');
                    }
                    const response = await apiGet(attachmentUrl, {
                        headers: { 'Authorization': `Basic ${appState.get('userToken')}` }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        const dataUrl = URL.createObjectURL(blob);
                        thumbImg.src = dataUrl;
                    } else {
                        thumbImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f0f0f0"/><text x="75" y="75" text-anchor="middle" fill="%23666">📎</text></svg>';
                    }
                } catch (error) {
                    nfLogger.warn('Failed to load thumbnail', { error, attachment, attachmentUrl });
                    thumbImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f0f0f0"/><text x="75" y="75" text-anchor="middle" fill="%23666">📎</text></svg>';
                }
            })();
            
            // Add click handler to open gallery
            thumbImg.addEventListener('click', (e) => {
                e.preventDefault();
                nfLogger.debug('Thumbnail clicked, opening gallery', { imageUrl: attachmentUrl, allImages });
                openGalleryForAttachment(attachmentUrl, allImages);
            });
            
            // Add filename below thumbnail
            const nameDiv = document.createElement('div');
            nameDiv.className = 'nf-attachment-name';
            nameDiv.textContent = attachment.filename || `Image ${index + 1}`;
            nameDiv.style.fontSize = '12px';
            nameDiv.style.marginTop = '4px';
            nameDiv.style.textAlign = 'center';
            
            // Add file size if available
            if (attachment.size) {
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'nf-attachment-size';
                sizeSpan.textContent = ` (${(attachment.size / 1024).toFixed(1)} KB)`;
                sizeSpan.style.color = '#666';
                nameDiv.appendChild(sizeSpan);
            }
            
            attachDiv.appendChild(thumbImg);
            attachDiv.appendChild(nameDiv);
        } else {
            // Create link for non-image files
            const attachLink = document.createElement('a');
            attachLink.href = attachmentUrl || '#';
            attachLink.textContent = attachment.filename || `Attachment ${index + 1}`;
            attachLink.target = '_blank';
            attachLink.className = 'nf-attachment-link';
            
            // Add file size if available
            if (attachment.size) {
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'nf-attachment-size';
                sizeSpan.textContent = ` (${(attachment.size / 1024).toFixed(1)} KB)`;
                attachLink.appendChild(sizeSpan);
            }
            
            attachDiv.appendChild(attachLink);
        }
        
        container.appendChild(attachDiv);
    });
}

/**
 * Builds the proper URL for a Zammad attachment
 * @param {Object} attachment - Attachment object from Zammad API
 * @returns {string} Complete URL to the attachment
 */
function buildAttachmentUrl(attachment) {
    if (attachment.url) {
        return attachment.url;
    }
    
    if (attachment.id) {
        const baseUrl = NF_CONFIG?.api?.baseUrl || '';
        return `${baseUrl}/attachments/${attachment.id}`;
    }
    
    nfLogger.warn('Could not build attachment URL', { attachment });
    return null;
}

/**
 * Gets language label
 * @private
 */
function getLanguageLabel(key) {
    if (!languageManager) return '';
    return languageManager.getLabel(key) || '';
}

/**
 * Gets current locale
 * @private
 */
function getCurrentLocale() {
    if (!languageManager) return 'en';
    return languageManager.getCurrentLocale() || 'en';
}

export default showTicketDetailView;

