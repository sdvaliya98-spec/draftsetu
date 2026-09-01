import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
/**
 * SessionManager Service
 * =======================
 * Manages in-memory working sessions for document templates.
 * Backed by a JavaScript Map to avoid triggering React rerenders during state updates.
 */

const _sessions = new Map();

const SessionManager = {
    /**
     * Save/Cache the session state for a template
     */
    saveSession: (templateId, state) => {
        if (!templateId) return;
        _sessions.set(templateId, {
            data: state.data || {},
            trackingId: state.trackingId || null,
            isLocked: !!state.isLocked,
            lastAccessedAt: new Date().toISOString()
        });
    },

    /**
     * Restore/Get the session state for a template
     */
    restoreSession: (templateId) => {
        if (!templateId) return null;
        const session = _sessions.get(templateId);
        if (session) {
            session.lastAccessedAt = new Date().toISOString();
        }
        return session || null;
    },

    /**
     * Remove the session state for a template
     */
    clearSession: (templateId) => {
        if (!templateId) return;
        _sessions.delete(templateId);
    },

    /**
     * Update/Modify specific fields inside the session state
     */
    updateSession: (templateId, stateUpdates) => {
        if (!templateId) return;
        const current = _sessions.get(templateId) || { data: {}, trackingId: null, isLocked: false };
        _sessions.set(templateId, {
            ...current,
            ...stateUpdates,
            lastAccessedAt: new Date().toISOString()
        });
    },

    /**
     * Check if a template has an active session in memory
     */
    hasSession: (templateId) => {
        if (!templateId) return false;
        return _sessions.has(templateId);
    },

    /**
     * Clear all sessions from memory
     */
    clearAll: () => {
        _sessions.clear();
    },

    /**
     * Get a sorted list of recently edited template IDs
     */
    getRecentlyEdited: () => {
        return Array.from(_sessions.entries())
            .sort((a, b) => new Date(b[1].lastAccessedAt) - new Date(a[1].lastAccessedAt))
            .map(([templateId]) => templateId);
    }
};

window.SessionManager = SessionManager;
