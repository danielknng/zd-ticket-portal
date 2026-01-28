// Author: Daniel Könning
// ===============================
// nf-ticket-detail.js - Ticket detail view and message display
// ===============================
// This file contains all functions for the detailed ticket view.
// It handles loading and displaying ticket details, message history,
// header information, and email content processing.

// ===============================
// TICKET-DETAIL-ANSICHT ANZEIGEN
// ===============================

/**
 * Loads and shows the detailed view of a specific ticket
 * Includes header information, message history, and reply interface
 * 
 * @param {number} ticketId - ID of the ticket to display
 */
async function nfShowTicketDetailView(ticketId) {
    try {
        nfSetLoading(true);  // Show loading spinner during API calls
        // ===============================
        // LOAD TICKET DATA AND MESSAGES
        // ===============================
        const ticket = await nfFetchTicketDetail(ticketId);  // Load full ticket data
        nf.ticketDetailHeader.innerHTML = '';               // Clear previous header content
        // ===============================
        // LOAD AGENT INFORMATION
        // ===============================
        // Get template for ticket header
        const headerTemplate = nf.templates.ticketDetailHeader;
        let headerCard;     // Container for header information
        let agentName = '';
        // Load agent name if ticket is assigned
        if (ticket.owner_id) {
            try {
                agentName = await nfFetchUserNameById(ticket.owner_id) || '';
            } catch (e) {
                agentName = '';  // Fallback on error
            }
        }
        // ===============================
        // CREATE HEADER WITH TEMPLATE
        // ===============================
        if (headerTemplate) {
            // Use predefined HTML template
            headerCard = headerTemplate.firstElementChild.cloneNode(true);
            // ===============================
            // FILL TEMPLATE FIELDS
            // ===============================
            const titleEl = headerCard.querySelector('.nf-ticketdetail-title');
            const statusEl = headerCard.querySelector('.nf-ticketdetail-status');
            const dateEl = headerCard.querySelector('.nf-ticketdetail-date');
            const ticketNumberEl = headerCard.querySelector('.nf-ticketdetail-ticket-number');
            const updatedDateEl = headerCard.querySelector('.nf-ticketdetail-updated-date');
            const processorEl = headerCard.querySelector('.nf-ticketdetail-processor');
            titleEl.textContent = ticket.title || '';
            statusEl.className = 'nf-ticketdetail-status nf-ticketdetail-status--' + (ticket.state_id || 'default');
            statusEl.style.textAlign = 'center';
            statusEl.textContent = nfStateLabel(ticket.state_id);
            // Language-aware labels and date formatting
            const labels = window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage);
            const locale = window.NF_CONFIG.currentLanguage === 'de' ? 'de-DE' : 'en-US';
            dateEl.textContent = `${labels.ticketDetailCreated || 'Created:'} ${new Date(ticket.created_at).toLocaleString(locale)}`;
            ticketNumberEl.textContent = `${labels.ticketDetailNumber || 'Ticket No.'} ${ticket.number}`;
            updatedDateEl.textContent = `${labels.ticketDetailLastUpdated || 'Last updated:'} ${new Date(ticket.updated_at || ticket.created_at).toLocaleString(locale)}`;
            processorEl.textContent = agentName;
        } else {
            // ===============================
            // FALLBACK: PROGRAMMATIC HEADER CREATION
            // ===============================
            headerCard = document.createElement('div');
            headerCard.className = 'nf-ticketdetail-headercard nf-ticketdetail-headercard--fullwidth';
            const headerInfo = document.createElement('div');
            headerInfo.className = 'nf-ticketdetail-headerinfo';
            // ===============================
            // TITLE AND STATUS ROW
            // ===============================
            const titleRow = document.createElement('div');
            titleRow.className = 'nf-ticketdetail-title-row';
            const title = document.createElement('div');
            title.className = 'nf-ticketdetail-title';
            title.textContent = ticket.title || '';
            const status = document.createElement('div');
            status.className = 'nf-ticketdetail-status nf-ticketdetail-status--' + (ticket.state_id || 'default');
            status.style.textAlign = 'center';
            status.textContent = nfStateLabel(ticket.state_id);
            titleRow.appendChild(title);
            titleRow.appendChild(status);
            // ===============================
            // META INFORMATION (DATE AND TICKET NUMBER)
            // ===============================
            const metaRow = document.createElement('div');
            metaRow.className = 'nf-ticketdetail-meta-row';
            const dateInfo = document.createElement('div');
            dateInfo.className = 'nf-ticketdetail-date';
            dateInfo.textContent = `Created: ${new Date(ticket.created_at).toLocaleString('en-US')}`;
            const ticketInfo = document.createElement('div');
            ticketInfo.className = 'nf-ticketdetail-ticket-number';
            ticketInfo.textContent = `Ticket No. ${ticket.number}`;
            metaRow.appendChild(dateInfo);
            metaRow.appendChild(ticketInfo);
            // ===============================
            // UPDATED AT AND AGENT
            // ===============================
            const updatedRow = document.createElement('div');
            updatedRow.className = 'nf-ticketdetail-updated-row';
            const updatedDate = document.createElement('div');
            updatedDate.className = 'nf-ticketdetail-updated-date';
            updatedDate.textContent = `Last updated: ${new Date(ticket.updated_at || ticket.created_at).toLocaleString('en-US')}`;
            const processorInfo = document.createElement('div');
            processorInfo.className = 'nf-ticketdetail-processor';
            processorInfo.textContent = agentName;
            updatedRow.appendChild(updatedDate);
            updatedRow.appendChild(processorInfo);
            // ===============================
            // BUILD HEADER STRUCTURE
            // ===============================
            headerInfo.appendChild(titleRow);
            headerInfo.appendChild(metaRow);
            headerInfo.appendChild(updatedRow);
            headerCard.appendChild(headerInfo);
        }
        // ===============================
        // ADD HEADER TO DOM
        // ===============================
        nf.ticketDetailHeader.appendChild(headerCard);
        // ===============================
        // PREPARE MESSAGES AREA
        // ===============================
        nf.ticketDetailMessages.innerHTML = '';  // Clear previous messages
        // ===============================
        // ARTICLE FILTERING FOR USER VIEW
        // ===============================
        // Only show relevant messages for the end user (no internal notes, etc.)
        const visibleArticles = (ticket.articles || []).filter(a => {
            // ===============================
            // HIDE INTERNAL NOTES
            // ===============================
            // Internal notes are only visible to support team
            if (a.type === 'note' && a.internal === true) return false;
            
            // ===============================
            // HIDE SYSTEM MESSAGES
            // ===============================
            // System-generated messages are not relevant for end users
            if (a.sender === 'System') return false;
            
            // ===============================
            // HIDE AUTOMATIC SYSTEM EMAILS
            // ===============================
            // Specific filter for system emails
            const supportEmail = window.NF_CONFIG?.system?.supportEmail;
            const systemEmailFilter = window.NF_CONFIG?.system?.assets?.systemEmailFilter || [];
            if (a.from && systemEmailFilter.some(filterStr => a.from.includes(filterStr)) && 
                a.from.includes(supportEmail)) {
                return false;
            }
            
            // ===============================
            // ALWAYS SHOW USER EMAILS
            // ===============================
            // All emails from the customer are relevant (even with automatic subjects)
            if (a.type === 'email' && a.sender === 'Customer') {
                return true;
            }
            
            // ===============================
            // HIDE AUTOMATIC NOTIFICATIONS
            // ===============================
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
            
            // ===============================
            // SHOW BY DEFAULT
            // ===============================
            return true;  // Show all other articles
        });
        
        // ===============================
        // MESSAGE DISPLAY
        // ===============================
        // Get template for message display
        const msgTemplate = nf.templates.ticketDetailMessage;
        // ===============================
        // RENDER EACH VISIBLE MESSAGE
        // ===============================
        visibleArticles.forEach(article => {
            let msgDiv;  // Container for single message
            // ===============================
            // TEMPLATE-BASED MESSAGE
            // ===============================
            if (msgTemplate) {
                msgDiv = msgTemplate.firstElementChild.cloneNode(true);  // Clone template
                // ===============================
                // CSS CLASSES FOR MESSAGE TYPE
                // ===============================
                // Distinguish between agent and user messages for styling
                msgDiv.className = 'nf-ticketdetail-message ' + 
                    (article.sender_id === 1 ? 'nf-ticketdetail-message--agent' : 'nf-ticketdetail-message--user');
                // ===============================
                // FILL MESSAGE HEADER
                // ===============================
                msgDiv.querySelector('.nf-ticketdetail-message-header').textContent = 
                    `${article.from || (article.sender_id === 1 ? 'Support' : 'You')} • ${new Date(article.created_at).toLocaleString('en-US')}`;
                // ===============================
                // EMAIL CONTENT CLEANUP
                // ===============================
                // Clean up email content for better readability in user emails
                const isUserEmail = article.type === 'email' && article.sender === 'Customer';
                let bodyContent = isUserEmail ? nfExtractEmailContent(article.body, true) : (article.body || '');
                // Clean HTML from unwanted inline styles (e.g. from rich text editor)
                if (typeof NFUtils !== 'undefined' && NFUtils.cleanHtml) {
                    bodyContent = NFUtils.cleanHtml(bodyContent);
                }
                // ===============================
                // SET MESSAGE BODY
                // ===============================
                msgDiv.querySelector('.nf-ticketdetail-message-body').innerHTML = bodyContent;
                // ===============================
                // RENDER ATTACHMENTS (IF ANY)
                // ===============================
                const attDiv = msgDiv.querySelector('.nf-ticketdetail-attachments');
                if (article.attachments && article.attachments.length > 0 && attDiv) {
                    nfRenderAttachments(article.attachments, attDiv);  // Render file attachments
                }
            } else {
                // ===============================
                // FALLBACK: PROGRAMMATIC CREATION
                // ===============================
                msgDiv = nfCreateMessageDiv(article);  // Create message without template
            }
            // ===============================
            // ADD MESSAGE TO CONTAINER
            // ===============================
            nf.ticketDetailMessages.appendChild(msgDiv);
        });
        
        // ===============================
        // AUTO-SCROLL TO LATEST MESSAGES
        // ===============================
        // Automatically scroll to the end of the message list
        // With a short delay to ensure all content is loaded
        setTimeout(() => {
            nf.ticketDetailMessages.scrollTop = nf.ticketDetailMessages.scrollHeight;
        }, 100);
        // Additional scroll after image loads
        setTimeout(() => {
            nf.ticketDetailMessages.scrollTop = nf.ticketDetailMessages.scrollHeight;
        }, 500);
        // ===============================
        // INITIALIZE REPLY INTERFACE
        // ===============================
        nfSetupReplyInterface();  // Setup for reply functionality
        // ===============================
        // SHOW TICKET DETAIL MODAL
        // ===============================
        nfShowTicketDetail();  // Show the detail modal
    } catch (err) {
        // ===============================
        // ERROR HANDLING
        // ===============================
        nfShowStatus('Error loading ticket: ' + err.message, 'error', 'ticketdetail');
    } finally {
        // ===============================
        // CLEANUP
        // ===============================
        nfSetLoading(false);
    }
}

