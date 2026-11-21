import { PortalLesson } from '../types';

export const PORTAL_LESSON_TITLE_MAX = 120;
export const PORTAL_LESSON_URL_MAX = 500;
export const PORTAL_LESSON_NOTE_MAX = 200;
export const PORTAL_LESSON_BODY_HTML_MAX = 40000;
export const PORTAL_LESSON_SOURCE_ID_MAX = 100;

export const ALLOWED_LESSON_HTML_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'span',
]);

export const ALLOWED_LESSON_HTML_CLASSES = new Set([
  'lesson-align-center',
  'lesson-align-justify',
  'lesson-indent',
]);

const ALLOWED_DRIVE_PREFIXES = [
  'https://drive.google.com/',
  'https://docs.google.com/',
];

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function buildIsoDateIfValid(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Parses a date written as YYYY-MM-DD, M/D/YYYY, or "Mon D, YYYY" into YYYY-MM-DD.
 * Returns null if the input does not match an accepted format or is not a real calendar date.
 */
export function parseFlexibleLessonDate(raw: string): string | null {
  const input = (raw || '').trim();
  if (!input) return null;

  // 1. YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (isoMatch) {
    return buildIsoDateIfValid(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  // 2. M/D/YYYY (1 or 2 digits for month & day, 4 digits for year)
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
  if (slashMatch) {
    return buildIsoDateIfValid(
      Number(slashMatch[3]),
      Number(slashMatch[1]),
      Number(slashMatch[2])
    );
  }

  // 3. "Mon D, YYYY" (e.g. "Nov 15, 2026" or "November 15, 2026")
  const textMatch = /^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/.exec(input);
  if (textMatch) {
    const monthNum = MONTH_NAME_MAP[textMatch[1].toLowerCase()];
    if (!monthNum) return null;
    return buildIsoDateIfValid(
      Number(textMatch[3]),
      monthNum,
      Number(textMatch[2])
    );
  }

  return null;
}

export function validatePortalLessonDriveUrl(rawUrl: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'Google Drive link is required.' };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Google Drive link cannot contain spaces.',
    };
  }
  if (trimmed.length > PORTAL_LESSON_URL_MAX) {
    return {
      valid: false,
      normalized: trimmed,
      error: `Google Drive link must be ${PORTAL_LESSON_URL_MAX} characters or less.`,
    };
  }
  const hasAllowedPrefix = ALLOWED_DRIVE_PREFIXES.some(prefix => trimmed.startsWith(prefix));
  if (!hasAllowedPrefix) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Link must be a Google Drive or Google Docs https link starting with https://drive.google.com/ or https://docs.google.com/.',
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Link must use https://.',
      };
    }
  } catch {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Please enter a valid Google Drive or Google Docs URL.',
    };
  }

  return { valid: true, normalized: trimmed };
}

export function shortenDriveUrl(url: string, maxLength: number = 46): string {
  const clean = (url || '').trim().replace(/^https?:\/\//i, '');
  if (clean.length <= maxLength) return clean;
  const keepHead = Math.max(24, maxLength - 12);
  const keepTail = 9;
  return `${clean.slice(0, keepHead)}...${clean.slice(-keepTail)}`;
}

/**
 * Validates the optional Lessons Google Drive folder link in Settings.
 * Must be https-only on drive.google.com when non-empty.
 */
export function validateLessonsDriveFolderUrl(rawUrl: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Google Drive folder link cannot contain spaces.',
    };
  }
  if (trimmed.length > PORTAL_LESSON_URL_MAX) {
    return {
      valid: false,
      normalized: trimmed,
      error: `Link must be ${PORTAL_LESSON_URL_MAX} characters or less.`,
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Link must use https://.',
      };
    }
    if (parsed.hostname.toLowerCase() !== 'drive.google.com') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Please enter a valid Google Drive link starting with https://drive.google.com/.',
      };
    }
    return { valid: true, normalized: trimmed };
  } catch {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Please enter a valid Google Drive link starting with https://drive.google.com/.',
    };
  }
}

