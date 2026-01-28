/**
 * @fileoverview Internal gallery view for ticket attachments
 * @author danielknng
 * @module NFGallery
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nfApiGet, nfApiFetch } from './nf-api-utils.js';
import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfShow, nfHide, nfSetLoading } from './nf-helpers.js';
import nfModal from './nf-modal.js';

/**
 * Gallery state management variables
 * @namespace NFGallery.state
 * @property {Array} nfGalleryImages - Array of all images in the current view
 * @property {number} nfCurrentImageIndex - Index of the currently displayed image
 */
let nfGalleryImages = [];
let nfCurrentImageIndex = 0;

/**
 * Opens the internal gallery view for an image
 * If it is a document, it will be opened in a new tab (fallback)
 *
 * @param {string} imageUrl - URL of the image to display
 * @param {Array} allImages - Array of all available images for navigation
 * @param {number} startIndex - Index of the image to start with
 */
async function nfOpenGallery(imageUrl, allImages = [], startIndex = 0) {
    if (!nfIsImageFile(imageUrl)) {
        window.open(imageUrl, '_blank');
        return;
    }
    nfGalleryImages = allImages.filter(img => nfIsImageFile(img.url));
    nfCurrentImageIndex = nfGalleryImages.findIndex(img => img.url === imageUrl);
    if (nfCurrentImageIndex === -1) {
        nfCurrentImageIndex = 0;
        nfGalleryImages = [{ url: imageUrl, name: 'Attachment' }];
    }
    
    const overlay = document.getElementById('nf_gallery_overlay');
    const image = document.getElementById('nf_gallery_image');
    const closeBtn = document.getElementById('nf_gallery_close');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    const info = document.getElementById('nf_gallery_info');
    if (!overlay || !image) {
        window.open(imageUrl, '_blank');
        return;
    }
    await nfDisplayCurrentImage();
    nfUpdateGalleryNavigation();
    nfShow(overlay);
    overlay.classList.add('nf-gallery-active');
    document.body.style.overflow = 'hidden';
    nfInitializeGalleryEvents();
}

/**
 * Closes the gallery view
 */
function nfCloseGallery() {
    const overlay = document.getElementById('nf_gallery_overlay');
    if (!overlay) {
        window.nfLogger.warn('Gallery overlay not found when trying to close');
        return;
    }
    
    window.nfLogger.debug('Closing gallery', { 
        hasActiveClass: overlay.classList.contains('nf-gallery-active'),
        hasHiddenClass: overlay.classList.contains('nf-hidden'),
        computedStyle: window.getComputedStyle(overlay).display
    });
    
    // Remove active state (triggers CSS transition to hide)
    overlay.classList.remove('nf-gallery-active');
    
    // Restore body scroll immediately
    document.body.style.overflow = '';
    
    // Wait for transition to complete, then manually close and restore ticket detail state
    setTimeout(() => {
        // Manually close gallery without using modal system to preserve other modal states
        overlay.classList.add('nf-hidden');
        overlay.setAttribute('aria-hidden', 'true');
        
        // Remove blur from gallery
        overlay.classList.remove('nf-blur-bg');
        
        // Restore the ticket detail modal as the active (non-blurred) modal
        const ticketDetailContainer = document.getElementById('nf_ticketdetail_container');
        if (ticketDetailContainer && !ticketDetailContainer.classList.contains('nf-hidden')) {
            // Remove blur from ticket detail (make it active again)
            ticketDetailContainer.classList.remove('nf-blur-bg');
            ticketDetailContainer.setAttribute('aria-hidden', 'false');
            
            // IMPORTANT: Remove inert attribute to make it interactive again
            ticketDetailContainer.removeAttribute('inert');
            
            // Ensure background elements remain blurred and inert
            const backgroundElements = ['nf_modal_overlay', 'nf_ticketlist_container'];
            backgroundElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('nf-blur-bg');
                    el.setAttribute('inert', '');
                }
            });
            
            // Find a focusable element in the ticket detail modal
            const focusable = ticketDetailContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                ticketDetailContainer.focus();
            }
        }
        
        nfCleanupGalleryEvents();
        window.nfLogger.debug('Gallery closed and cleaned up');
    }, 300); // Match CSS transition duration
}

// Make nfCloseGallery available globally for the main keyboard handler
window.nfCloseGallery = nfCloseGallery;

/**
 * Loads an authenticated image for gallery display
 *
 * @param {string} imageUrl - URL of the image to load
 * @returns {Promise<string>} Data URL of the loaded image
 */
