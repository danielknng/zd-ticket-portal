/**
 * @fileoverview Ticket detail view and message display functionality
 * @author danielknng
 * @module NFTicketDetail
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nfApiGet } from './nf-api-utils.js';
import { nfFetchTicketDetail } from './nf-api.js';
import { nfCloneTemplate } from './nf-template-utils.js';
import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfSetLoading, nfStateLabel } from './nf-helpers.js';
import { nfShowStatus } from './nf-status.js';
import { nfShowTicketDetail } from './nf-ui.js';
import { nfSetupReplyInterface } from './nf-ticket-actions.js';
import { nfIsImageFile, nfOpenGalleryForAttachment } from './nf-gallery.js';

/**
 * Loads and shows the detailed view of a specific ticket
 * Includes header information, message history, and reply interface
 * 
 * @param {number} ticketId - ID of the ticket to display
 */
async function nfShowTicketDetailView(ticketId) {
    window.nfLogger.debug('nfShowTicketDetailView called', { ticketId });
    try {
        nfSetLoading(true);  // Show loading spinner during API calls
        window.nfLogger.debug('nfShowTicketDetailView: ticketId', { ticketId });
        // LOAD TICKET DATA
        const ticket = await nfFetchTicketDetail(ticketId);
        window.nfLogger.debug('Loaded ticket', ticket);
        if (!ticket || typeof ticket !== 'object') {
            window.nfLogger.error('Ticket data invalid or not loaded', { ticket });
            nfShowStatus('Ticket data could not be loaded or is invalid.', 'error', 'ticketdetail');
            return;
        }
        // CHECK DOM ELEMENTS
        window.nfLogger.debug('Checking DOM elements', {
            ticketDetailHeader: nf.ticketDetailHeader,
            ticketDetailMessages: nf.ticketDetailMessages
        });
        if (!nf.ticketDetailHeader) {
            window.nfLogger.error('ticketDetailHeader missing', {});
            nfShowStatus('Ticket detail header DOM element missing. Please check your HTML structure.', 'error', 'ticketdetail');
            return;
        }
        if (!nf.ticketDetailMessages) {
            window.nfLogger.error('ticketDetailMessages missing', {});
            nfShowStatus('Ticket detail messages DOM element missing. Please check your HTML structure.', 'error', 'ticketdetail');
            return;
        }
        nf.ticketDetailHeader.innerHTML = '';
        // CHECK TEMPLATES
        const headerTemplate = nf.templates.ticketDetailHeader;
        const msgTemplate = nf.templates.ticketDetailMessage;
        window.nfLogger.debug('Checking templates', {
            headerTemplate,
            msgTemplate
        });
        if (!headerTemplate || !headerTemplate.firstElementChild) {
            window.nfLogger.error('Ticket header template missing or empty', { headerTemplate });
            nfShowStatus('Ticket header template missing or empty. Please check your HTML templates.', 'error', 'ticketdetail');
            return;
        }
        if (!msgTemplate || !msgTemplate.firstElementChild) {
            window.nfLogger.error('Ticket message template missing or empty', { msgTemplate });
            nfShowStatus('Ticket message template missing or empty. Please check your HTML templates.', 'error', 'ticketdetail');
            return;
        }
        let headerCard;
        let agentName = '';
        if (ticket.owner_id) {
            try {
                agentName = await nfFetchUserNameById(ticket.owner_id) || '';
            } catch (e) {
                window.nfLogger.warn('Failed to fetch agent name', { error: e });
                agentName = '';
            }
        }
        
        if (headerTemplate && headerTemplate.firstElementChild) {
            headerCard = nfCloneTemplate(headerTemplate.firstElementChild, 'div');
            window.nfLogger.debug('Cloned headerCard', { headerCard });
            const titleEl = headerCard.querySelector('.nf-ticketdetail-title');
            const statusEl = headerCard.querySelector('.nf-ticketdetail-status');
            const dateEl = headerCard.querySelector('.nf-ticketdetail-date');
            const ticketNumberEl = headerCard.querySelector('.nf-ticketdetail-ticket-number');
            const updatedDateEl = headerCard.querySelector('.nf-ticketdetail-updated-date');
            const processorEl = headerCard.querySelector('.nf-ticketdetail-processor');
            window.nfLogger.debug('Header fields', {titleEl, statusEl, dateEl, ticketNumberEl, updatedDateEl, processorEl});
            if (!titleEl || !statusEl || !dateEl || !ticketNumberEl || !updatedDateEl || !processorEl) {
                window.nfLogger.error('Ticket detail header template missing fields', {titleEl, statusEl, dateEl, ticketNumberEl, updatedDateEl, processorEl});
                nfShowStatus('Ticket detail header template is missing required fields.', 'error', 'ticketdetail');
                return;
            }
            titleEl.textContent = ticket.title || '';
            statusEl.className = 'nf-ticketdetail-status nf-ticketdetail-status--' + (ticket.state_id || 'default');
            statusEl.style.textAlign = 'center';
            statusEl.textContent = nfStateLabel(ticket.state_id);
            const locale = window.nfLang.getCurrentLocale();
            dateEl.textContent = `${window.nfLang.getLabel('ticketDetailCreated')} ${new Date(ticket.created_at).toLocaleString(locale)}`;
            ticketNumberEl.textContent = `${window.nfLang.getLabel('ticketDetailNumber')} ${ticket.number}`;
            updatedDateEl.textContent = `${window.nfLang.getLabel('ticketDetailLastUpdated')} ${new Date(ticket.updated_at || ticket.created_at).toLocaleString(locale)}`;
            processorEl.textContent = agentName;
        } else {
            window.nfLogger.error('Ticket header template not found', {});
            nfShowStatus('Ticket header template missing. Please check your HTML templates.', 'error', 'ticketdetail');
            return;
        }
        
        window.nfLogger.debug('Appending headerCard to ticketDetailHeader', { headerCard });
        nf.ticketDetailHeader.appendChild(headerCard);
        
        window.nfLogger.debug('Clearing ticketDetailMessages');
        nf.ticketDetailMessages.innerHTML = '';
        // Debug: msgTemplate
        window.nfLogger.debug('msgTemplate:', { msgTemplate });
        
        // Only show relevant messages for the end user (no internal notes, etc.)
        window.nfLogger.debug('Filtering articles', { articles: ticket.articles });
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
            
            // All emails from the customer are relevant (even with automatic subjects)
            if (a.type === 'email' && a.sender === 'Customer') {
                return true;
            }
            
            // Detect and filter automatic system notifications by subject
            if (a.subject && a.sender !== 'Customer') {
                const systemSubjects = [
                    'There is a reply in your ticket',      // Standard reply notification
                    'We have received your reply',          // Receipt confirmation
                    'was closed',                           // Close notification
                    'has changed',                          // Status change notification
                    'The status of your ticket'             // General status updates
                ];
                
                // Check if subject matches an automatic pattern
                if (systemSubjects.some(subject => a.subject.includes(subject))) {
                    return false;
                }
            }
            
            return true;  // Show all other articles
        });
        
        // Get template for message display
        
        visibleArticles.forEach(article => {
            window.nfLogger.debug('Rendering article', { article });
            let msgDiv;
            if (msgTemplate) {
                msgDiv = nfCloneTemplate(msgTemplate.firstElementChild, 'div');
                window.nfLogger.debug('Cloned msgDiv', { msgDiv });
                msgDiv.className = 'nf-ticketdetail-message ' + 
                    (article.sender_id === 1 ? 'nf-ticketdetail-message--agent' : 'nf-ticketdetail-message--user');
                const msgHeader = msgDiv.querySelector('.nf-ticketdetail-message-header');
                if (msgHeader) {
                    msgHeader.textContent = `${article.from || (article.sender_id === 1 ? 'Support' : 'You')} • ${new Date(article.created_at).toLocaleString(window.nfLang.getCurrentLocale())}`;
                } else {
                    window.nfLogger.error('Message header element missing', { msgDiv });
                }
                const isUserEmail = article.type === 'email' && article.sender === 'Customer';
                let bodyContent = isUserEmail ? nfExtractEmailContent(article.body, true) : (article.body || '');
                if (typeof NFUtils !== 'undefined' && NFUtils.cleanHtml) {
                    bodyContent = NFUtils.cleanHtml(bodyContent);
                }
                const msgBody = msgDiv.querySelector('.nf-ticketdetail-message-body');
                if (msgBody) {
                    msgBody.innerHTML = bodyContent;
                } else {
                    window.nfLogger.error('Message body element missing', { msgDiv });
                }
                const attDiv = msgDiv.querySelector('.nf-ticketdetail-attachments');
                if (article.attachments && article.attachments.length > 0 && attDiv) {
                    window.nfLogger.debug('Rendering attachments', { attachments: article.attachments });
                    nfRenderAttachments(article.attachments, attDiv);
                }
            }
            window.nfLogger.debug('Appending msgDiv to ticketDetailMessages', { msgDiv });
            nf.ticketDetailMessages.appendChild(msgDiv);
        });
        

        // Automatically scroll to the end of the message list
        // With a short delay to ensure all content is loaded
        setTimeout(() => {
            nf.ticketDetailMessages.scrollTop = nf.ticketDetailMessages.scrollHeight;
        }, 100);
        // Additional scroll after image loads
        setTimeout(() => {
            nf.ticketDetailMessages.scrollTop = nf.ticketDetailMessages.scrollHeight;
        }, 500);
        
        nfSetupReplyInterface();  // Setup for reply functionality
        
        nfShowTicketDetail();  // Show the detail modal
    } catch (err) {
        
        nfShowStatus('Error loading ticket: ' + err.message, 'error', 'ticketdetail');
    } finally {
        
        nfSetLoading(false);
    }
}

