/**
 * @fileoverview Authentication service for user login
 * @author danielknng
 * @module api/auth
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { ZammadApiClient } from './client.js';
import { createApiError } from './http.js';
import appState from '../state/store.js';
import eventBus from '../state/events.js';
import { NF_CONFIG } from '../core/config.js';
import { withPerformance } from '../utils/performance.js';
import { withErrorHandling } from '../utils/error-boundary.js';
import nfLogger from '../core/logger.js';
import Storage from '../core/storage.js';
import languageManager from '../i18n/manager.js';

/**
 * Authentication service
 * Handles user authentication and session management
 */
export class AuthService {
    /**
     * @param {ZammadApiClient} apiClient - API client instance
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    /**
     * Authenticates a user against the Zammad API and stores the credentials
     * @param {string} username - Username or email address
     * @param {string} password - User password in plain text
     * @returns {Promise<Object>} User data object from Zammad
     */
    async authenticate(username, password) {
        return withPerformance(
            withErrorHandling(async () => {
                const cleanUsername = username.trim();
                const cleanPassword = password.trim();

                if (!cleanUsername || !cleanPassword) {
                    const errorMessage = this._getMessage('missingCredentials');
                    throw createApiError(errorMessage, 'MISSING_CREDENTIALS');
                }

                nfLogger.info('Attempting authentication', { username: cleanUsername });

                let userData;
                try {
                    userData = await this.apiClient.authenticate(cleanUsername, cleanPassword);
                } catch (apiError) {
                    // Handle authentication errors with login attempt tracking
                    if (apiError.code === 'API_INVALID_CREDENTIALS' || apiError.code === 'API_AUTH_FAILED') {
                        const currentAttempts = appState.get('loginAttempts') || 0;
                        const newAttempts = currentAttempts + 1;
                        appState.set('loginAttempts', newAttempts);
                        const maxAttempts = NF_CONFIG.ui.login.maxAttempts;
                        
                        if (newAttempts >= maxAttempts) {
                            appState.set('isAccountLocked', true);
                            const lockoutMessage = this._getMessage('lockoutMessage');
                            eventBus.emit('login:failed', { reason: 'ACCOUNT_LOCKED', message: lockoutMessage });
                            throw createApiError(lockoutMessage, 'ACCOUNT_LOCKED');
                        }
                        
                        const errorMessage = this._getMessage('invalidCredentials');
                        const warningMessage = this._getMessage('attemptsWarning');
                        const error = createApiError(errorMessage, 'INVALID_CREDENTIALS');
                        error.attemptsWarning = warningMessage;
                        eventBus.emit('login:failed', { 
                            reason: 'INVALID_CREDENTIALS', 
                            message: errorMessage, 
                            attempts: newAttempts 
                        });
                        throw error;
                    }
                    // Other HTTP errors (500, 503, etc.)
                    const errorMessage = this._getMessage('authFailed', { 
                        status: apiError.details?.status 
                    });
                    eventBus.emit('login:failed', { 
                        reason: 'AUTH_FAILED', 
                        message: errorMessage, 
                        status: apiError.details?.status 
                    });
                    throw createApiError(errorMessage, 'AUTH_FAILED', { 
                        status: apiError.details?.status 
                    });
                }
                
                // Get credentials from client (it was set during authentication)
                const credentials = this.apiClient.authToken;
                
                // Update state management
                appState.setMultiple({
                    userToken: credentials,
                    userId: userData.id,
                    loginAttempts: 0,
                    isAccountLocked: false
                });
                
                // Emit login success event
                eventBus.emit('auth:login', { id: userData.id, userId: userData.id, userData });
                
                // Store session in localStorage
                Storage.set('nf_session', {
                    userId: userData.id,
                    userToken: credentials,
                    timestamp: Date.now()
                });
                
                nfLogger.info('Authentication successful', { userId: userData.id });
                
                return userData;
            }, 'Authentication'),
            'Authentication'
        )();
    }

    /**
     * Logout user and clear session
     */
    logout() {
        appState.reset();
        Storage.remove('nf_session');
        this.apiClient.setAuthToken(null);
        eventBus.emit('logout:success');
        nfLogger.info('User logged out');
    }

    /**
     * Get message from language system
     * @private
     * @param {string} key - Message key
     * @param {Object} [placeholders] - Placeholder values
     * @returns {string} Message text
     */
    _getMessage(key, placeholders = {}) {
        if (!languageManager) return key;
        return languageManager.getMessage(key, placeholders);
    }
}

export default AuthService;

