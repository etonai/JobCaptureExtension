export const RECENT_POSTINGS_TRACKING_SESSION_KEY = 'recentPostingsTracking';

export function normalizeRecentPostingsTrackingState(state, pageStart = 0) {
  const normalizedPageStart = Math.max(0, Number(pageStart) || 0);
  if (!state || typeof state !== 'object') {
    return { previousPagesTotal: 0, currentPageTotal: 0, pageStart: normalizedPageStart };
  }
  return {
    previousPagesTotal: Math.max(0, Number(state.previousPagesTotal) || 0),
    currentPageTotal: Math.max(0, Number(state.currentPageTotal) || 0),
    pageStart: Math.max(0, Number(state.pageStart) || 0)
  };
}

export function recordRecentPostingsScan(state, pageStart, currentPageTotal) {
  const normalized = normalizeRecentPostingsTrackingState(state, pageStart);
  const normalizedPageStart = Math.max(0, Number(pageStart) || 0);
  if (normalized.pageStart !== normalizedPageStart) {
    normalized.previousPagesTotal += normalized.currentPageTotal;
    normalized.currentPageTotal = 0;
    normalized.pageStart = normalizedPageStart;
  }
  normalized.currentPageTotal = Math.max(0, Number(currentPageTotal) || 0);
  return normalized;
}

export function advanceRecentPostingsPage(state, nextPageStart) {
  const normalized = normalizeRecentPostingsTrackingState(state);
  normalized.previousPagesTotal += normalized.currentPageTotal;
  normalized.currentPageTotal = 0;
  normalized.pageStart = Math.max(0, Number(nextPageStart) || 0);
  return normalized;
}

export function recentPostingsRunningTotal(state) {
  const normalized = normalizeRecentPostingsTrackingState(state);
  return normalized.previousPagesTotal + normalized.currentPageTotal;
}
