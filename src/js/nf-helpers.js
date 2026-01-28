// Author: Daniel Könning
/**
 * Helper functions for UI manipulation and data processing
 */

// UI helper functions
function nfShow(el) {
    el?.classList.remove('nf-hidden');
}

function nfHide(el) {
    el?.classList.add('nf-hidden');
}

function nfSetLoading(isLoading) {
    isLoading ? nfShow(nf.loader) : nfHide(nf.loader);
}

/**
 * Shows a status message in a context-specific modal
 * @param {string} msg - The message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {string|null} targetModal - Target modal or auto-detect
 */
function nfShowStatus(msg, type = 'success', targetModal = null) {
    const duration = window.NF_CONFIG?.ui?.statusMessageDuration || 4000;
    // Auto-detect active modal if not specified
    if (!targetModal) {
        targetModal = getActiveModal();
    }
    const statusElement = nfGetOrCreateStatusElement(targetModal);
    if (!statusElement) return;
    // Configure status element
    statusElement.textContent = msg;
    statusElement.className = `nf-status-msg${getStatusClass(type)}`;
    // Styling based on type
    applyStatusStyling(statusElement, type);
    nfShow(statusElement);
    setTimeout(() => nfHide(statusElement), duration);
}
// Helper functions for nfShowStatus
function getActiveModal() {
    const modals = [
        { element: nf.loginContainer, name: 'login' },
        { element: nf.newTicketContainer, name: 'newticket' },
        { element: nf.ticketDetailContainer, name: 'ticketdetail' },
        { element: nf.ticketListContainer, name: 'ticketlist' }
    ];
    for (const modal of modals) {
        if (modal.element && !modal.element.classList.contains('nf-hidden')) {
            return modal.name;
        }
    }
    return 'main';
}
function getStatusClass(type) {
    return type === 'error' ? ' nf-error' :
           type === 'warning' ? ' nf-warning' :
           type === 'info' ? ' nf-info' : '';
}
function applyStatusStyling(element, type) {
    const styles = {
        error: { background: '#dc3545', border: '2px solid #c0392b', color: 'white' },
        warning: { background: '#ffc107', color: '#2d2d5a' },
        info: { background: '#17a2b8', color: 'white' },
        success: { background: '#28a745', color: 'white' }
    };
    const style = styles[type] || styles.success;
    Object.assign(element.style, style);
}
/**
 * Creates or finds a modal-specific status element
 * @param {string} modalType - Type of modal
 * @returns {HTMLElement|null} The status element or null
 */
function nfGetOrCreateStatusElement(modalType) {
    const modalContainers = {
        'login': nf.loginContainer,
        'newticket': nf.newTicketContainer,
        'ticketdetail': nf.ticketDetailContainer,
        'ticketlist': nf.ticketListContainer,
        'main': nf.start
    };
    const container = modalContainers[modalType];
    if (!container) return null;
    let statusElement = container.querySelector('.nf-status-msg');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'nf-status-msg nf-hidden';
        statusElement.style.cssText = STATUS_ELEMENT_STYLES;
        document.body.appendChild(statusElement);
    }
    return statusElement;
}
const STATUS_ELEMENT_STYLES = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 2002; color: white; padding: 0.75rem 1.5rem;
    border-radius: 0.375rem; font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 90%;
    text-align: center; pointer-events: none;
