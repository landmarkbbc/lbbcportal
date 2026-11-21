import React from 'react';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', '\'', '"']);

function splitTrailingUrlChars(rawUrl: string): { url: string; trailing: string } {
  let url = rawUrl;
  let trailing = '';

  while (url.length > 0) {
    const lastChar = url[url.length - 1];
    if (TRAILING_PUNCTUATION.has(lastChar)) {
      trailing = lastChar + trailing;
      url = url.slice(0, -1);
      continue;
    }
    if (lastChar === ')') {
      const openCount = (url.match(/\(/g) || []).length;
      const closeCount = (url.match(/\)/g) || []).length;
      if (closeCount > openCount) {
        trailing = lastChar + trailing;
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }

  return { url, trailing };
}

function isSafeHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely splits plain text into React text nodes and clickable http(s) anchor elements.
 * Never interprets or injects HTML.
 */
export function linkifyPlainText(
  text: string,
  linkClassName = 'text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent break-all'
): React.ReactNode[] {
  if (!text) return [''];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  URL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const rawMatch = match[0];

    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart));
    }

    const { url, trailing } = splitTrailingUrlChars(rawMatch);

    if (url && isSafeHttpUrl(url)) {
      nodes.push(
        <a
          key={`ann-link-${keyCounter++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
      if (trailing) {
        nodes.push(trailing);
      }
    } else {
      nodes.push(rawMatch);
    }

    lastIndex = matchStart + rawMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