// ===============================
// MESSAGE DISPLAY HELPER FUNCTIONS
// ===============================

/**
 * Creates a message div without a template (fallback function)
 * Used if no HTML template for messages is available
 * 
 * @param {Object} article - Article object from Zammad API
 * @returns {HTMLElement} Fully configured message element
 */
function nfCreateMessageDiv(article) {
    // ===============================
    // CREATE MESSAGE CONTAINER
    // ===============================
    const msgDiv = document.createElement('div');
    msgDiv.className = 'nf-ticketdetail-message ' + 
        (article.sender_id === 1 ? 'nf-ticketdetail-message--agent' : 'nf-ticketdetail-message--user');
    
    // ===============================
    // CREATE MESSAGE HEADER
    // ===============================
    const header = document.createElement('div');
    header.className = 'nf-ticketdetail-message-header';
    header.style.fontWeight = '600';      // Bold header
    header.style.marginBottom = '0.3rem'; // Space below header
    header.textContent = `${article.from || (article.sender_id === 1 ? 'Support' : 'You')} • ${new Date(article.created_at).toLocaleString('en-US')}`;
    msgDiv.appendChild(header);
    
    // ===============================
    // CREATE MESSAGE BODY
    // ===============================
    const body = document.createElement('div');
    body.className = 'nf-ticketdetail-message-body';
    
    // ===============================
    // CLEANUP CONTENT FOR EMAILS
    // ===============================
    // Clean up email content for better readability in user emails
    const isUserEmail = article.type === 'email' && article.sender === 'Customer';
    let bodyContent = isUserEmail ? nfExtractEmailContent(article.body, true) : (article.body || '');
    
    // Clean HTML from unwanted inline styles (e.g. from rich text editor)
    if (typeof NFUtils !== 'undefined' && NFUtils.cleanHtml) {
        bodyContent = NFUtils.cleanHtml(bodyContent);
    }
    
    body.innerHTML = bodyContent;  // Set cleaned content
    msgDiv.appendChild(body);
    
    // ===============================
    // ADD ATTACHMENTS (IF ANY)
    // ===============================
    if (article.attachments && article.attachments.length > 0) {
        const attDiv = document.createElement('div');
        attDiv.className = 'nf-ticketdetail-attachments';
        nfRenderAttachments(article.attachments, attDiv);  // Render attachments
        msgDiv.appendChild(attDiv);
    }
    
    return msgDiv;  // Return complete message
}

