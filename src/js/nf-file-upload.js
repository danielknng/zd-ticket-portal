/**
 * @fileoverview Complete file handling system for ticket attachments
 * @author danielknng
 * @module NFFileUpload
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nf } from './nf-dom.js';
import { NF_CONFIG } from './nf-config.js';
import { nfShowStatus } from './nf-status.js';

/**
 * Converts a file to a Base64 string for API uploads
 * @param {File} file - The file object
 * @returns {Promise<string>} Base64 string
 */
export function nfFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function nfFormatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates if a file type is allowed based on configuration
 * @param {string} fileType - MIME type of the file
 * @param {string} fileName - Name of the file
 * @returns {boolean} True if file is allowed
 */
export function nfIsFileTypeAllowed(fileType, fileName) {
    if (!window.NF_CONFIG?.security) return true;
    
    const config = window.NF_CONFIG.security;
    const allowedTypes = config.allowedFileTypes || [];
    
    // Check basic allowed types
    if (allowedTypes.includes(fileType)) {
        return true;
    }
    
    // If email attachments are globally allowed, allow email types
    if (config.emailAttachmentsAllowed) {
        const emailTypes = ['message/rfc822', 'application/vnd.ms-outlook'];
        if (emailTypes.includes(fileType)) {
            return true;
        }
        
        // Also check file extensions for email files
        const emailExtensions = ['.eml', '.msg'];
        const lowerFileName = fileName.toLowerCase();
        if (emailExtensions.some(ext => lowerFileName.endsWith(ext))) {
            return true;
        }
    }
    
    return false;
}

/**
 * Validates a file against configured security policies
 * @param {File} file - File object to validate
 * @throws {Error} If file is invalid
 * @returns {boolean} True if valid
 */
export function nfValidateFile(file) {
    if (!file) throw new Error('No file provided');
    
    const config = window.NF_CONFIG?.security;
    if (!config) return true;
    
    // Check file size
    if (file.size > config.maxFileSize) {
        throw new Error(`File "${file.name}" is too large. Maximum size: ${Math.round(config.maxFileSize / 1024 / 1024)}MB`);
    }
    
    // Check file type
    if (file.type && !nfIsFileTypeAllowed(file.type, file.name)) {
        throw new Error(`File type "${file.type}" is not allowed for "${file.name}".`);
    }
    
    return true;
}

/**
 * Creates a file preview item using the template
 * @param {File} file - The file to create preview for
 * @param {number} index - Index of the file in the list
 * @param {Function} removeCallback - Callback for remove button
 * @returns {HTMLElement|null} Preview element or null if invalid
 */
export function nfCreateFilePreviewItem(file, index, removeCallback) {
    if (!file) return null;
    
    // Validate file
    try {
        nfValidateFile(file);
    } catch (error) {
        nfShowStatus(error.message, 'error');
        return null;
    }
    
    // Use template if available
    const template = document.getElementById('nf_file_preview_item_template');
    if (template) {
        const templateContent = template.querySelector('.file-preview-item');
        if (templateContent) {
            const previewItem = templateContent.cloneNode(true);
            
            // Fill template data
            const nameEl = previewItem.querySelector('.file-preview-name');
            const sizeEl = previewItem.querySelector('.file-preview-size');
            const removeBtn = previewItem.querySelector('.file-preview-remove');
            
            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = nfFormatFileSize(file.size);
            if (removeBtn && removeCallback) {
                removeBtn.onclick = () => removeCallback(index);
            }
            
            return previewItem;
        }
    }
    
    // Fallback: create manually
    const previewItem = document.createElement('div');
    previewItem.className = 'file-preview-item';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-preview-name';
    fileName.textContent = file.name;
    
    const fileSize = document.createElement('div');
    fileSize.className = 'file-preview-size';
    fileSize.textContent = nfFormatFileSize(file.size);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-preview-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    if (removeCallback) {
        removeBtn.onclick = () => removeCallback(index);
    }
    
    previewItem.appendChild(fileName);
    previewItem.appendChild(fileSize);
    previewItem.appendChild(removeBtn);
    
    return previewItem;
}