/**
 * Builds a direct Google Drive download URL if a Drive file ID is present in:
 * - /file/d/<id>
 * - open?id=<id>
 * - uc?id=<id>
 * Returns null if no file ID can be extracted cleanly.
 */
export function getGoogleDriveDownloadUrl(driveUrl?: string): string | null {
  const trimmed = (driveUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname.toLowerCase() !== 'drive.google.com') return null;

    const filePathMatch = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
    if (filePathMatch && filePathMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(filePathMatch[1])}`;
    }

    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (cleanPath === '/open' || cleanPath === '/uc') {
      const idParam = (parsed.searchParams.get('id') || '').trim();
      if (/^[a-zA-Z0-9_-]+$/.test(idParam)) {
        return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(idParam)}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

const DROPPED_HTML_ELEMENTS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'img',
  'video',
  'audio',
  'canvas',
  'picture',
  'source',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base',
  'title',
  'head',
  'applet',
  'frame',
  'frameset',
]);

const BLOCK_CONVERT_TO_P_TAGS = new Set([
  'div',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'center',
]);

const HEADING_PROMOTE_TO_H4 = new Set(['h5', 'h6']);

const BLOCK_LEVEL_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
]);

function hasNonZeroLengthStyle(val: string): boolean {
  const cleaned = (val || '').trim().toLowerCase();
  if (!cleaned || cleaned === '0' || cleaned === 'none' || cleaned === 'auto' || cleaned === 'initial') {
    return false;
  }
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? true : num > 0;
}

function extractAllowedLessonClasses(el: HTMLElement, extraAlignCenter = false): string[] {
  const classes: string[] = [];
  const align = (el.style?.textAlign || el.getAttribute('align') || '').trim().toLowerCase();
  if (extraAlignCenter || align === 'center' || el.classList.contains('lesson-align-center')) {
    classes.push('lesson-align-center');
  } else if (align === 'justify' || el.classList.contains('lesson-align-justify')) {
    classes.push('lesson-align-justify');
  }

  const hasIndent =
    el.classList.contains('indent') ||
    el.classList.contains('lesson-indent') ||
    el.getAttribute('data-indent') === 'true' ||
    hasNonZeroLengthStyle(el.style?.textIndent || '') ||
    hasNonZeroLengthStyle(el.style?.marginLeft || '') ||
    hasNonZeroLengthStyle(el.style?.paddingLeft || '');

  if (hasIndent) {
    classes.push('lesson-indent');
  }
  return classes;
}

function hasVisibleLessonText(node: Node): boolean {
  return (node.textContent || '').replace(/\u00a0/g, ' ').trim().length > 0;
}

function containsDirectOrNestedBlock(el: HTMLElement): boolean {
  return Boolean(
    el.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, section, article, center')
  );
}

/**
 * Sanitizes Lesson Maker rich HTML into clean, safe HTML:
 * - Allows only: p, br, strong, b, em, i, u, h1, h2, h3, h4, ul, ol, li, blockquote, span
 * - Expresses centered/justified alignment & indentation with simple CSS classes only
 * - Strips font sizes, font families, colors, inline styles, scripts, event handlers,
 *   page/text-box wrappers, editor unclear markers, and trailing empty paragraphs
 */
export function sanitizeLessonBodyHtml(rawHtml: string): string {
  const input = (rawHtml || '').trim();
  if (!input) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return input
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .trim();
  }

  const preCleaned = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(`<div>${preCleaned}</div>`, 'text/html');
  const sourceRoot = parsedDoc.body.firstElementChild || parsedDoc.body;

  const outDoc = parsedDoc.implementation.createHTMLDocument('');
  const outRoot = outDoc.createElement('div');

  function wrapInlineStyles(el: HTMLElement, children: Node[], existingTag: string): Node[] {
    let nodes = children;
    const weightStr = (el.style?.fontWeight || '').trim().toLowerCase();
    const numericWeight = parseInt(weightStr, 10);
    const wantsBold =
      existingTag !== 'strong' &&
      existingTag !== 'b' &&
      (weightStr === 'bold' || weightStr === 'bolder' || (!Number.isNaN(numericWeight) && numericWeight >= 600));

    const styleStr = (el.style?.fontStyle || '').trim().toLowerCase();
    const wantsItalic = existingTag !== 'em' && existingTag !== 'i' && styleStr === 'italic';

    const decoStr = `${el.style?.textDecoration || ''} ${el.style?.textDecorationLine || ''}`.toLowerCase();
    const wantsUnderline = existingTag !== 'u' && decoStr.includes('underline');

    if (wantsUnderline && nodes.length > 0) {
      const u = outDoc.createElement('u');
      nodes.forEach(n => u.appendChild(n));
      nodes = [u];
    }
    if (wantsItalic && nodes.length > 0) {
      const em = outDoc.createElement('em');
      nodes.forEach(n => em.appendChild(n));
      nodes = [em];
    }
    if (wantsBold && nodes.length > 0) {
      const strong = outDoc.createElement('strong');
      nodes.forEach(n => strong.appendChild(n));
      nodes = [strong];
    }
    return nodes;
  }

  function sanitizeNode(node: Node): Node[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return [];
      return [outDoc.createTextNode(text)];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const el = node as HTMLElement;
    const rawTag = el.tagName.toLowerCase();

    if (DROPPED_HTML_ELEMENTS.has(rawTag)) {
      return [];
    }

    if (rawTag === 'br') {
      return [outDoc.createElement('br')];
    }

    let childNodes: Node[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      childNodes.push(...sanitizeNode(el.childNodes[i]));
    }

    // Handle <div> / layout wrapper / <center>
    if (BLOCK_CONVERT_TO_P_TAGS.has(rawTag)) {
      if (containsDirectOrNestedBlock(el)) {
        // Unwrap layout container (e.g. page wrapper) so child blocks sit cleanly at top level
        if (rawTag === 'center') {
          childNodes.forEach(ch => {
            if (ch.nodeType === Node.ELEMENT_NODE) {
              const blockEl = ch as HTMLElement;
              if (BLOCK_LEVEL_TAGS.has(blockEl.tagName.toLowerCase()) && !blockEl.classList.contains('lesson-align-center')) {
                blockEl.classList.add('lesson-align-center');
              }
            }
          });
        }
        return childNodes;
      }

      const p = outDoc.createElement('p');
      const classes = extractAllowedLessonClasses(el, rawTag === 'center');
      if (classes.length > 0) {
        p.setAttribute('class', classes.join(' '));
      }
      const wrapped = wrapInlineStyles(el, childNodes, 'p');
      if (wrapped.length === 0) {
        p.appendChild(outDoc.createElement('br'));
      } else {
        wrapped.forEach(n => p.appendChild(n));
      }
      return [p];
    }

    const targetTag = HEADING_PROMOTE_TO_H4.has(rawTag) ? 'h4' : rawTag;

    if (!ALLOWED_LESSON_HTML_TAGS.has(targetTag)) {
      // Unwrap unrecognized containers like <font>, <a>, <table>, etc., keeping text & inline styles
      return wrapInlineStyles(el, childNodes, '');
    }

    if (targetTag === 'span') {
      const classes = extractAllowedLessonClasses(el);
      const styledChildren = wrapInlineStyles(el, childNodes, 'span');
      if (classes.length === 0) {
        return styledChildren;
      }
      const span = outDoc.createElement('span');
      span.setAttribute('class', classes.join(' '));
      styledChildren.forEach(n => span.appendChild(n));
      return [span];
    }

    if (targetTag === 'strong' || targetTag === 'b' || targetTag === 'em' || targetTag === 'i' || targetTag === 'u') {
      const styledChildren = wrapInlineStyles(el, childNodes, targetTag);
      const hasBr = styledChildren.some(n => n.nodeName.toLowerCase() === 'br');
      const hasText = styledChildren.some(n => (n.textContent || '').length > 0);
      if (!hasBr && !hasText) {
        return [];
      }
      const inlineEl = outDoc.createElement(targetTag);
      styledChildren.forEach(n => inlineEl.appendChild(n));
      return [inlineEl];
    }

    if (targetTag === 'ul' || targetTag === 'ol') {
      const listEl = outDoc.createElement(targetTag);
      if (targetTag === 'ol') {
        const typeAttr = (el.getAttribute('type') || '').trim();
        if (/^[1aAiI]$/.test(typeAttr)) {
          listEl.setAttribute('type', typeAttr);
        }
      }
      const classes = extractAllowedLessonClasses(el);
      if (classes.length > 0) {
        listEl.setAttribute('class', classes.join(' '));
      }

      for (const ch of childNodes) {
        if (ch.nodeType === Node.ELEMENT_NODE && ch.nodeName.toLowerCase() === 'li') {
          if (hasVisibleLessonText(ch)) {
            listEl.appendChild(ch);
          }
        } else if (ch.nodeType === Node.ELEMENT_NODE || (ch.textContent || '').trim()) {
          const li = outDoc.createElement('li');
          li.appendChild(ch);
          if (hasVisibleLessonText(li)) {
            listEl.appendChild(li);
          }
        }
      }

      return listEl.children.length > 0 ? [listEl] : [];
    }

    // Block tags: p, h1, h2, h3, h4, li, blockquote
    const blockEl = outDoc.createElement(targetTag);
    const classes = extractAllowedLessonClasses(el);
    if (classes.length > 0) {
      blockEl.setAttribute('class', classes.join(' '));
    }

    const wrappedChildren = wrapInlineStyles(el, childNodes, targetTag);
    wrappedChildren.forEach(n => blockEl.appendChild(n));

    if (targetTag === 'p' && blockEl.childNodes.length === 0) {
      blockEl.appendChild(outDoc.createElement('br'));
    }

    if ((targetTag === 'h1' || targetTag === 'h2' || targetTag === 'h3' || targetTag === 'h4' || targetTag === 'blockquote') && !hasVisibleLessonText(blockEl)) {
      return [];
    }

    return [blockEl];
  }

  // Sanitize all top-level nodes and wrap stray top-level inline/text nodes in <p>
  let pendingInline: Node[] = [];
  const flushPendingInline = () => {
    const hasContent = pendingInline.some(
      n => n.nodeName.toLowerCase() === 'br' || (n.textContent || '').replace(/\u00a0/g, ' ').trim().length > 0
    );
    if (hasContent) {
      const p = outDoc.createElement('p');
      pendingInline.forEach(n => p.appendChild(n));
      outRoot.appendChild(p);
    }
    pendingInline = [];
  };

  for (let i = 0; i < sourceRoot.childNodes.length; i++) {
    const sanitized = sanitizeNode(sourceRoot.childNodes[i]);
    for (const node of sanitized) {
      const isTopBlock =
        node.nodeType === Node.ELEMENT_NODE &&
        BLOCK_LEVEL_TAGS.has((node as HTMLElement).tagName.toLowerCase());
      if (isTopBlock) {
        flushPendingInline();
        outRoot.appendChild(node);
      } else {
        pendingInline.push(node);
      }
    }
  }
  flushPendingInline();

  // Remove trailing empty paragraphs / trailing whitespace / trailing <br>
  while (outRoot.lastChild) {
    const last = outRoot.lastChild;
    if (last.nodeType === Node.TEXT_NODE) {
      if (!(last.textContent || '').replace(/\u00a0/g, ' ').trim()) {
        outRoot.removeChild(last);
        continue;
      }
      break;
    }
    if (last.nodeType === Node.ELEMENT_NODE) {
      const lastTag = (last as HTMLElement).tagName.toLowerCase();
      if (lastTag === 'br' || !hasVisibleLessonText(last)) {
        outRoot.removeChild(last);
        continue;
      }
    }
    break;
  }

  if (!hasVisibleLessonText(outRoot)) {
    return '';
  }

  return outRoot.innerHTML;
}

export type BulkLessonPreviewStatus = 'valid' | 'already_added' | 'invalid';

export interface BulkLessonPreviewRow {
  lineNumber: number;
  rawLine: string;
  parsedDate: string;
  rawDate: string;
  title: string;
  driveUrl: string;
  status: BulkLessonPreviewStatus;
  reason?: string;
}

function buildLessonIdentityKey(sundayDate: string, title: string, driveUrl: string): string {
  return `${sundayDate.trim()}||${title.trim()}||${driveUrl.trim()}`;
}

export function parseBulkLessonsInput(
  rawText: string,
  existingLessons: PortalLesson[]
): BulkLessonPreviewRow[] {
  const existingKeys = new Set(
    existingLessons.map(l => buildLessonIdentityKey(l.sundayDate, l.title, l.driveUrl || ''))
  );
  const seenInBatch = new Set<string>();

  const lines = (rawText || '').split(/\r?\n/);
  const rows: BulkLessonPreviewRow[] = [];

  lines.forEach((rawLine, idx) => {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) return;

    const lineNumber = idx + 1;
    const parts = trimmedLine.split('|').map(p => p.trim());

    if (parts.length !== 3) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate: '',
        rawDate: parts[0] || '',
        title: parts[1] || '',
        driveUrl: parts[2] || '',
        status: 'invalid',
        reason: parts.length < 3
          ? 'Expected format: date | title | Drive link'
          : 'Too many "|" separators. Use: date | title | Drive link',
      });
      return;
    }

    const [rawDate, rawTitle, rawUrl] = parts;
    const parsedDate = parseFlexibleLessonDate(rawDate);
    if (!parsedDate) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate: '',
        rawDate,
        title: rawTitle,
        driveUrl: rawUrl,
        status: 'invalid',
        reason: 'Invalid date. Use YYYY-MM-DD, M/D/YYYY, or "Mon D, YYYY".',
      });
      return;
    }

    if (!rawTitle) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate,
        rawDate,
        title: '',
        driveUrl: rawUrl,
        status: 'invalid',
        reason: 'Title is required.',
      });
      return;
    }

    if (rawTitle.length > PORTAL_LESSON_TITLE_MAX) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate,
        rawDate,
        title: rawTitle,
        driveUrl: rawUrl,
        status: 'invalid',
        reason: `Title exceeds ${PORTAL_LESSON_TITLE_MAX} characters.`,
      });
      return;
    }

    const urlCheck = validatePortalLessonDriveUrl(rawUrl);
    if (!urlCheck.valid) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate,
        rawDate,
        title: rawTitle,
        driveUrl: rawUrl,
        status: 'invalid',
        reason: urlCheck.error || 'Invalid Google Drive or Google Docs https link.',
      });
      return;
    }

    const identityKey = buildLessonIdentityKey(parsedDate, rawTitle, urlCheck.normalized);
    if (existingKeys.has(identityKey) || seenInBatch.has(identityKey)) {
      rows.push({
        lineNumber,
        rawLine: trimmedLine,
        parsedDate,
        rawDate,
        title: rawTitle,
        driveUrl: urlCheck.normalized,
        status: 'already_added',
        reason: existingKeys.has(identityKey)
          ? 'Matches an existing lesson (same date, title, and link).'
          : 'Duplicate of an earlier line in this paste.',
      });
      return;
    }

    seenInBatch.add(identityKey);
    rows.push({
      lineNumber,
      rawLine: trimmedLine,
      parsedDate,
      rawDate,
      title: rawTitle,
      driveUrl: urlCheck.normalized,
      status: 'valid',
    });
  });

  return rows;
}
