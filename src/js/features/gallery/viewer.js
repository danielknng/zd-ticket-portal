/**
 * @fileoverview Internal gallery view for ticket attachments
 * @author danielknng
 * @module features/gallery/viewer
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { apiGet, apiFetch } from '../../api/http.js';
import { NF_CONFIG } from '../../core/config.js';
import { TIMING_CONSTANTS } from '../../core/constants.js';
import { dom } from '../../ui/dom.js';
import appState from '../../state/store.js';
import { show, hide, setLoading } from '../../ui/helpers.js';
import { Modal } from '../../ui/modal.js';
import { FocusUtils } from '../../utils/focus.js';
import nfLogger from '../../core/logger.js';

/**
 * Gallery state management
 * @private
 */
let galleryImages = [];
let currentImageIndex = 0;

/**
 * Opens the internal gallery view for an image
 * @param {string} imageUrl - URL of the image to display
 * @param {Array} allImages - Array of all available images for navigation
 * @param {number} startIndex - Index of the image to start with
 */
export async function openGallery(imageUrl, allImages = [], startIndex = 0) {
    if (!isImageFile(imageUrl)) {
        window.open(imageUrl, '_blank');
        return;
    }
    
    galleryImages = allImages.filter(img => isImageFile(img.url));
    currentImageIndex = galleryImages.findIndex(img => img.url === imageUrl);
    if (currentImageIndex === -1) {
        currentImageIndex = 0;
        galleryImages = [{ url: imageUrl, name: 'Attachment' }];
    }
    
    const overlay = document.getElementById('nf_gallery_overlay');
    const image = document.getElementById('nf_gallery_image');
    if (!overlay || !image) {
        window.open(imageUrl, '_blank');
        return;
    }
    
    await displayCurrentImage();
    updateGalleryNavigation();
    show(overlay);
    overlay.classList.add('nf-gallery-active');
    document.body.style.overflow = 'hidden';
    initializeGalleryEvents();
}

/**
 * Closes the gallery view
 */
export function closeGallery() {
    const overlay = document.getElementById('nf_gallery_overlay');
    if (!overlay) {
        nfLogger.warn('Gallery overlay not found when trying to close');
        return;
    }
    
    nfLogger.debug('Closing gallery');
    
    // Remove active state (triggers CSS transition to hide)
    overlay.classList.remove('nf-gallery-active');
    
    // Restore body scroll immediately
    document.body.style.overflow = '';
    
    // Wait for transition to complete using transitionend event
    const handleTransitionEnd = (e) => {
        if (e.target !== overlay) return;
        
        overlay.removeEventListener('transitionend', handleTransitionEnd);
        
        overlay.classList.add('nf-hidden');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('nf-blur-bg');
        
        // Restore the ticket detail modal as the active modal
        const ticketDetailContainer = document.getElementById('nf_ticketdetail_container');
        if (ticketDetailContainer && !ticketDetailContainer.classList.contains('nf-hidden')) {
            ticketDetailContainer.classList.remove('nf-blur-bg');
            ticketDetailContainer.setAttribute('aria-hidden', 'false');
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
            
            FocusUtils.focusFirst(ticketDetailContainer);
        }
        
        cleanupGalleryEvents();
        nfLogger.debug('Gallery closed and cleaned up');
    };
    
    overlay.addEventListener('transitionend', handleTransitionEnd, { once: true });
    
    // Fallback timeout
    setTimeout(() => {
        if (!overlay.classList.contains('nf-gallery-active') && !overlay.classList.contains('nf-hidden')) {
            handleTransitionEnd({ target: overlay });
        }
    }, TIMING_CONSTANTS.TRANSITION_DURATION_MS);
}

/**
 * Loads an authenticated image for gallery display
 * @private
 * @param {string} imageUrl - URL of the image to load
 * @returns {Promise<string>} Data URL of the loaded image
 */