/**
 * Updates the file preview for new ticket creation
 */
export function nfUpdateFilePreview() {
    const files = nf.newTicketAttachment?.files;
    const previewList = nf.filePreviewList;
    const previewContainer = nf.filePreviewContainer;
    
    if (!previewList || !previewContainer) return;
    
    previewList.innerHTML = '';
    
    if (!files || files.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    
    Array.from(files).forEach((file, index) => {
        const previewItem = nfCreateFilePreviewItem(file, index, nfRemoveFileFromPreview);
        if (previewItem) previewList.appendChild(previewItem);
    });
}

/**
 * Removes a file from the new ticket file preview
 * @param {number} indexToRemove - Index of file to remove
 */
export function nfRemoveFileFromPreview(indexToRemove) {
    const dt = new DataTransfer();
    const files = nf.newTicketAttachment?.files;
    
    if (!files) return;
    
    Array.from(files).forEach((file, index) => {
        if (index !== indexToRemove) {
            dt.items.add(file);
        }
    });
    
    nf.newTicketAttachment.files = dt.files;
    nfUpdateFilePreview();
}

/**
 * Clears all new ticket file attachments and preview
 */
export function nfClearFilePreview() {
    if (nf.filePreviewList) nf.filePreviewList.innerHTML = '';
    if (nf.filePreviewContainer) nf.filePreviewContainer.style.display = 'none';
    if (nf.newTicketAttachment) nf.newTicketAttachment.value = '';
}
/**
 * Updates the file preview for reply attachments
 */
export function nfUpdateReplyFilePreview() {
    const files = nf.ticketDetailAttachment?.files;
    const previewList = nf.ticketDetailFilePreviewList;
    const previewContainer = nf.ticketDetailFilePreview;
    
    if (!previewList || !previewContainer) return;
    
    previewList.innerHTML = '';
    
    if (!files || files.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    
    Array.from(files).forEach((file, index) => {
        const previewItem = nfCreateFilePreviewItem(file, index, nfRemoveReplyFileFromPreview);
        if (previewItem) previewList.appendChild(previewItem);
    });
}

/**
 * Removes a file from the reply file preview
 * @param {number} indexToRemove - Index of file to remove
 */
export function nfRemoveReplyFileFromPreview(indexToRemove) {
    const dt = new DataTransfer();
    const files = nf.ticketDetailAttachment?.files;
    
    if (!files) return;
    
    Array.from(files).forEach((file, index) => {
        if (index !== indexToRemove) {
            dt.items.add(file);
        }
    });
    
    nf.ticketDetailAttachment.files = dt.files;
    nfUpdateReplyFilePreview();
}

/**
 * Clears all reply file attachments and preview
 */
export function nfClearReplyFilePreview() {
    if (nf.ticketDetailFilePreviewList) nf.ticketDetailFilePreviewList.innerHTML = '';
    if (nf.ticketDetailFilePreview) nf.ticketDetailFilePreview.style.display = 'none';
    if (nf.ticketDetailAttachment) nf.ticketDetailAttachment.value = '';
}

/**
 * Initializes drag and drop functionality for new ticket creation
 */
export function nfInitializeDragAndDrop() {
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = nf.newTicketAttachment;
    
    if (!fileUpload || !fileInput) return;
    
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const highlight = () => fileUpload.classList.add('drag-over');
    const unhighlight = () => fileUpload.classList.remove('drag-over');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUpload.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, unhighlight, false);
    });
    
    fileUpload.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        const newDataTransfer = new DataTransfer();
        
        // Combine existing files with dropped files
        [...fileInput.files, ...files].forEach(file => {
            newDataTransfer.items.add(file);
        });
        
        fileInput.files = newDataTransfer.files;
        nfUpdateFilePreview();
    }, false);
}

/**
 * Handles the attachment button click for replies
 * Opens file selection dialog
 */
export function nfHandleAttachFiles() {
    if (nf.ticketDetailAttachment) {
        nf.ticketDetailAttachment.click();
    }
}

/**
 * Handles file selection change for reply attachments
 */
export function nfHandleReplyAttachmentChange() {
    nfUpdateReplyFilePreview();
}
