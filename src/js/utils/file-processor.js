/**
 * @fileoverview File processing utilities to eliminate duplication
 * @author danielknng
 * @module utils/file-processor
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Processes files to attachments format for API
 * Eliminates duplication of file-to-base64 loop
 * 
 * @param {FileList|Array<File>} files - Files to process
 * @param {Function} fileToBase64 - Function to convert file to base64
 * @returns {Promise<Array<Object>>} Array of attachment objects
 */
export async function processFilesToAttachments(files, fileToBase64) {
    if (!files || files.length === 0) {
        return [];
    }
    
    const attachments = [];
    for (const file of files) {
        const base64Data = await fileToBase64(file);
        attachments.push({
            filename: file.name,
            data: base64Data,
            'mime-type': file.type
        });
    }
    return attachments;
}

export default processFilesToAttachments;

