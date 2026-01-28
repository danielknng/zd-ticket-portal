// Author: Daniel Könning
// ===============================
// nf-gallery.js - Internal gallery view for attachments
// ===============================
// This file implements an internal gallery view for images in ticket attachments
// with navigation between multiple images and fallback to a new tab for documents.

// ===============================
// GALLERY MANAGEMENT
// ===============================

let nfGalleryImages = [];  // Array of all images in the current view
let nfCurrentImageIndex = 0;  // Index of the currently displayed image

/**
 * Opens the internal gallery view for an image
 * If it is a document, it will be opened in a new tab (fallback)
 *
 * @param {string} imageUrl - URL of the image to display
 * @param {Array} allImages - Array of all available images for navigation
 * @param {number} startIndex - Index of the image to start with
 */
async function nfOpenGallery(imageUrl, allImages = [], startIndex = 0) {
    // ===============================
    // CHECK IMAGE TYPE
    // ===============================
    if (!nfIsImageFile(imageUrl)) {
        // Non-images open in new tab (fallback)
        window.open(imageUrl, '_blank');
        return;
    }
    // ===============================
    // INITIALIZE GALLERY DATA
    // ===============================
    nfGalleryImages = allImages.filter(img => nfIsImageFile(img.url));
    nfCurrentImageIndex = nfGalleryImages.findIndex(img => img.url === imageUrl);
    if (nfCurrentImageIndex === -1) {
        // Fallback: image not found in list
        nfCurrentImageIndex = 0;
        nfGalleryImages = [{ url: imageUrl, name: 'Attachment' }];
    }
    // ===============================
    // GET GALLERY ELEMENTS
    // ===============================
    const overlay = document.getElementById('nf_gallery_overlay');
    const image = document.getElementById('nf_gallery_image');
    const closeBtn = document.getElementById('nf_gallery_close');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    const info = document.getElementById('nf_gallery_info');
    if (!overlay || !image) {
        // Fallback if gallery elements are not available
        window.open(imageUrl, '_blank');
        return;
    }
    // ===============================
    // SHOW GALLERY
    // ===============================
    await nfDisplayCurrentImage();
    nfUpdateGalleryNavigation();
    overlay.classList.remove('nf-hidden');
    overlay.classList.add('nf-gallery-active');
    document.body.style.overflow = 'hidden';
    // ===============================
    // INITIALIZE EVENT LISTENERS
    // ===============================
    nfInitializeGalleryEvents();
}

/**
 * Closes the gallery view
 */
function nfCloseGallery() {
    const overlay = document.getElementById('nf_gallery_overlay');
    if (!overlay) return;
    overlay.classList.remove('nf-gallery-active');
    overlay.classList.add('nf-hidden');
    document.body.style.overflow = '';
    nfCleanupGalleryEvents();
}

/**
 * Loads an authenticated image for gallery display
 *
 * @param {string} imageUrl - URL of the image to load
 * @returns {Promise<string>} Data URL of the loaded image
 */
async function nfLoadAuthenticatedImage(imageUrl) {
    try {
        const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${nf.userToken}`
            }
        });
        if (!response.ok) {
            throw new Error('Image could not be loaded');
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image:', error);
        throw error;
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
            console.warn('Image could not be loaded:', fallbackError);
        }
    } finally {
        nfSetLoading(false);
    }
    // Show info if multiple images
    if (info && nfGalleryImages.length > 1) {
        info.textContent = `${nfCurrentImageIndex + 1} of ${nfGalleryImages.length}`;
        info.classList.remove('nf-hidden');
    } else if (info) {
        info.classList.add('nf-hidden');
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
        prevBtn.classList.add('nf-hidden');
        nextBtn.classList.add('nf-hidden');
        return;
    }
    prevBtn.classList.remove('nf-hidden');
    nextBtn.classList.remove('nf-hidden');
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
    console.log('nfIsImageFile checking URL:', url);
    // Special handling for Zammad API URLs (no file extensions)
    if (urlLower.includes('/api/v1/attachments/')) {
        console.log('API attachment recognized as image:', url);
        return true;
    }
    // Check for standard file extensions for normal URLs
    const imageExtensions = window.NF_CONFIG?.security?.imageExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
    if (hasImageExtension) {
        console.log('File extension recognized as image:', url);
        return true;
    }
    console.log('URL not recognized as image:', url);
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
            console.error('Gallery elements not found');
            return;
        }
        await nfDisplayCurrentImage();
        nfUpdateGalleryNavigation();
        overlay.classList.remove('nf-hidden');
        overlay.classList.add('nf-gallery-active');
        document.body.style.overflow = 'hidden';
        nfInitializeGalleryEvents();
    } catch (error) {
        console.error('Error opening gallery:', error);
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
    nfCleanupGalleryEvents();
    if (closeBtn) {
        closeBtn.addEventListener('click', nfCloseGallery);
    }
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                nfCloseGallery();
            }
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nfGalleryPrevious();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nfGalleryNext();
        });
    }
    document.addEventListener('keydown', nfGalleryKeyHandler);
}

/**
 * Removes event listeners from the gallery
 */
function nfCleanupGalleryEvents() {
    const closeBtn = document.getElementById('nf_gallery_close');
    const overlay = document.getElementById('nf_gallery_overlay');
    const prevBtn = document.getElementById('nf_gallery_prev');
    const nextBtn = document.getElementById('nf_gallery_next');
    if (closeBtn) {
        closeBtn.removeEventListener('click', nfCloseGallery);
    }
    if (overlay) {
        overlay.removeEventListener('click', nfCloseGallery);
    }
    if (prevBtn) {
        prevBtn.removeEventListener('click', nfGalleryPrevious);
    }
    if (nextBtn) {
        nextBtn.removeEventListener('click', nfGalleryNext);
    }
    document.removeEventListener('keydown', nfGalleryKeyHandler);
}

/**
 * Handles keyboard input in the gallery
 *
 * @param {KeyboardEvent} e - Keyboard event
 */
function nfGalleryKeyHandler(e) {
    const overlay = document.getElementById('nf_gallery_overlay');
    if (!overlay || overlay.classList.contains('nf-hidden')) {
        return;
    }
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            e.stopPropagation();
            nfCloseGallery();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            nfGalleryPrevious();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nfGalleryNext();
            break;
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
