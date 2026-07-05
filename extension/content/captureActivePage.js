export function captureActivePage() {
  function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function isChromeHeading(text) {
    const lower = text.toLowerCase();
    return lower === 'notifications'
      || lower.endsWith('notifications')
      || lower === 'about the job'
      || lower === 'people you can reach out to';
  }

  function findCandidateHeading() {
    const headings = Array.from(document.querySelectorAll('h1, h2'))
      .map((element) => normalizeText(element.innerText || element.textContent || ''))
      .filter(Boolean)
      .filter((text) => !isChromeHeading(text));

    const titleHeading = headings.find((text) => text.length > 3 && text.length < 160);
    if (titleHeading) {
      return titleHeading;
    }

    const titleText = normalizeText(document.title || '');
    if (!titleText) {
      return '';
    }

    const pipeIndex = titleText.indexOf('|');
    return normalizeText(pipeIndex >= 0 ? titleText.slice(0, pipeIndex) : titleText);
  }

  const capturedAt = new Date().toISOString();
  const url = window.location.href;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const title = document.title || '';
  const bodyText = document.body?.innerText || '';

  const isLinkedIn = hostname === 'www.linkedin.com' || hostname.endsWith('.linkedin.com');
  const urlLooksLikeJob = /\/jobs\/(view|collections|search|details)\b/.test(pathname) || pathname.includes('/jobs/');
  const hasAboutJob = /(^|\n)\s*About the job\s*(\n|$)/i.test(bodyText);
  const heading = findCandidateHeading();
  const hasJobHeading = Boolean(heading);
  const supported = Boolean(isLinkedIn && (urlLooksLikeJob || hasAboutJob || hasJobHeading));

  const signals = {
    isLinkedIn,
    urlLooksLikeJob,
    hasAboutJob,
    hasJobHeading
  };

  if (!supported) {
    return {
      ok: false,
      reason: isLinkedIn ? 'linkedin_page_not_job_detail' : 'not_linkedin',
      message: isLinkedIn
        ? 'This LinkedIn page does not look like a job detail page yet.'
        : 'This page is not on LinkedIn.',
      captureTimeUtc: capturedAt,
      url,
      pageTitle: title,
      candidateHeading: heading,
      signals
    };
  }

  return {
    ok: true,
    captureTimeUtc: capturedAt,
    url,
    pageTitle: title,
    candidateHeading: heading,
    signals,
    minimalRecord: {
      schemaVersion: 1,
      captureTimeUtc: capturedAt,
      sourceWebsite: 'LinkedIn',
      url,
      title: heading,
      description: ''
    }
  };
}
