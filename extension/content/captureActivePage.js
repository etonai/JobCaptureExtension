export function captureActivePage() {
  function normalizeLine(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalizeBlock(value) {
    return String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function visibleLines(text) {
    return String(text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(normalizeLine)
      .filter(Boolean);
  }

  function isLinkedInHost(hostname) {
    return hostname === 'www.linkedin.com' || hostname.endsWith('.linkedin.com');
  }

  function getLocalParts(date) {
    const yyyy = String(date.getFullYear()).padStart(4, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${mi}:${ss}`
    };
  }

  function createEmptyRecord(now, url) {
    const local = getLocalParts(now);
    return {
      schemaVersion: 1,
      captureTimeUtc: now.toISOString(),
      captureDateLocal: local.date,
      captureTimeLocal: local.time,
      sourceWebsite: 'LinkedIn',
      url,
      linkedinJobId: extractLinkedInJobId(url),
      company: '',
      title: '',
      location: '',
      workplaceType: '',
      employmentType: '',
      salaryText: '',
      postedText: '',
      applicantCountText: '',
      promotionText: '',
      hiringStatusText: '',
      applyType: 'Unknown',
      description: '',
      descriptionMarkdown: '',
      posterRequirements: '',
      benefits: '',
      additionalSections: [],
      savedListingPath: '',
      notes: ''
    };
  }

  function extractLinkedInJobId(url) {
    const match = String(url ?? '').match(/\/jobs\/view\/(\d+)/i)
      || String(url ?? '').match(/[?&]currentJobId=(\d+)/i)
      || String(url ?? '').match(/[?&]jobId=(\d+)/i);
    return match?.[1] || '';
  }

  function isUiNoise(line) {
    const lower = line.toLowerCase();
    return lower.startsWith('company logo for')
      || lower === 'save'
      || lower === 'show match details'
      || lower === 'tailor my resume'
      || lower === 'create cover letter'
      || lower === 'help me stand out'
      || lower === 'people you can reach out to'
      || lower === 'show all'
      || lower === 'message'
      || lower === 'skip to search'
      || lower === 'skip to main content'
      || lower === 'skip navigation menu'
      || lower === 'home'
      || lower === 'my network'
      || lower === 'jobs'
      || lower === 'messaging'
      || lower === 'notifications'
      || lower === '·'
      || lower === '•'
      || lower === 'me'
      || lower === 'for business'
      || /^\d+ notifications?$/.test(lower)
      || lower.startsWith('beta')
      || lower.includes('your profile and resume')
      || lower.includes('\u2019d be a top applicant')
      || lower.includes("you'd be a top applicant")
      || lower.includes('determine your fit');
  }

  function splitMetadataParts(line) {
    return line.split(/\s*(?:\u00b7|\u00c2\u00b7|[|])\s*/).map(normalizeLine).filter(Boolean);
  }

  function isLikelyMetadataLine(line) {
    return /(?:\u00b7|\u00c2\u00b7|[|])/.test(line) && (
      /ago|yesterday|applicant|clicked apply|reposted|posted/i.test(line)
    );
  }

  function isSalaryLine(line) {
    return /\$\s?\d[\d,.]*\s?[KkMm]?\s*\/?\s?(yr|year|hr|hour)?\s*-\s*\$?\s?\d[\d,.]*\s?[KkMm]?/i.test(line)
      || /\$\s?\d[\d,.]*\s?[KkMm]?\s*\/?\s?(yr|year|hr|hour)/i.test(line);
  }

  function isWorkplaceType(line) {
    return /^(Remote|Hybrid|On-site|Onsite|On site)$/i.test(line);
  }

  function normalizeWorkplaceType(line) {
    if (/^remote$/i.test(line)) return 'Remote';
    if (/^hybrid$/i.test(line)) return 'Hybrid';
    if (/^(on-site|onsite|on site)$/i.test(line)) return 'On-site';
    return line;
  }

  function isEmploymentType(line) {
    return /^(Full-time|Part-time|Contract|Temporary|Internship|Volunteer|Other)$/i.test(line);
  }

  function normalizeEmploymentType(line) {
    const known = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer', 'Other'];
    return known.find((value) => value.toLowerCase() === line.toLowerCase()) || line;
  }

  function classifyStatusLine(line, record) {
    const parts = splitMetadataParts(line);
    for (const part of parts) {
      if (/promoted/i.test(part) && !record.promotionText) {
        record.promotionText = part;
      } else if (/(actively reviewing|responses managed|reviewing applicants|managed off linkedin|hiring|recruit)/i.test(part) && !record.hiringStatusText) {
        record.hiringStatusText = part;
      }
    }
  }

  function parseMetadataLine(line, record) {
    const parts = splitMetadataParts(line);
    if (parts.length >= 1 && !record.location) {
      record.location = parts[0];
    }
    if (parts.length >= 2 && !record.postedText) {
      record.postedText = parts[1];
    }
    if (parts.length >= 3 && !record.applicantCountText) {
      record.applicantCountText = parts.slice(2).join(' \u00b7 ');
    }
  }

  function findTitleFromDocumentTitle(titleText) {
    const firstPart = normalizeLine(String(titleText ?? '').split('|')[0] || '');
    return firstPart;
  }

  function selectedJobDetailLines(headerLines, firstMetaIndex) {
    if (firstMetaIndex < 0) {
      return [];
    }

    const detailLines = [];
    for (const line of headerLines.slice(firstMetaIndex + 1)) {
      detailLines.push(line);
      if (/^(Apply|Easy Apply)$/i.test(line)) {
        break;
      }
    }
    return detailLines;
  }

  function parseHeaderFields(lines, record, pageTitle) {
    const usable = lines.filter((line) => !isUiNoise(line));
    const aboutIndex = usable.findIndex((line) => /^About the job$/i.test(line));
    const headerLines = aboutIndex >= 0 ? usable.slice(0, aboutIndex) : usable.slice(0, 30);
    const firstMetaIndex = headerLines.findIndex(isLikelyMetadataLine);

    if (firstMetaIndex >= 0) {
      parseMetadataLine(headerLines[firstMetaIndex], record);
      const beforeMeta = headerLines
        .slice(Math.max(0, firstMetaIndex - 12), firstMetaIndex)
        .filter((line) => !isSalaryLine(line))
        .filter((line) => !isWorkplaceType(line))
        .filter((line) => !isEmploymentType(line))
        .filter((line) => !/^(Apply|Easy Apply)$/i.test(line));
      const identityLines = beforeMeta.slice(-2);
      if (!record.company && identityLines.length > 0) {
        record.company = identityLines[0];
      }
      if (!record.title && identityLines.length > 1) {
        record.title = identityLines[1];
      }
    }

    if (!record.title) {
      record.title = findTitleFromDocumentTitle(pageTitle);
    }

    const detailLines = selectedJobDetailLines(headerLines, firstMetaIndex);
    const applyScanLines = firstMetaIndex >= 0 ? detailLines : headerLines;

    for (const line of detailLines) {
      if (!record.salaryText && isSalaryLine(line)) {
        record.salaryText = line;
      }
      if (!record.workplaceType && isWorkplaceType(line)) {
        record.workplaceType = normalizeWorkplaceType(line);
      }
      if (!record.employmentType && isEmploymentType(line)) {
        record.employmentType = normalizeEmploymentType(line);
      }

      if (/promoted|actively reviewing|responses managed|managed off linkedin/i.test(line)) {
        classifyStatusLine(line, record);
      }
    }

    for (const line of headerLines) {
      if (/promoted|actively reviewing|responses managed|managed off linkedin/i.test(line)) {
        classifyStatusLine(line, record);
      }
    }

    for (const line of applyScanLines) {
      if (line === 'Easy Apply') {
        record.applyType = 'Easy Apply';
        break;
      }
      if (line === 'Apply') {
        record.applyType = 'External Apply';
        break;
      }
    }
  }

  function findSectionIndex(lines, matcher, startIndex = 0) {
    for (let i = startIndex; i < lines.length; i += 1) {
      if (matcher(lines[i])) {
        return i;
      }
    }
    return -1;
  }

  function nextSectionIndex(lines, startIndex) {
    const matchers = [
      (line) => /^Requirements added by the (job )?poster$/i.test(line),
      (line) => /^Benefits found in job po/i.test(line),
      (line) => /^People you can reach out to$/i.test(line)
    ];
    let next = -1;
    for (const matcher of matchers) {
      const index = findSectionIndex(lines, matcher, startIndex + 1);
      if (index >= 0 && (next < 0 || index < next)) {
        next = index;
      }
    }
    return next < 0 ? lines.length : next;
  }

  function linesToBlock(lines) {
    return normalizeBlock(lines.join('\n'));
  }

  function parseDescriptionSections(lines, record) {
    const aboutIndex = findSectionIndex(lines, (line) => /^About the job$/i.test(line));
    if (aboutIndex < 0) {
      return;
    }

    const requirementsIndex = findSectionIndex(lines, (line) => /^Requirements added by the (job )?poster$/i.test(line), aboutIndex + 1);
    const benefitsIndex = findSectionIndex(lines, (line) => /^Benefits found in job po/i.test(line), aboutIndex + 1);
    const descriptionEnd = [requirementsIndex, benefitsIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? lines.length;
    record.description = linesToBlock(lines.slice(aboutIndex + 1, descriptionEnd));

    if (requirementsIndex >= 0) {
      const end = nextSectionIndex(lines, requirementsIndex);
      record.posterRequirements = linesToBlock(lines.slice(requirementsIndex + 1, end));
    }

    if (benefitsIndex >= 0) {
      const end = nextSectionIndex(lines, benefitsIndex);
      record.benefits = linesToBlock(lines.slice(benefitsIndex + 1, end));
    }
  }

  function plainTextDescriptionToMarkdown(text) {
    return normalizeBlock(text || '');
  }

  function nodeText(node) {
    return normalizeLine(node?.innerText || node?.textContent || '');
  }

  function isElementNode(node) {
    return node?.nodeType === 1 || Boolean(node?.tagName);
  }

  function isTextNode(node) {
    return node?.nodeType === 3;
  }

  function childNodes(node) {
    return Array.from(node?.childNodes || []);
  }

  function compactInline(text) {
    return String(text || '').replace(/[ \t\n\r]+/g, ' ').trim();
  }

  function markdownInline(node) {
    if (!node) {
      return '';
    }
    if (isTextNode(node)) {
      return compactInline(node.textContent || '');
    }
    if (!isElementNode(node)) {
      return '';
    }

    const tag = String(node.tagName || '').toLowerCase();
    if (tag === 'br') {
      return '\n';
    }
    if (['script', 'style', 'svg', 'button'].includes(tag)) {
      return '';
    }

    const text = childNodes(node).map(markdownInline).join('').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
    const trimmed = compactInline(text);
    if (!trimmed) {
      return '';
    }

    if (tag === 'strong' || tag === 'b') {
      return `**${trimmed}**`;
    }

    if (tag === 'a') {
      const href = node.getAttribute?.('href') || '';
      return href ? `[${trimmed}](${href})` : trimmed;
    }

    return text;
  }

  function markdownBlock(node) {
    if (!node) {
      return '';
    }
    if (isTextNode(node)) {
      return compactInline(node.textContent || '');
    }
    if (!isElementNode(node)) {
      return '';
    }

    const tag = String(node.tagName || '').toLowerCase();
    if (['script', 'style', 'svg', 'button'].includes(tag)) {
      return '';
    }
    if (tag === 'br') {
      return '\n';
    }

    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const items = childNodes(node)
        .filter((child) => String(child?.tagName || '').toLowerCase() === 'li')
        .map((child, index) => {
          const itemText = normalizeBlock(childNodes(child).map(markdownBlock).join(' ')) || compactInline(nodeText(child));
          if (!itemText) {
            return '';
          }
          const marker = ordered ? `${index + 1}.` : '-';
          return `${marker} ${itemText.replace(/\n/g, '\n  ')}`;
        })
        .filter(Boolean);
      return items.length ? `${items.join('\n')}\n\n` : '';
    }

    if (tag === 'li') {
      return normalizeBlock(childNodes(node).map(markdownBlock).join(' ')) || compactInline(nodeText(node));
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(Number(tag.slice(1)) + 1, 6);
      const heading = compactInline(markdownInline(node));
      return heading ? `${'#'.repeat(level)} ${heading}\n\n` : '';
    }

    if (tag === 'p') {
      const text = normalizeBlock(markdownInline(node));
      return text ? `${text}\n\n` : '';
    }

    if (tag === 'div') {
      const text = normalizeBlock(childNodes(node).map(markdownBlock).join('')) || compactInline(markdownInline(node));
      return text ? `${text}\n\n` : '';
    }

    return childNodes(node).map(markdownBlock).join('');
  }

  function findAboutJobHeading(doc) {
    const headings = Array.from(doc?.querySelectorAll?.('h1, h2, h3, h4') || []);
    return headings.find((heading) => /^About the job$/i.test(nodeText(heading))) || null;
  }

  function findAboutJobContainer(heading) {
    const closestContainer = heading?.closest?.('[componentkey^="JobDetails_AboutTheJob"], [data-sdui-component*="aboutTheJob"]');
    if (closestContainer) {
      return closestContainer;
    }

    let current = heading?.parentElement || null;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const text = nodeText(current);
      if (/^About the job\b/i.test(text) && text.length > 'About the job'.length + 40) {
        return current;
      }
      current = current.parentElement || null;
    }
    return null;
  }

  function findDescriptionRoot(container, heading) {
    const expandable = container?.querySelector?.('[data-testid="expandable-text-box"]');
    if (expandable) {
      return expandable;
    }

    let current = heading?.parentElement || null;
    while (current?.parentElement && current.parentElement !== container) {
      current = current.parentElement;
    }

    let sibling = current?.nextElementSibling || heading?.nextElementSibling || null;
    while (sibling) {
      if (nodeText(sibling) && !/^About the job$/i.test(nodeText(sibling))) {
        return sibling;
      }
      sibling = sibling.nextElementSibling || null;
    }
    return null;
  }

  function captureDescriptionMarkdownFromDom(doc) {
    const heading = findAboutJobHeading(doc);
    const container = findAboutJobContainer(heading);
    const root = findDescriptionRoot(container, heading);
    if (!root) {
      return '';
    }

    const markdown = normalizeBlock(childNodes(root).map(markdownBlock).join('') || markdownBlock(root));
    return markdown;
  }

  function missingFieldWarnings(record) {
    const requiredForQuality = ['company', 'title', 'location', 'postedText', 'applyType', 'description'];
    return requiredForQuality
      .filter((field) => !record[field] || record[field] === 'Unknown')
      .map((field) => ({ field, message: `${field} was not extracted.` }));
  }

  function parseLinkedInJobPage({ url, pageTitle, bodyText, now }) {
    const record = createEmptyRecord(now, url);
    const lines = visibleLines(bodyText);
    parseHeaderFields(lines, record, pageTitle);
    parseDescriptionSections(lines, record);
    record.descriptionMarkdown = captureDescriptionMarkdownFromDom(globalThis.document) || plainTextDescriptionToMarkdown(record.description);

    const parsedUrl = new URL(url);
    const isLinkedIn = isLinkedInHost(parsedUrl.hostname);
    const urlLooksLikeJob = /\/jobs\/(view|collections|search|details)\b/.test(parsedUrl.pathname) || parsedUrl.pathname.includes('/jobs/');
    const hasAboutJob = lines.some((line) => /^About the job$/i.test(line));
    const hasJobHeading = Boolean(record.title);
    const hasJobMetadata = Boolean(record.company && record.title && (record.postedText || record.applyType !== 'Unknown'));
    const supported = Boolean(isLinkedIn && (urlLooksLikeJob || hasAboutJob || hasJobMetadata));

    return {
      supported,
      record,
      warnings: missingFieldWarnings(record),
      signals: {
        isLinkedIn,
        urlLooksLikeJob,
        hasAboutJob,
        hasJobHeading,
        hasJobMetadata
      }
    };
  }

  const now = new Date();
  const url = window.location.href;
  const pageTitle = document.title || '';
  const bodyText = document.body?.innerText || '';
  const parsed = parseLinkedInJobPage({ url, pageTitle, bodyText, now });

  if (!parsed.supported) {
    return {
      ok: false,
      reason: parsed.signals.isLinkedIn ? 'linkedin_page_not_job_detail' : 'not_linkedin',
      message: parsed.signals.isLinkedIn
        ? 'This LinkedIn page does not look like a job detail page yet.'
        : 'This page is not on LinkedIn.',
      captureTimeUtc: parsed.record.captureTimeUtc,
      url,
      pageTitle,
      record: parsed.record,
      warnings: parsed.warnings,
      signals: parsed.signals
    };
  }

  return {
    ok: true,
    captureTimeUtc: parsed.record.captureTimeUtc,
    url,
    pageTitle,
    record: parsed.record,
    warnings: parsed.warnings,
    signals: parsed.signals
  };
}



export function captureRecentJobPostings() {
  function normalizeLine(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function visibleLines(text) {
    return String(text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(normalizeLine)
      .filter(Boolean);
  }

  function isLinkedInHost(hostname) {
    return hostname === 'www.linkedin.com' || hostname.endsWith('.linkedin.com');
  }

  function postingAgeMinutes(text) {
    const match = normalizeLine(text).match(/\b(?:reposted\s+|posted\s+)?(\d+)\s+(minute|minutes|hour|hours)\s+ago\b/i);
    if (!match) {
      return null;
    }
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) {
      return null;
    }
    return /^hour/i.test(match[2]) ? amount * 60 : amount;
  }

  function recentAgeText(line) {
    const match = normalizeLine(line).match(/\b(?:(?:reposted|posted)\s+)?\d+\s+(?:minute|minutes|hour|hours)\s+ago\b/i);
    if (!match) {
      return '';
    }
    const text = normalizeLine(match[0]);
    const minutes = postingAgeMinutes(text);
    return minutes !== null && minutes <= 120 ? text : '';
  }

  function nodeText(node) {
    return normalizeLine(node?.innerText || node?.textContent || '');
  }

  function isElementNode(node) {
    return node?.nodeType === 1 || Boolean(node?.tagName);
  }

  function elementChildren(node) {
    return Array.from(node?.childNodes || []).filter(isElementNode);
  }

  function tagNameOf(node) {
    return String(node?.tagName || '').toLowerCase();
  }

  function paragraphElements(doc) {
    return typeof doc?.querySelectorAll === 'function' ? Array.from(doc.querySelectorAll('p')) : [];
  }

  // One of LinkedIn's (at least two) live markup variants renders a
  // results-list card's TITLE as a <p> containing two spans with identical
  // visible text, the second `aria-hidden="true"` (e.g. `<span>Sr Software
  // Engineer</span><span aria-hidden="true">Sr Software Engineer</span>`).
  // Verified against doc/examples/Starbucksmoreunselectedbare.html. The
  // other observed variant (the Docusign fixture) renders the title with an
  // EMPTY first span, so this detector alone is not sufficient — see
  // dismissButtonTitles() below for the cross-variant signal.
  // LinkedIn renders a THIRD title variant for jobs carrying a "Verified
  // job" badge (observed rendered only in the Nordstrom MHTML fixture; the
  // same page saved as .html minutes later had every title plain, so cards
  // move in and out of this rendering dynamically): the first span reads
  // "TITLE (Verified job)" and the aria-hidden span reads "TITLE" plus a
  // badge icon. Stripping that suffix before any comparison restores both
  // detectors below. The suffix is English-locale microcopy; if LinkedIn
  // localizes it, the title degrades to undetected (fail-soft: a missed
  // card, never a wrong company).
  function stripVerifiedBadge(text) {
    return normalizeLine(text).replace(/\s*\(verified job\)$/i, '');
  }

  function firstTwoSpanTexts(paragraph) {
    return elementChildren(paragraph)
      .filter((child) => tagNameOf(child) === 'span')
      .slice(0, 2)
      .map((span) => nodeText(span));
  }

  function isEchoTitleParagraph(paragraph) {
    const spans = firstTwoSpanTexts(paragraph);
    if (spans.length < 2) {
      return false;
    }
    const first = stripVerifiedBadge(spans[0]);
    const second = stripVerifiedBadge(spans[1]);
    // A job title never reads as a posting age. When an age happens to render
    // as two identical spans (a bare "N ago" with no "Posted" prefix) it must
    // not be mistaken for a title, or it would split one card into two.
    if (/\bago\b/i.test(first)) {
      return false;
    }
    return Boolean(first) && first === second;
  }

  // The one card marker present in BOTH observed LinkedIn markup variants
  // (Starbucks and Docusign fixtures: exactly one per card, 25/25 in each)
  // is the card's dismiss button, whose accessible label carries the exact
  // job title: `aria-label="Dismiss <TITLE> job"`. Collecting these labels
  // gives the set of card titles actually on the page, which then lets a
  // title <p> be recognized by its text even when its span structure varies.
  function dismissButtonTitles(doc) {
    const buttons = typeof doc?.querySelectorAll === 'function'
      ? Array.from(doc.querySelectorAll('button[aria-label]'))
      : [];
    const titles = new Set();
    for (const button of buttons) {
      const label = normalizeLine(button.getAttribute?.('aria-label') || '');
      const match = label.match(/^Dismiss (.+) job$/);
      if (match && match[1]) {
        titles.add(match[1]);
      }
    }
    return titles;
  }

  // A paragraph is a card title if it matches any variant's signal: the
  // echo-span structure (Starbucks variant, including its verified-badge
  // form), or text equal to a title taken from a dismiss button on the same
  // page (works in the other variants, including Docusign's empty-first-span
  // rendering). The dismiss-title comparison must also consider the first
  // two spans individually: on a verified-badge card the paragraph's
  // concatenated text is "TITLE (Verified job) TITLE", which never equals
  // the dismiss label's bare "TITLE", but each span does after the badge
  // suffix is stripped. Text matching also handles duplicate titles across
  // cards, since membership in the title set doesn't depend on which card
  // the text came from.
  function isCardTitleParagraph(paragraph, dismissTitles) {
    if (isEchoTitleParagraph(paragraph)) {
      return true;
    }
    const candidates = [nodeText(paragraph), ...firstTwoSpanTexts(paragraph)];
    return candidates.some((candidate) => {
      const text = stripVerifiedBadge(candidate);
      return Boolean(text) && !recentAgeText(text) && dismissTitles.has(text);
    });
  }

  function isLocationText(text) {
    return /,\s*[A-Z]{2}\b/.test(text)
      || /\b(remote|hybrid|on-site|onsite|on site)\b/i.test(text)
      || /\bUnited States\b/i.test(text)
      || /\bGreater .+ Area\b/i.test(text);
  }

  // The company on a LinkedIn results-list card is plain, unlabeled text in
  // the <p> IMMEDIATELY AFTER the title <p>, in document order. Every card
  // in the saved search-results fixture is title -> company -> location, and
  // the company carries no link, no aria-label, and no class distinct from
  // the title/location that bracket it — its only reliable meaning is
  // positional. This reads it from that verified structure instead of
  // guessing from page-wide flattened text (Codex) or from DOM signals that
  // exist only on the open detail pane (the earlier redesign). See the Opus
  // analysis in DevCycle013.md.
  //
  // A qualifying age must never drop a listing just because the company
  // couldn't be resolved (a blank company renders as "Unknown company"),
  // and the positional candidate is only rejected — leaving the company
  // blank — if it is itself a location or an age, which is all that could
  // occupy that slot on a card where LinkedIn omitted the company <p>.
  function listCardListings(doc) {
    const paragraphs = paragraphElements(doc);
    const dismissTitles = dismissButtonTitles(doc);
    const titleIndexes = [];
    for (let index = 0; index < paragraphs.length; index += 1) {
      if (isCardTitleParagraph(paragraphs[index], dismissTitles)) {
        titleIndexes.push(index);
      }
    }

    const listings = [];
    for (let t = 0; t < titleIndexes.length; t += 1) {
      const start = titleIndexes[t];
      const end = t + 1 < titleIndexes.length ? titleIndexes[t + 1] : paragraphs.length;

      let postedText = '';
      for (let index = start; index < end; index += 1) {
        const age = recentAgeText(nodeText(paragraphs[index]));
        if (age) {
          postedText = age;
          break;
        }
      }
      if (!postedText) {
        continue;
      }

      const candidate = normalizeLine(nodeText(paragraphs[start + 1]));
      const company = (!candidate || isLocationText(candidate) || recentAgeText(candidate)) ? '' : candidate;
      // listPosition is this card's 1-based ordinal among ALL detected cards
      // (titleIndexes covers every card, recent or not), so the number matches
      // what the user sees counting down the left-hand list. If a card's title
      // evades both detectors, later positions shift by one — a fail-soft
      // miscount, never a wrong company. Positions count DOM-present cards at
      // scan time, so a lazily-rendered tail of the list is not included.
      listings.push({ company, postedText, companySource: company ? 'list-card' : 'missing', listPosition: t + 1 });
    }
    return listings;
  }

  function isLikelyMetadataLine(line) {
    return /(?:·|Â·|[|])/.test(line) && /ago|yesterday|applicant|clicked apply|reposted|posted/i.test(line);
  }

  function splitMetadataParts(line) {
    return line.split(/\s*(?:·|Â·|[|])\s*/).map(normalizeLine).filter(Boolean);
  }

  // This function is injected into the page on its own via
  // `chrome.scripting.executeScript({ func: captureRecentJobPostings })`,
  // which serializes and runs only this one function's body — it does NOT
  // carry along other top-level functions from this module, including
  // `captureActivePage`. Calling `captureActivePage()` here throws a
  // ReferenceError in the real extension even though it works in Node
  // tests (which import both from the same module scope). That bug shipped
  // in 0.0.13.6-0.0.13.9 and made every fallback-path call fail silently,
  // which is why 0.0.13.9's diagnostics never even ran. This is a small,
  // deliberately duplicated re-implementation of just the identity-line
  // parsing `parseHeaderFields` in `captureActivePage` already does, kept
  // self-contained on purpose. Do not replace this with a call back into
  // `captureActivePage`.
  function detailPageListing() {
    const lines = visibleLines(document.body?.innerText || '');
    const aboutIndex = lines.findIndex((line) => /^About the job$/i.test(line));
    const headerLines = aboutIndex >= 0 ? lines.slice(0, aboutIndex) : lines.slice(0, 30);
    const firstMetaIndex = headerLines.findIndex(isLikelyMetadataLine);
    if (firstMetaIndex < 0) {
      return null;
    }

    const metaParts = splitMetadataParts(headerLines[firstMetaIndex]);
    const postedPart = metaParts.length >= 2 ? metaParts[1] : metaParts[0];
    const postedText = recentAgeText(postedPart || headerLines[firstMetaIndex]);
    if (!postedText) {
      return null;
    }

    const beforeMeta = headerLines.slice(Math.max(0, firstMetaIndex - 2), firstMetaIndex);
    const company = normalizeLine(beforeMeta[0] || '');
    return { company, postedText, companySource: company ? 'detail-page' : 'missing' };
  }

  // Card-boundary selectors are guesses (see DevCycle013.md) and frequently
  // match nothing against LinkedIn's real, hashed-class markup. When that
  // happens, the scan must not collapse to a single listing (or none) —
  // every qualifying age anywhere on the page is still a real posting the
  // user asked to see. This scans the whole flattened page text for every
  // qualifying age and reports each as an unresolved-company listing,
  // skipping the one occurrence already attributed to `detailPageListing()`
  // (if any) so the same posting isn't reported twice.
  //
  // LinkedIn commonly renders one posting's age twice back-to-back: a
  // visible "Posted N ago" span plus a duplicate `aria-hidden="true"` span
  // carrying the bare "N ago" text for accessibility (confirmed in the
  // saved fixtures, e.g. `<span>Posted 3 hours ago</span><span
  // aria-hidden="true">3 hours ago</span>`). `innerText` flattens both into
  // separate lines. Two qualifying age matches on immediately consecutive
  // lines with the same normalized age are that echo, not two postings.
  function bodyTextAgeListings(bodyText, skipPostedTextOnce) {
    const lines = visibleLines(bodyText);
    const matches = [];
    let skipped = !skipPostedTextOnce;
    let lastMatchedIndex = -2;
    let lastMinutesKey = null;
    for (let index = 0; index < lines.length; index += 1) {
      const postedText = recentAgeText(lines[index]);
      if (!postedText) {
        continue;
      }

      const minutesKey = normalizePostedKey(postedText);
      const isAdjacentEcho = index === lastMatchedIndex + 1 && minutesKey === lastMinutesKey;
      lastMatchedIndex = index;
      lastMinutesKey = minutesKey;
      if (isAdjacentEcho) {
        continue;
      }

      if (!skipped && postedText === skipPostedTextOnce) {
        skipped = true;
        continue;
      }
      matches.push({ company: '', postedText, companySource: 'missing' });
    }
    return matches;
  }

  function normalizePostedKey(postedText) {
    const minutes = postingAgeMinutes(postedText);
    return minutes === null ? normalizeLine(postedText).toLowerCase() : String(minutes);
  }

  function uniqueListings(listings) {
    const keptByKey = new Map();
    const result = [];
    for (const listing of listings) {
      const company = normalizeLine(listing.company).toLowerCase();
      if (!company) {
        // Two listings with no identified company can't be confirmed as the
        // same posting, so neither is treated as a duplicate of the other.
        result.push(listing);
        continue;
      }
      const key = `${company}|${normalizePostedKey(listing.postedText)}`;
      const kept = keptByKey.get(key);
      if (!kept) {
        keptByKey.set(key, listing);
        result.push(listing);
        continue;
      }
      // The detail-pane listing is placed before the card listings, so when
      // the open job's own list card dedups against it, the surviving row
      // would otherwise lose the card's list position. Merge it across so the
      // popup can still show where the posting sits in the left-hand list.
      if (kept.listPosition == null && listing.listPosition != null) {
        kept.listPosition = listing.listPosition;
      }
    }
    return result;
  }

  const url = window.location.href;
  const pageTitle = document.title || '';
  const parsedUrl = new URL(url);
  if (!isLinkedInHost(parsedUrl.hostname)) {
    return {
      ok: false,
      reason: 'not_linkedin',
      message: 'This page is not on LinkedIn.',
      url,
      pageTitle,
      listings: []
    };
  }

  // Primary path: the currently-open job (from its detail-pane header) plus
  // every results-list card, each read positionally from the verified
  // title -> company -> location <p> structure.
  const detailListing = detailPageListing();
  const cardListings = listCardListings(document);

  // When the structural list scan finds cards, trust it (companies are read
  // from verified per-card structure). When it finds none — a page whose
  // card markup doesn't match the verified title/company/location shape —
  // fall back to scanning the whole flattened page for qualifying ages so a
  // recent posting is still surfaced (company left blank) rather than hidden.
  // The fallback keys off the LIST scan being empty, not the combined result,
  // so a page where only the open-pane detail listing resolves still gets its
  // results list covered.
  let listings;
  if (cardListings.length > 0) {
    listings = uniqueListings(detailListing ? [detailListing, ...cardListings] : cardListings);
  } else {
    const bodyListings = bodyTextAgeListings(document.body?.innerText || '', detailListing?.postedText);
    listings = uniqueListings(detailListing ? [detailListing, ...bodyListings] : bodyListings);
  }

  // Diagnostics: surface what the structural scan actually saw on the real
  // page, so any remaining shortfall can be reasoned about from evidence
  // rather than guessed (see DevCycle013.md).
  const bodyText = document.body?.innerText || '';
  const ageLines = visibleLines(bodyText).filter((line) => Boolean(recentAgeText(line)));
  const debugDismissTitles = dismissButtonTitles(document);
  const debugTitleParagraphs = paragraphElements(document)
    .filter((paragraph) => isCardTitleParagraph(paragraph, debugDismissTitles));
  const debug = {
    dismissTitleCount: debugDismissTitles.size,
    titleParagraphCount: debugTitleParagraphs.length,
    // The title the scan treated as card #1. If a live page shows offset
    // positions again, this reveals where the counted window actually
    // started without needing a saved copy of the page. The first span is
    // preferred over the paragraph text because verified-badge titles
    // concatenate to "TITLE (Verified job) TITLE"; the empty-first-span
    // variant falls back to the paragraph text.
    firstCardTitle: debugTitleParagraphs.length
      ? stripVerifiedBadge(firstTwoSpanTexts(debugTitleParagraphs[0])[0] || nodeText(debugTitleParagraphs[0]))
      : '',
    cardListingCount: cardListings.length,
    detailPageListingFound: Boolean(detailListing),
    ageLineCount: ageLines.length,
    sampleAgeLines: ageLines.slice(0, 5)
  };

  return {
    ok: true,
    url,
    pageTitle,
    listings,
    debug
  };
}