`;
/**
 * Converts a ticket state ID to an English label
 * @param {number} stateId - The numeric state ID
 * @returns {string} The English status label
 */
function nfStateLabel(stateId) {
    const states = window.NF_CONFIG.getTicketStates(window.NF_CONFIG.currentLanguage);
    return states[stateId] || window.NF_CONFIG.getLabels(window.NF_CONFIG.currentLanguage)?.unknownStatus || 'Unknown';
}
/**
 * Converts a file to a Base64 string for API uploads
 * @param {File} file - The file object
 * @returns {Promise<string>} Base64 string
 */
function nfFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}
// File preview functions
function nfUpdateFilePreview() {
    const files = nf.newTicketAttachment.files;
    const previewList = nf.filePreviewList;
    const previewContainer = nf.filePreviewContainer;
    previewList.innerHTML = '';
    if (!files || files.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    previewContainer.style.display = 'block';
    Array.from(files).forEach((file, index) => {
        const previewItem = nfCreateFilePreviewItem(file, index);
        previewList.appendChild(previewItem);
    });
}
/**
 * Creates a single preview element for a file
 */
function nfCreateFilePreviewItem(file, index) {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    item.dataset.fileIndex = index;
    // Create thumbnail or icon
    const isImage = file.type.startsWith('image/');
    if (isImage) {
        const img = document.createElement('img');
        img.className = 'file-preview-thumbnail';
        img.alt = file.name;
        const reader = new FileReader();
        reader.onload = function(e) { img.src = e.target.result; };
        reader.readAsDataURL(file);
        item.appendChild(img);
    } else {
        const icon = document.createElement('div');
        icon.className = 'file-preview-icon';
        const { iconText, iconClass } = nfGetFileIcon(file.type, file.name);
        icon.textContent = iconText;
        icon.classList.add(iconClass);
        item.appendChild(icon);
    }
    // File name and size
    const name = document.createElement('div');
    name.className = 'file-preview-name';
    name.textContent = file.name;
    name.title = file.name;
    item.appendChild(name);
    const size = document.createElement('div');
    size.className = 'file-preview-size';
    size.textContent = nfFormatFileSize(file.size);
    item.appendChild(size);
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-preview-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove file';
    removeBtn.onclick = (e) => {
        e.preventDefault();
        nfRemoveFileFromPreview(index);
    };
    item.appendChild(removeBtn);
    return item;
}
/**
 * Determines the appropriate icon for a file type
 */
function nfGetFileIcon(mimeType, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        // PDF
        'application/pdf': { iconText: '📄', iconClass: 'file-preview-icon--pdf' },
        'pdf': { iconText: '📄', iconClass: 'file-preview-icon--pdf' },
        // Office documents
        'application/msword': { iconText: '📝', iconClass: 'file-preview-icon--doc' },
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { iconText: '📝', iconClass: 'file-preview-icon--doc' },
        'doc': { iconText: '📝', iconClass: 'file-preview-icon--doc' },
        'docx': { iconText: '📝', iconClass: 'file-preview-icon--doc' },
        'xls': { iconText: '📊', iconClass: 'file-preview-icon--excel' },
        'xlsx': { iconText: '📊', iconClass: 'file-preview-icon--excel' },
        'ppt': { iconText: '📽️', iconClass: 'file-preview-icon--powerpoint' },
        'pptx': { iconText: '📽️', iconClass: 'file-preview-icon--powerpoint' },
        // Text
        'text/plain': { iconText: '📄', iconClass: 'file-preview-icon--text' },
        'txt': { iconText: '📄', iconClass: 'file-preview-icon--text' },
        'md': { iconText: '📄', iconClass: 'file-preview-icon--text' },
        'log': { iconText: '📄', iconClass: 'file-preview-icon--text' },
        // Archive
        'zip': { iconText: '📦', iconClass: 'file-preview-icon--archive' },
        'rar': { iconText: '📦', iconClass: 'file-preview-icon--archive' },
        '7z': { iconText: '📦', iconClass: 'file-preview-icon--archive' },
        'tar': { iconText: '📦', iconClass: 'file-preview-icon--archive' },
        'gz': { iconText: '📦', iconClass: 'file-preview-icon--archive' }
    };
    return iconMap[mimeType] || iconMap[extension] ||
           { iconText: '📄', iconClass: 'file-preview-icon--default' };
}
/**
 * Formats file size in a readable form
 */
function nfFormatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
/**
 * Removes a file from the preview and file input
 */
function nfRemoveFileFromPreview(indexToRemove) {
    const dt = new DataTransfer();
    const files = nf.newTicketAttachment.files;
    // Copy all files except the one to remove into a new DataTransfer object
    Array.from(files).forEach((file, index) => {
        if (index !== indexToRemove) {
            dt.items.add(file);
        }
    });
    // Update the file input with the new files
    nf.newTicketAttachment.files = dt.files;
    // Update the preview
    nfUpdateFilePreview();
}
function nfClearFilePreview() {
    if (nf.filePreviewList) nf.filePreviewList.innerHTML = '';
    if (nf.filePreviewContainer) nf.filePreviewContainer.style.display = 'none';
}
// Drag & drop functionality
function nfInitializeDragAndDrop() {
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = nf.newTicketAttachment;
    if (!fileUpload || !fileInput) return;
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const highlight = () => fileUpload.classList.add('drag-over');
    const unhighlight = () => fileUpload.classList.remove('drag-over');
    // Add event listeners
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
        // Existing + new files
        [...fileInput.files, ...files].forEach(file => {
            newDataTransfer.items.add(file);
        });
        fileInput.files = newDataTransfer.files;
        nfUpdateFilePreview();
    }, false);
}