/**
 * Extracts the actual content from email messages
 * Removes signatures, attachments, quotes, and other email-specific elements
 * for better readability in the ticket view
 * 
 * @param {string} body - Raw email HTML content
 * @param {boolean} isUserEmail - Whether this is a user email
 * @returns {string} Cleaned and readable message content
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

function nfExtractEmailContent(body, isUserEmail = false) {
    
    if (!body || typeof body !== 'string') return body;  // Return if not valid content
    
    // Only clean up for user emails (not agent messages)
    if (!isUserEmail) return body;
    
    // Create temporary DOM element for HTML processing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = body;  // Parse HTML content
    
    // <hr> elements often mark signature start in emails
    const hrElements = tempDiv.querySelectorAll('hr');
    hrElements.forEach(hr => {
        // Remove everything after the <hr> element (usually signatures/attachments)
        let nextSibling = hr.nextSibling;
        while (nextSibling) {
            const toRemove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            if (toRemove.parentNode) {
                toRemove.parentNode.removeChild(toRemove);  // Remove following siblings
            }
        }
        // Remove the <hr> element itself
        if (hr.parentNode) {
            hr.parentNode.removeChild(hr);
        }
    });
    
    // Remove elements with signature-specific CSS classes
    const signatureMarkers = tempDiv.querySelectorAll('.js-signatureMarker, [class*="signature"]');
    signatureMarkers.forEach(marker => {
        // Remove signature marker and all following elements
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
    
    // Remove excessive spaces and line breaks for better readability
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Get email separators for further cleanup from config, or use default English set
    const separators = NF_CONFIG?.system?.emailSeparators || [
        'From:',          // English email header
        'Sent:',
        'To:',
        'Subject:',
        'Best regards',   // English greetings
        'Kind regards',
        'Department',
        'Phone:'
    ];
    
    // Find the first separator and cut everything after
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
 * Fetches the name of a user by user ID from the Zammad API
 * Used to display agent names in ticket details
 * 
 * @param {number} userId - The unique user ID in Zammad
 * @returns {Promise<string>} Full name or fallback value
 */
