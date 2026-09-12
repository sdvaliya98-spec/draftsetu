import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
/**
 * Centralized DraftCacheManager Utility
 * =====================================
 * Handles user-isolated and template-specific local draft saving, loading, clearing, and purging.
 * Includes error handling for corrupted data, meaningful-data detection, and automatic 30-day stale recovery draft purging.
 */

const DRAFT_CACHE_EXPIRY_DAYS = 30;

const DraftCacheManager = {
    // Sanitize user identifier for safe storage keys
    normalizeUserKey: (userId) => {
        if (!userId) return 'anon';
        if (typeof userId === 'string') {
            const clean = userId.trim().toLowerCase().replace(/[^a-z0-9_@-]/g, '_');
            return clean || 'anon';
        }
        return String(userId);
    },

    // Helper to generate user-isolated storage keys
    getDraftKey: (templateId, userId) => `draftsetu_recovery_${DraftCacheManager.normalizeUserKey(userId)}_${templateId}`,
    getTrackingIdKey: (templateId, userId) => `draftsetu_recovery_track_${DraftCacheManager.normalizeUserKey(userId)}_${templateId}`,
    getLockedKey: (templateId, userId) => `draftsetu_recovery_locked_${DraftCacheManager.normalizeUserKey(userId)}_${templateId}`,
    getTimestampKey: (templateId, userId) => `draftsetu_recovery_time_${DraftCacheManager.normalizeUserKey(userId)}_${templateId}`,

    /**
     * Save draft state to localStorage
     */
    save: (templateId, data, trackingId, isLocked, userId) => {
        if (!templateId) {
            console.warn("⚠️ [DraftCacheManager] Cannot save draft: activeTemplateId is missing.");
            return;
        }
        const userKey = DraftCacheManager.normalizeUserKey(userId);
        console.debug(`💾 [DraftCacheManager] Saving recovery draft for template: "${templateId}", user: "${userKey}", trackingId: "${trackingId || 'none'}"`);
        try {
            const draftKey = DraftCacheManager.getDraftKey(templateId, userId);
            const trackingKey = DraftCacheManager.getTrackingIdKey(templateId, userId);
            const lockedKey = DraftCacheManager.getLockedKey(templateId, userId);
            const timestampKey = DraftCacheManager.getTimestampKey(templateId, userId);

            localStorage.setItem(draftKey, JSON.stringify(data));
            if (trackingId) {
                localStorage.setItem(trackingKey, trackingId);
            } else {
                localStorage.removeItem(trackingKey);
            }
            localStorage.setItem(lockedKey, String(isLocked));
            localStorage.setItem(timestampKey, new Date().toISOString());
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Failed to write draft to localStorage (quota exceeded or private browsing):`, e);
        }
    },

    /**
     * Load draft state from localStorage
     */
    load: (templateId, userId) => {
        if (!templateId) {
            console.warn("⚠️ [DraftCacheManager] Cannot load draft: activeTemplateId is missing.");
            return null;
        }
        const userKey = DraftCacheManager.normalizeUserKey(userId);
        console.debug(`🔄 [DraftCacheManager] Loading recovery draft for template: "${templateId}", user: "${userKey}"`);
        try {
            const draftKey = DraftCacheManager.getDraftKey(templateId, userId);
            const trackingKey = DraftCacheManager.getTrackingIdKey(templateId, userId);
            const lockedKey = DraftCacheManager.getLockedKey(templateId, userId);
            const timestampKey = DraftCacheManager.getTimestampKey(templateId, userId);

            let cachedDraft = localStorage.getItem(draftKey);
            let cachedTrackingId = localStorage.getItem(trackingKey);
            let cachedLocked = localStorage.getItem(lockedKey);
            let cachedTimestamp = localStorage.getItem(timestampKey);

            // Backward compatibility fallback for legacy anonymous keys
            if (!cachedDraft && userKey === 'anon') {
                const legacyDraftKey = `temp_draft_${templateId}`;
                const legacyDraft = localStorage.getItem(legacyDraftKey);
                if (legacyDraft) {
                    cachedDraft = legacyDraft;
                    cachedTrackingId = localStorage.getItem(`temp_tracking_id_${templateId}`);
                    cachedLocked = localStorage.getItem(`temp_locked_${templateId}`);
                    cachedTimestamp = localStorage.getItem(`temp_draft_time_${templateId}`);
                }
            }

            if (!cachedDraft) {
                console.debug(`ℹ️ [DraftCacheManager] No cached draft found for template: "${templateId}", user: "${userKey}"`);
                return null;
            }

            // Error handling for corrupted localStorage JSON
            let parsedData;
            try {
                parsedData = JSON.parse(cachedDraft);
            } catch (err) {
                console.error(`❌ [DraftCacheManager] Corrupted localStorage data detected for template "${templateId}". Purging corrupted cache.`, err);
                DraftCacheManager.clear(templateId, userId);
                return null;
            }

            return {
                data: parsedData,
                trackingId: cachedTrackingId || null,
                isLocked: cachedLocked === 'true',
                timestamp: cachedTimestamp || null
            };
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Failed to read from localStorage:`, e);
            return null;
        }
    },

    /**
     * Determine if cached draft contains meaningful user input (not just default/empty state)
     */
    isMeaningfulDraft: (data, emptyState = {}) => {
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
            return false;
        }

        for (const key of Object.keys(data)) {
            const val = data[key];
            const emptyVal = emptyState ? emptyState[key] : undefined;

            if (val === null || val === undefined) continue;

            if (typeof val === 'string') {
                const trimmed = val.trim();
                const emptyTrimmed = typeof emptyVal === 'string' ? emptyVal.trim() : '';
                if (trimmed !== '' && trimmed !== emptyTrimmed) {
                    return true;
                }
            } else if (typeof val === 'number') {
                if (val !== emptyVal && (emptyVal === undefined || val !== 0)) {
                    return true;
                }
            } else if (typeof val === 'boolean') {
                if (val !== emptyVal && emptyVal !== undefined) {
                    return true;
                }
            } else if (Array.isArray(val)) {
                // Check repeater rows for any filled fields
                for (const row of val) {
                    if (row && typeof row === 'object') {
                        for (const subKey of Object.keys(row)) {
                            if (subKey === 'index') continue;
                            const subVal = row[subKey];
                            if (typeof subVal === 'string' && subVal.trim() !== '') {
                                return true;
                            } else if (typeof subVal === 'number' && subVal !== 0) {
                                return true;
                            }
                        }
                    }
                }
            } else if (typeof val === 'object' && val !== null) {
                if (Object.keys(val).length > 0) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * Clear all cached draft items for a specific template & user
     */
    clear: (templateId, userId) => {
        if (!templateId) return;
        const userKey = DraftCacheManager.normalizeUserKey(userId);
        console.debug(`🧹 [DraftCacheManager] Clearing draft cache for template: "${templateId}", user: "${userKey}"`);
        try {
            localStorage.removeItem(DraftCacheManager.getDraftKey(templateId, userId));
            localStorage.removeItem(DraftCacheManager.getTrackingIdKey(templateId, userId));
            localStorage.removeItem(DraftCacheManager.getLockedKey(templateId, userId));
            localStorage.removeItem(DraftCacheManager.getTimestampKey(templateId, userId));

            // Also clean legacy keys if they exist
            localStorage.removeItem(`temp_draft_${templateId}`);
            localStorage.removeItem(`temp_tracking_id_${templateId}`);
            localStorage.removeItem(`temp_locked_${templateId}`);
            localStorage.removeItem(`temp_draft_time_${templateId}`);
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Failed to clear template draft keys:`, e);
        }
    },

    /**
     * Clear legacy global cache keys to ensure no stale fallback occurs
     */
    clearAllGlobal: () => {
        console.debug(`🧹 [DraftCacheManager] Purging legacy and global draft caches`);
        try {
            localStorage.removeItem("temp_draft");
            localStorage.removeItem("temp_draft_data");
            localStorage.removeItem("active_tracking_id");
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Failed to clear legacy keys:`, e);
        }
    },

    /**
     * Automatically purge stale temporary recovery drafts older than 30 days
     */
    purgeStaleDrafts: () => {
        console.debug(`🧹 [DraftCacheManager] Checking for stale temporary recovery drafts older than ${DRAFT_CACHE_EXPIRY_DAYS} days...`);
        try {
            const now = new Date();
            const keys = Object.keys(localStorage);
            let purgedCount = 0;

            keys.forEach(key => {
                if (key.startsWith('draftsetu_recovery_time_') || key.startsWith('temp_draft_time_')) {
                    const timestampStr = localStorage.getItem(key);
                    if (timestampStr) {
                        const savedTime = new Date(timestampStr);
                        const diffTime = Math.abs(now - savedTime);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays > DRAFT_CACHE_EXPIRY_DAYS) {
                            localStorage.removeItem(key);
                            if (key.startsWith('draftsetu_recovery_time_')) {
                                const rest = key.replace('draftsetu_recovery_time_', '');
                                localStorage.removeItem(`draftsetu_recovery_${rest}`);
                                localStorage.removeItem(`draftsetu_recovery_track_${rest}`);
                                localStorage.removeItem(`draftsetu_recovery_locked_${rest}`);
                            } else if (key.startsWith('temp_draft_time_')) {
                                const tplId = key.replace('temp_draft_time_', '');
                                localStorage.removeItem(`temp_draft_${tplId}`);
                                localStorage.removeItem(`temp_tracking_id_${tplId}`);
                                localStorage.removeItem(`temp_locked_${tplId}`);
                            }
                            purgedCount++;
                        }
                    }
                }
            });
            if (purgedCount > 0) {
                console.log(`✅ [DraftCacheManager] Purged ${purgedCount} stale temporary recovery draft(s).`);
            } else {
                console.debug(`✅ [DraftCacheManager] No stale temporary recovery drafts to purge.`);
            }
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Error during stale drafts purge:`, e);
        }
    }
};

// Bind to window for global access
window.DraftCacheManager = DraftCacheManager;

