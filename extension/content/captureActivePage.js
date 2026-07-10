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

