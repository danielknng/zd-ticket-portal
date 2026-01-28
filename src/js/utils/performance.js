/**
 * @fileoverview Performance measurement wrapper to eliminate duplication
 * @author danielknng
 * @module utils/performance
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { safe } from './safe-access.js';
import nfLogger from '../core/logger.js';

/**
 * Wraps a function with performance measurement
 * Eliminates 6+ duplications of performance measurement pattern
 * 
 * @param {Function} fn - Function to wrap
 * @param {string} operationName - Name of the operation for measurement
 * @returns {Function} Wrapped function with performance measurement
 */
export function withPerformance(fn, operationName, performanceMonitor = null) {
    return async function(...args) {
        const shouldMeasure = performanceMonitor && safe.config?.debug?.enabled;
        
        const markName = `${operationName.toLowerCase().replace(/\s+/g, '-')}-start`;
        
        if (shouldMeasure) {
            performanceMonitor.mark(markName);
        }
        
        try {
            const result = await fn.apply(this, args);
            if (shouldMeasure) {
                performanceMonitor.measure(operationName, markName);
            }
            return result;
        } catch (error) {
            if (shouldMeasure) {
                performanceMonitor.measure(operationName, markName);
            }
            throw error;
        }
    };
}

/**
 * Simple performance monitoring class for measuring execution times
 * Uses the native Performance API for precise timing
 */
export class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }
    
    /**
     * Sets a performance mark for the start of a measurement
     * @param {string} markName - Unique name for the mark
     */
    mark(markName) {
        const timestamp = performance.now();
        this.marks.set(markName, timestamp);
        if (nfLogger) {
            nfLogger.debug(`Performance mark set: ${markName}`, { timestamp });
        }
    }
    
    /**
     * Ends a measurement and calculates the elapsed time
     * @param {string} measureName - Name for the measurement
     * @param {string} startMark - Name of the start mark
     */
    measure(measureName, startMark) {
        const startTime = this.marks.get(startMark);
        if (!startTime) {
            if (nfLogger) {
                nfLogger.warn(`Performance mark not found: ${startMark}`);
            }
            return;
        }
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.measures.set(measureName, duration);
        if (nfLogger) {
            nfLogger.info(`Performance measure: ${measureName}`, { 
                duration: `${duration.toFixed(2)}ms`,
                startMark 
            });
        }
    }
    
    /**
     * Gets a stored measurement
     * @param {string} measureName - Name of the measurement
     * @returns {number|null} Duration in ms or null
     */
    getMeasure(measureName) {
        return this.measures.get(measureName) || null;
    }
}

// Create global performance instance
const performanceMonitor = new PerformanceMonitor();


export default performanceMonitor;