async function loadAuthenticatedImage(imageUrl) {
    try {
        const userToken = appState.get('userToken');
        const response = await apiFetch(imageUrl, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${userToken}` },
        });
        
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
 * @private
 */
async function displayCurrentImage() {
    const image = document.getElementById('nf_gallery_image');
    const info = document.getElementById('nf_gallery_info');
    if (!image || !galleryImages[currentImageIndex]) return;
    
    const currentImage = galleryImages[currentImageIndex];
    setLoading(true);
    
    try {
        const dataUrl = await loadAuthenticatedImage(currentImage.url);
        image.src = dataUrl;
        image.alt = currentImage.name || 'Attachment';
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
    } catch (error) {
        // Fallback: direct URL
        image.src = currentImage.url;
        image.alt = currentImage.name || 'Attachment';
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                setTimeout(resolve, TIMING_CONSTANTS.IMAGE_LOAD_TIMEOUT_MS);
            });
        } catch (fallbackError) {
            nfLogger.warn('Image could not be loaded', fallbackError);
        }
    } finally {
        setLoading(false);
    }
    
    // Show info if multiple images
    if (info && galleryImages.length > 1) {
        info.textContent = `${currentImageIndex + 1} of ${galleryImages.length}`;
        show(info);
    } else if (info) {
        hide(info);
    }
}

/**
 * Updates navigation buttons based on current position
 * @private
 */
function updateGalleryNavigation() {
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    if (!prevBtn || !nextBtn) return;
    
    if (galleryImages.length <= 1) {
        hide(prevBtn);
        hide(nextBtn);
        return;
    }
    
    show(prevBtn);
    show(nextBtn);
    
    if (currentImageIndex === 0) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
    
    if (currentImageIndex === galleryImages.length - 1) {
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
export async function galleryPrevious() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        await displayCurrentImage();
        updateGalleryNavigation();
    }
}

/**
 * Navigate to next image
 */
export async function galleryNext() {
    if (currentImageIndex < galleryImages.length - 1) {
        currentImageIndex++;
        await displayCurrentImage();
        updateGalleryNavigation();
    }
}

/**
 * Checks if a URL is an image file format
 * @param {string} url - URL to check
 * @returns {boolean} True if it is an image
 */
export function isImageFile(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    
    // Special handling for Zammad API URLs (no file extensions)
    if (urlLower.includes('/api/v1/attachments/')) {
        return true;
    }
    
    // Check for standard file extensions
    const imageExtensions = NF_CONFIG?.security?.imageExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some(ext => urlLower.includes(ext));
}

/**
 * Opens the internal gallery view specifically for ticket attachments
 * @param {string} imageUrl - URL of the image to display
 * @param {Array} allImages - Array of all available images for navigation
 */
export async function openGalleryForAttachment(imageUrl, allImages = []) {
    setLoading(true);
    try {
        galleryImages = allImages;
        currentImageIndex = galleryImages.findIndex(img => img.url === imageUrl);
        if (currentImageIndex === -1) {
            currentImageIndex = 0;
            galleryImages = [{ url: imageUrl, name: 'Attachment' }];
        }
        
        const overlay = document.getElementById('nf_gallery_overlay');
        const image = document.getElementById('nf_gallery_image');
        if (!overlay || !image) {
            nfLogger.error('Gallery elements not found');
            return;
        }
        
        await displayCurrentImage();
        updateGalleryNavigation();
        overlay.classList.remove('nf-hidden');
        overlay.style.display = 'flex';
        overlay.classList.add('nf-gallery-active');
        document.body.style.overflow = 'hidden';
        initializeGalleryEvents();
        
        Modal.open(overlay);
    } catch (error) {
        nfLogger.error('Error opening gallery', error);
    } finally {
        setLoading(false);
    }
}

/**
 * Initializes event listeners for the gallery
 * @private
 */
function initializeGalleryEvents() {
    const overlay = document.getElementById('nf_gallery_overlay');
    const closeBtn = document.getElementById('nf_gallery_close');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    
    if (!overlay) return;
    
    // Remove existing listeners to prevent duplicates
    cleanupGalleryEvents();
    
    // Close button
    if (closeBtn) {
        closeBtn.onclick = closeGallery;
    }
    
    // Navigation buttons
    if (prevBtn) {
        prevBtn.onclick = galleryPrevious;
    }
    if (nextBtn) {
        nextBtn.onclick = galleryNext;
    }
    
    // Keyboard navigation
    overlay._galleryKeyHandler = (e) => {
        if (e.key === 'Escape') {
            closeGallery();
        } else if (e.key === 'ArrowLeft') {
            galleryPrevious();
        } else if (e.key === 'ArrowRight') {
            galleryNext();
        }
    };
    overlay.addEventListener('keydown', overlay._galleryKeyHandler);
}

/**
 * Cleans up gallery event listeners
 * @private
 */
function cleanupGalleryEvents() {
    const overlay = document.getElementById('nf_gallery_overlay');
    const closeBtn = document.getElementById('nf_gallery_close');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    
    if (overlay && overlay._galleryKeyHandler) {
        overlay.removeEventListener('keydown', overlay._galleryKeyHandler);
        delete overlay._galleryKeyHandler;
    }
    
    if (closeBtn) closeBtn.onclick = null;
    if (prevBtn) prevBtn.onclick = null;
    if (nextBtn) nextBtn.onclick = null;
}


