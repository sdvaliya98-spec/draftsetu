import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
/**
 * Centralized DraftCacheManager Utility
 * =====================================
 * Handles template-specific local draft saving, loading, clearing, and purging.
 * Includes error handling for corrupted data and automatic 30-day stale draft purging.
 */

const DRAFT_CACHE_EXPIRY_DAYS = 30;

const DraftCacheManager = {
    // Helper to generate storage keys
    getDraftKey: (templateId) => `temp_draft_${templateId}`,
    getTrackingIdKey: (templateId) => `temp_tracking_id_${templateId}`,
    getLockedKey: (templateId) => `temp_locked_${templateId}`,
    getTimestampKey: (templateId) => `temp_draft_time_${templateId}`,

    /**
     * Save draft state to localStorage
     */
    save: (templateId, data, trackingId, isLocked) => {
        if (!templateId) {
            console.warn("⚠️ [DraftCacheManager] Cannot save draft: activeTemplateId is missing.");
            return;
        }
        console.debug(`💾 [DraftCacheManager] Saving draft for template: "${templateId}", trackingId: "${trackingId || 'none'}", isLocked: ${isLocked}`);
        try {
            const draftKey = DraftCacheManager.getDraftKey(templateId);
            const trackingKey = DraftCacheManager.getTrackingIdKey(templateId);
            const lockedKey = DraftCacheManager.getLockedKey(templateId);
            const timestampKey = DraftCacheManager.getTimestampKey(templateId);

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
    load: (templateId) => {
        if (!templateId) {
            console.warn("⚠️ [DraftCacheManager] Cannot load draft: activeTemplateId is missing.");
            return null;
        }
        console.debug(`🔄 [DraftCacheManager] Loading draft for template: "${templateId}"`);
        try {
            const draftKey = DraftCacheManager.getDraftKey(templateId);
            const trackingKey = DraftCacheManager.getTrackingIdKey(templateId);
            const lockedKey = DraftCacheManager.getLockedKey(templateId);

            const cachedDraft = localStorage.getItem(draftKey);
            const cachedTrackingId = localStorage.getItem(trackingKey);
            const cachedLocked = localStorage.getItem(lockedKey);

            if (!cachedDraft) {
                console.debug(`ℹ️ [DraftCacheManager] No cached draft found for template: "${templateId}"`);
                return null;
            }

            // Error handling for corrupted localStorage JSON
            let parsedData;
            try {
                parsedData = JSON.parse(cachedDraft);
            } catch (err) {
                console.error(`❌ [DraftCacheManager] Corrupted localStorage data detected for template "${templateId}". Purging corrupted cache.`, err);
                DraftCacheManager.clear(templateId);
                return null;
            }

            return {
                data: parsedData,
                trackingId: cachedTrackingId || null,
                isLocked: cachedLocked === 'true'
            };
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Failed to read from localStorage:`, e);
            return null;
        }
    },

    /**
     * Clear all cached draft items for a specific template
     */
    clear: (templateId) => {
        if (!templateId) return;
        console.debug(`🧹 [DraftCacheManager] Clearing draft cache for template: "${templateId}"`);
        try {
            localStorage.removeItem(DraftCacheManager.getDraftKey(templateId));
            localStorage.removeItem(DraftCacheManager.getTrackingIdKey(templateId));
            localStorage.removeItem(DraftCacheManager.getLockedKey(templateId));
            localStorage.removeItem(DraftCacheManager.getTimestampKey(templateId));
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
     * Automatically purge stale drafts older than 30 days
     */
    purgeStaleDrafts: () => {
        console.debug(`🧹 [DraftCacheManager] Checking for stale drafts older than ${DRAFT_CACHE_EXPIRY_DAYS} days...`);
        try {
            const now = new Date();
            const keys = Object.keys(localStorage);
            let purgedCount = 0;

            keys.forEach(key => {
                if (key.startsWith('temp_draft_time_')) {
                    const templateId = key.replace('temp_draft_time_', '');
                    const timestampStr = localStorage.getItem(key);
                    if (timestampStr) {
                        const savedTime = new Date(timestampStr);
                        const diffTime = Math.abs(now - savedTime);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > DRAFT_CACHE_EXPIRY_DAYS) {
                            console.warn(`🧹 [DraftCacheManager] Stale draft detected for template "${templateId}" (saved ${diffDays} days ago). Purging.`);
                            DraftCacheManager.clear(templateId);
                            purgedCount++;
                        }
                    }
                }
            });
            if (purgedCount > 0) {
                console.log(`✅ [DraftCacheManager] Purged ${purgedCount} stale draft(s).`);
            } else {
                console.debug(`✅ [DraftCacheManager] No stale drafts to purge.`);
            }
        } catch (e) {
            console.error(`❌ [DraftCacheManager] Error during stale drafts purge:`, e);
        }
    }
};

// Bind to window for global access
window.DraftCacheManager = DraftCacheManager;