async function nfLoadAuthenticatedImage(imageUrl) {
    try {
        // Use nfApiFetch to get the raw response for binary data
        const response = await nfApiFetch(imageUrl, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${nf.userToken}` },
        });
        // nfApiFetch returns parsed JSON or text, but for images we need the raw response
        // If response is not a Response object, fallback:
        if (!(response instanceof Response)) {
            throw new Error('Image could not be loaded');
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        throw new Error('Image could not be loaded');
    }
}

/**
 * Displays the current image in the gallery
 */
async function nfDisplayCurrentImage() {
    const image = document.getElementById('nf_gallery_image');
    const info = document.getElementById('nf_gallery_info');
    if (!image || !nfGalleryImages[nfCurrentImageIndex]) return;
    const currentImage = nfGalleryImages[nfCurrentImageIndex];
    nfSetLoading(true);
    try {
        // Load authenticated image
        const dataUrl = await nfLoadAuthenticatedImage(currentImage.url);
        image.src = dataUrl;
        image.alt = currentImage.name || 'Attachment';
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
    } catch (error) {
        // Fallback: direct URL (may not work for authenticated endpoints)
        image.src = currentImage.url;
        image.alt = currentImage.name || 'Attachment';
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                setTimeout(resolve, 2000);
            });
        } catch (fallbackError) {
            window.nfLogger.warn('Image could not be loaded', fallbackError);
        }
    } finally {
        nfSetLoading(false);
    }
    // Show info if multiple images
    if (info && nfGalleryImages.length > 1) {
        info.textContent = `${nfCurrentImageIndex + 1} of ${nfGalleryImages.length}`;
        nfShow(info);
    } else if (info) {
        nfHide(info);
    }
}

/**
 * Updates navigation buttons based on current position
 */
function nfUpdateGalleryNavigation() {
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    if (!prevBtn || !nextBtn) return;
    if (nfGalleryImages.length <= 1) {
        nfHide(prevBtn);
        nfHide(nextBtn);
        return;
    }
    nfShow(prevBtn);
    nfShow(nextBtn);
    if (nfCurrentImageIndex === 0) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
    if (nfCurrentImageIndex === nfGalleryImages.length - 1) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
}

/**
 * Navigate to previous image
 */
async function nfGalleryPrevious() {
    if (nfCurrentImageIndex > 0) {
        nfCurrentImageIndex--;
        await nfDisplayCurrentImage();
        nfUpdateGalleryNavigation();
    }
}

/**
 * Navigate to next image
 */
async function nfGalleryNext() {
    if (nfCurrentImageIndex < nfGalleryImages.length - 1) {
        nfCurrentImageIndex++;
        await nfDisplayCurrentImage();
        nfUpdateGalleryNavigation();
    }
}

/**
 * Checks if a URL is an image file format
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if it is an image
 */
function nfIsImageFile(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    // Debug output for troubleshooting
    window.nfLogger.debug('nfIsImageFile checking URL', { url });
    // Special handling for Zammad API URLs (no file extensions)
    if (urlLower.includes('/api/v1/attachments/')) {
        window.nfLogger.debug('API attachment recognized as image', { url });
        return true;
    }
    // Check for standard file extensions for normal URLs
    const imageExtensions = NF_CONFIG?.security?.imageExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
    if (hasImageExtension) {
        window.nfLogger.debug('File extension recognized as image', { url });
        return true;
    }
    window.nfLogger.debug('URL not recognized as image', { url });
    return false;
}

/**
 * Opens the internal gallery view specifically for ticket attachments
 * Bypasses file extension check since API URLs have no extensions
 *
 * @param {string} imageUrl - URL of the image to display
 * @param {Array} allImages - Array of all available images for navigation
 */
async function nfOpenGalleryForAttachment(imageUrl, allImages = []) {
    nfSetLoading(true);
    try {
        nfGalleryImages = allImages;
        nfCurrentImageIndex = nfGalleryImages.findIndex(img => img.url === imageUrl);
        if (nfCurrentImageIndex === -1) {
            nfCurrentImageIndex = 0;
            nfGalleryImages = [{ url: imageUrl, name: 'Attachment' }];
        }
        const overlay = document.getElementById('nf_gallery_overlay');
        const image = document.getElementById('nf_gallery_image');
        if (!overlay || !image) {
            window.nfLogger.error('Gallery elements not found');
            return;
        }
        await nfDisplayCurrentImage();
        nfUpdateGalleryNavigation();
        overlay.classList.remove('nf-hidden');
        overlay.style.display = 'flex'; // Ensure it's visible
        overlay.classList.add('nf-gallery-active');
        document.body.style.overflow = 'hidden';
        nfInitializeGalleryEvents();
        
        // Use modal system to handle blur properly
        nfModal.open(overlay);
    } catch (error) {
        window.nfLogger.error('Error opening gallery', error);
    } finally {
        nfSetLoading(false);
    }
}

/**
 * Initializes event listeners for the gallery
 */
function nfInitializeGalleryEvents() {
    const overlay = document.getElementById('nf_gallery_overlay');
    const closeBtn = document.getElementById('nf_gallery_close');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    
    window.nfLogger.debug('Initializing gallery events', {
        overlay: !!overlay,
        closeBtn: !!closeBtn,
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn
    });
    
    nfCleanupGalleryEvents();
    
    if (closeBtn) {
        const closeBtnHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.nfLogger.debug('Close button clicked');
            nfCloseGallery();
        };
        closeBtn._nfClickHandler = closeBtnHandler;
        closeBtn.addEventListener('click', closeBtnHandler);
        window.nfLogger.debug('Close button event handler attached');
    } else {
        window.nfLogger.warn('Close button not found in DOM');
    }
    
    if (overlay) {
        const overlayHandler = (e) => {
            window.nfLogger.debug('Overlay clicked', { 
                target: e.target, 
                overlay: overlay,
                isOverlayTarget: e.target === overlay 
            });
            if (e.target === overlay) {
                window.nfLogger.debug('Overlay background clicked, closing gallery');
                nfCloseGallery();
            }
        };
        overlay._nfClickHandler = overlayHandler;
        overlay.addEventListener('click', overlayHandler);
        window.nfLogger.debug('Overlay event handler attached');
    } else {
        window.nfLogger.warn('Overlay not found in DOM');
    }
    
    if (prevBtn) {
        const prevHandler = (e) => {
            e.stopPropagation();
            nfGalleryPrevious();
        };
        prevBtn._nfClickHandler = prevHandler;
        prevBtn.addEventListener('click', prevHandler);
    }
    if (nextBtn) {
        const nextHandler = (e) => {
            e.stopPropagation();
            nfGalleryNext();
        };
        nextBtn._nfClickHandler = nextHandler;
        nextBtn.addEventListener('click', nextHandler);
    }
    document.addEventListener('keydown', nfGalleryKeyHandler);
    window.nfLogger.debug('Gallery events initialization complete');
}

/**
 * Removes event listeners from the gallery
 */
function nfCleanupGalleryEvents() {
    const closeBtn = document.getElementById('nf_gallery_close');
    const overlay = document.getElementById('nf_gallery_overlay');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    
    window.nfLogger.debug('Cleaning up gallery events', {
        closeBtn: !!closeBtn,
        overlay: !!overlay,
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn
    });
    
    // Store references to event handlers for proper cleanup
    if (closeBtn && closeBtn._nfClickHandler) {
        closeBtn.removeEventListener('click', closeBtn._nfClickHandler);
        delete closeBtn._nfClickHandler;
        window.nfLogger.debug('Close button event handler removed');
    }
    if (overlay && overlay._nfClickHandler) {
        overlay.removeEventListener('click', overlay._nfClickHandler);
        delete overlay._nfClickHandler;
        window.nfLogger.debug('Overlay event handler removed');
    }
    if (prevBtn && prevBtn._nfClickHandler) {
        prevBtn.removeEventListener('click', prevBtn._nfClickHandler);
        delete prevBtn._nfClickHandler;
    }
    if (nextBtn && nextBtn._nfClickHandler) {
        nextBtn.removeEventListener('click', nextBtn._nfClickHandler);
        delete nextBtn._nfClickHandler;
    }
    
    document.removeEventListener('keydown', nfGalleryKeyHandler);
    window.nfLogger.debug('Gallery event cleanup complete');
}

/**
 * Handles keyboard input in the gallery (Arrow keys only)
 * ESC key is handled by the main keyboard handler in nf-events.js
 *
 * @param {KeyboardEvent} e - Keyboard event
 */
function nfGalleryKeyHandler(e) {
    const overlay = document.getElementById('nf_gallery_overlay');
    // Only handle events when gallery is actually active and visible
    if (!overlay || !overlay.classList.contains('nf-gallery-active')) {
        return;
    }
    
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            e.stopPropagation();
            nfGalleryPrevious();
            break;
        case 'ArrowRight':
            e.preventDefault();
            e.stopPropagation();
            nfGalleryNext();
            break;
        // ESC is handled by main keyboard handler in nf-events.js
    }
}

/**
 * Extracts all image attachments from a ticket message element for gallery navigation
 *
 * @param {HTMLElement} messageElement - The message element with attachments
 * @returns {Array} Array of image objects for the gallery
 */
function nfExtractImagesFromMessage(messageElement) {
    const images = [];
    const thumbnails = messageElement.querySelectorAll('.nf-ticketdetail-thumb');
    thumbnails.forEach((thumb, index) => {
        const src = thumb.src || thumb.getAttribute('data-src');
        if (src && nfIsImageFile(src)) {
            images.push({
                url: src,
                name: thumb.alt || `Attachment ${index + 1}`
            });
        }
    });
    return images;
}

export { nfIsImageFile, nfOpenGalleryForAttachment, nfExtractImagesFromMessage, nfCloseGallery };
