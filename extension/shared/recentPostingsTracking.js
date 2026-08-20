export const RECENT_POSTINGS_TRACKING_SESSION_KEY = 'recentPostingsTracking';

export function normalizeRecentPostingsTrackingState(state, pageStart = 0) {
  const normalizedPageStart = Math.max(0, Number(pageStart) || 0);
  if (!state || typeof state !== 'object') {
    return {
      previousPagesTotal: 0,
      currentPageTotal: 0,
      pageStart: normalizedPageStart,
      previousPagesCardTotal: 0,
      currentPageCardCount: null,
      exactPageContinuity: normalizedPageStart === 0,
      exactBoundaryDetected: false,
      exactMatches: null,
      exactBoundaryPageStart: null
    };
  }
  return {
    previousPagesTotal: Math.max(0, Number(state.previousPagesTotal) || 0),
    currentPageTotal: Math.max(0, Number(state.currentPageTotal) || 0),
    pageStart: Math.max(0, Number(state.pageStart) || 0),
    previousPagesCardTotal: Math.max(0, Number(state.previousPagesCardTotal) || 0),
    currentPageCardCount: Number.isInteger(state.currentPageCardCount) && state.currentPageCardCount >= 0
      ? state.currentPageCardCount
      : null,
    exactPageContinuity: typeof state.exactPageContinuity === 'boolean'
      ? state.exactPageContinuity
      : normalizedPageStart === 0 && Math.max(0, Number(state.pageStart) || 0) === 0,
    exactBoundaryDetected: state.exactBoundaryDetected === true,
    exactMatches: Number.isInteger(state.exactMatches) && state.exactMatches >= 0 ? state.exactMatches : null,
    exactBoundaryPageStart: Number.isInteger(state.exactBoundaryPageStart) && state.exactBoundaryPageStart >= 0
      ? state.exactBoundaryPageStart
      : null
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
  if (normalized.currentPageCardCount === null) {
    normalized.exactPageContinuity = false;
  } else {
    normalized.previousPagesCardTotal += normalized.currentPageCardCount;
  }
  normalized.currentPageCardCount = null;
  normalized.pageStart = Math.max(0, Number(nextPageStart) || 0);
  return normalized;
}

export function recordExactMatchBoundaryScan(state, pageStart, cardCount, boundary = {}) {
  const normalized = normalizeRecentPostingsTrackingState(state, pageStart);
  const normalizedPageStart = Math.max(0, Number(pageStart) || 0);
  if (normalized.pageStart !== normalizedPageStart) {
    normalized.exactPageContinuity = false;
    normalized.currentPageCardCount = null;
    normalized.pageStart = normalizedPageStart;
  }

  normalized.currentPageCardCount = Number.isInteger(cardCount) && cardCount >= 0 ? cardCount : null;
  if (!boundary?.detected || normalized.exactBoundaryDetected) {
    return normalized;
  }

  normalized.exactBoundaryDetected = true;
  normalized.exactBoundaryPageStart = normalizedPageStart;
  const beforeBoundary = boundary.exactMatchesOnPage;
  if (normalized.exactPageContinuity && Number.isInteger(beforeBoundary) && beforeBoundary >= 0) {
    normalized.exactMatches = normalized.previousPagesCardTotal + beforeBoundary;
  }
  return normalized;
}

export function recentPostingsRunningTotal(state) {
  const normalized = normalizeRecentPostingsTrackingState(state);
  return normalized.previousPagesTotal + normalized.currentPageTotal;
}