async function nfFetchUserNameById(userId) {
    
    // Construct URL for Zammad User API
    const url = `${NF_CONFIG?.api?.baseUrl}/users/${userId}`;
    
    const response = await nfApiGet(url, {
        headers: {
            'Authorization': `Basic ${nf.userToken}`  // Use stored authentication
        }
    });
    
    if (!response.ok) throw new Error('User not found');  // Error if user does not exist
    
    const data = await response.json();  // Parse JSON response
    
    // Check available name fields and create full name
    return data.firstname && data.lastname ? 
        `${data.firstname} ${data.lastname}` :      // Full name if available
        data.login || 'Unknown';                    // Fallback: login name or "Unknown"
}

/**
 * Renders attachments for a ticket message
 * Creates thumbnails for images that open in gallery, and links for other files
 * @param {Array} attachments - Array of attachment objects
 * @param {HTMLElement} container - Container element to render attachments in
 */
function nfRenderAttachments(attachments, container) {
    window.nfLogger.debug('nfRenderAttachments called', { attachments, container });
    
    if (!attachments || !attachments.length || !container) {
        window.nfLogger.debug('No attachments or container missing');
        return;
    }
    
    // Debug: Log attachment structure to understand Zammad API response
    window.nfLogger.debug('Attachment structure analysis', { 
        firstAttachment: attachments[0],
        attachmentKeys: attachments[0] ? Object.keys(attachments[0]) : []
    });
    
    container.innerHTML = ''; // Clear existing content
    
    // Collect all image attachments for gallery navigation
    const allImages = attachments
        .filter(attachment => {
            // Build proper URL if not present
            const attachmentUrl = nfBuildAttachmentUrl(attachment);
            return nfIsImageFile(attachmentUrl || attachment.filename);
        })
        .map(attachment => ({
            url: nfBuildAttachmentUrl(attachment),
            name: attachment.filename || 'Attachment'
        }));
    
    attachments.forEach((attachment, index) => {
        const attachDiv = document.createElement('div');
        attachDiv.className = 'nf-attachment-item';
        
        // Build proper attachment URL
        const attachmentUrl = nfBuildAttachmentUrl(attachment);
        const isImage = nfIsImageFile(attachmentUrl || attachment.filename);
        
        window.nfLogger.debug('Processing attachment', { 
            attachment, 
            attachmentUrl, 
            isImage, 
            filename: attachment.filename 
        });
        
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
                    const response = await fetch(attachmentUrl, {
                        method: 'GET',
                        headers: { 'Authorization': `Basic ${nf.userToken}` }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        const dataUrl = URL.createObjectURL(blob);
                        thumbImg.src = dataUrl;
                    } else {
                        // Fallback: show placeholder or hide
                        thumbImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f0f0f0"/><text x="75" y="75" text-anchor="middle" fill="%23666">📎</text></svg>';
                    }
                } catch (error) {
                    window.nfLogger.warn('Failed to load thumbnail', { error, attachment, attachmentUrl });
                    // Show file icon placeholder
                    thumbImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f0f0f0"/><text x="75" y="75" text-anchor="middle" fill="%23666">📎</text></svg>';
                }
            })();
            
            // Add click handler to open gallery
            thumbImg.addEventListener('click', (e) => {
                e.preventDefault();
                window.nfLogger.debug('Thumbnail clicked, opening gallery', { 
                    imageUrl: attachmentUrl, 
                    allImages 
                });
                nfOpenGalleryForAttachment(attachmentUrl, allImages);
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
function nfBuildAttachmentUrl(attachment) {
    // If URL is already present, use it
    if (attachment.url) {
        return attachment.url;
    }
    
    // Build URL from Zammad API structure
    // Zammad attachments typically have an 'id' property
    if (attachment.id) {
        const baseUrl = (NF_CONFIG && NF_CONFIG.api && NF_CONFIG.api.baseUrl) || '';
        return `${baseUrl}/attachments/${attachment.id}`;
    }
    
    // Log if no URL can be constructed
    window.nfLogger.warn('Could not build attachment URL', { attachment });
    return null;
}

export { nfShowTicketDetailView };