// ===============================
// ATTACHMENT RENDERING AND DISPLAY
// ===============================

/**
 * Renders file attachments for messages with image preview and download links
 * Distinguishes between images (preview) and other files (download links)
 * 
 * @param {Array} attachments - Array of attachment objects from Zammad API
 * @param {HTMLElement} attDiv - Container element for attachments
 */
function nfRenderAttachments(attachments, attDiv) {
    attachments.forEach(att => {
        // ===============================
        // DETERMINE FILE TYPE
        // ===============================
        // Debug output for troubleshooting
        console.log('Attachment analyzed:', {
            filename: att.filename,
            contentType: att.preferences?.['Content-Type'],
            preferences: att.preferences
        });
        
        // Check if attachment is an image based on MIME type
        let isImage = att.preferences && att.preferences['Content-Type'] && 
                     att.preferences['Content-Type'].startsWith('image/');
        
        // Fallback: also check file extension if MIME type is not available or incorrect
        if (!isImage && att.filename) {
            const filenameLower = att.filename.toLowerCase();
            const imageExtensions = window.NF_CONFIG?.security?.imageExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
            isImage = imageExtensions.some(ext => filenameLower.endsWith(ext));
            
            if (isImage) {
                console.log('Image detected by file extension:', att.filename);
            }
        }
        
        console.log('Is image?', isImage, 'for', att.filename);
        const baseUrl = window.NF_CONFIG?.api?.baseUrl;
        const url = `${baseUrl}/attachments/${att.id}`;  // Zammad API URL for attachment
        
        if (isImage) {
            // ===============================
            // IMAGE ATTACHMENT HANDLING
            // ===============================
            const img = document.createElement('img');
            img.alt = att.filename;                    // Alt text for accessibility
            img.className = 'nf-ticketdetail-thumb';   // CSS class for thumbnail styling
            img.title = att.filename;                  // Tooltip with filename
            
            // Store the original attachment URL as data attribute for gallery access
            img.dataset.attachmentUrl = url;
            img.dataset.attachmentName = att.filename;
            
            // ===============================
            // SECURE IMAGE DOWNLOAD WITH AUTHENTICATION
            // ===============================
            fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${nf.userToken}`  // Use stored credentials
                }
            })
            .then(async response => {
                // ===============================
                // RESPONSE VALIDATION
                // ===============================
                if (!response.ok) throw new Error('Image not loadable');
                const blob = await response.blob();                           // Load image as blob
                if (!blob.type.startsWith('image/')) throw new Error('Not an image');  // Double MIME type check
                
                // ===============================
                // CONVERT BLOB TO DATA-URL
                // ===============================
                const reader = new FileReader();
                reader.onload = function(e) {
                    img.src = e.target.result;  // Set image source to data URL for local display
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {
                // ===============================
                // FALLBACK: DOWNLOAD LINK IF IMAGE FAILS
                // ===============================
                // If image cannot be loaded, show download link as alternative
                const link = document.createElement('a');
                link.href = url;                                     // Direct URL to attachment
                link.target = '_blank';                              // Open in new tab
                link.rel = 'noopener noreferrer';                    // Security attributes
                link.textContent = att.filename;                     // Show filename as link text
                link.className = 'nf-ticketdetail-attachmentlink';   // CSS class for styling
                attDiv.appendChild(link);                            // Add link to container
            });
            
            // ===============================
            // CLICK HANDLER FOR IMAGE GALLERY VIEW
            // ===============================
            img.addEventListener('click', async (e) => {
                e.preventDefault();        // Prevent default browser behavior
                e.stopPropagation();      // Prevent event bubbling
                
                // Use the stored original attachment URL for the gallery
                const attachmentUrl = img.dataset.attachmentUrl;
                
                // Collect all image attachments from the current message
                const messageImages = [];
                attachments.forEach(att => {
                    const isImageAtt = att.preferences && att.preferences['Content-Type'] && 
                                      att.preferences['Content-Type'].startsWith('image/');
                    if (isImageAtt) {
                        messageImages.push({
                            url: `${window.NF_CONFIG?.api?.baseUrl}/attachments/${att.id}`,
                            name: att.filename,
                            mimeType: att.preferences['Content-Type']
                        });
                    }
                });
                
                // Open gallery directly without nfIsImageFile check
                await nfOpenGalleryForAttachment(attachmentUrl, messageImages);
            });
            attDiv.appendChild(img);                         // Add image thumbnail to container
        } else {
            // ===============================
            // NON-IMAGE ATTACHMENT HANDLING
            // ===============================
            // Create download link for all other file types (PDFs, documents, etc.)
            const link = document.createElement('a');
            link.href = url;                                     // Direct URL to attachment download
            link.target = '_blank';                              // Open in new tab
            link.rel = 'noopener noreferrer';                    // Security attributes for external links
            link.textContent = att.filename;                     // Show filename as link text
            link.className = 'nf-ticketdetail-attachmentlink';   // CSS class for consistent styling
            attDiv.appendChild(link);                            // Add download link to container
        }
    });
}

// ===============================
// EMAIL CONTENT CLEANUP AND EXTRACTION
// ===============================

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
    // ===============================
    // BASIC VALIDATION
    // ===============================
    if (!body || typeof body !== 'string') return body;  // Return if not valid content
    
    // ===============================
    // CLEANUP ONLY FOR USER EMAILS
    // ===============================
    // Only clean up for user emails (not agent messages)
    if (!isUserEmail) return body;
    
    // ===============================
    // HTML TO TEXT CONVERSION
    // ===============================
    // Create temporary DOM element for HTML processing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = body;  // Parse HTML content
    
    // ===============================
    // REMOVE HR ELEMENTS AND FOLLOWING CONTENT
    // ===============================
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
    
    // ===============================
    // REMOVE SIGNATURE MARKERS
    // ===============================
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
    
    // ===============================
    // TEXT EXTRACTION AND NORMALIZATION
    // ===============================
    let textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remove excessive spaces and line breaks for better readability
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // ===============================
    // EMAIL SEPARATORS AND MARKERS
    // ===============================
    // Get email separators for further cleanup from config, or use default English set
    const separators = window.NF_CONFIG?.system?.emailSeparators || [
        'From:',          // English email header
        'Sent:',
        'To:',
        'Subject:',
        'Best regards',   // English greetings
        'Kind regards',
        'Department',
        'Phone:'
    ];
    
    // ===============================
    // CUT CONTENT AT FIRST SEPARATOR
    // ===============================
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

// ===============================
// LOAD AND MANAGE USER INFORMATION
// ===============================

/**
 * Fetches the name of a user by user ID from the Zammad API
 * Used to display agent names in ticket details
 * 
 * @param {number} userId - The unique user ID in Zammad
 * @returns {Promise<string>} Full name or fallback value
 */
async function nfFetchUserNameById(userId) {
    // ===============================
    // API REQUEST CONFIGURATION
    // ===============================
    // Construct URL for Zammad User API (adjust domain as needed)
    const url = `${window.NF_CONFIG?.api?.baseUrl}/users/${userId}`;
    
    // ===============================
    // AUTHENTICATED API CALL
    // ===============================
    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${nf.userToken}`  // Use stored authentication
        }
    });
    
    // ===============================
    // RESPONSE VALIDATION
    // ===============================
    if (!response.ok) throw new Error('User not found');  // Error if user does not exist
    
    // ===============================
    // USER DATA PROCESSING AND NAME EXTRACTION
    // ===============================
    const data = await response.json();  // Parse JSON response
    
    // Check available name fields and create full name
    return data.firstname && data.lastname ? 
        `${data.firstname} ${data.lastname}` :      // Full name if available
        data.login || 'Unknown';                    // Fallback: login name or "Unknown"
}
