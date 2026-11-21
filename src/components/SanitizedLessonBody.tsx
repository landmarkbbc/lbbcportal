import React, { useMemo } from 'react';
import {
  ALLOWED_LESSON_HTML_CLASSES,
  ALLOWED_LESSON_HTML_TAGS,
  sanitizeLessonBodyHtml,
} from '../lib/portalLessons';

interface SanitizedLessonBodyProps {
  html: string;
  className?: string;
  sizeClassName?: string;
}

function renderDomNodeToReact(node: Node, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (!ALLOWED_LESSON_HTML_TAGS.has(tag)) {
    return null;
  }

  const allowedClasses = Array.from(el.classList).filter(cls =>
    ALLOWED_LESSON_HTML_CLASSES.has(cls)
  );

  const props: Record<string, any> = { key };
  if (allowedClasses.length > 0) {
    props.className = allowedClasses.join(' ');
  }
  if (tag === 'ol') {
    const typeAttr = (el.getAttribute('type') || '').trim();
    if (/^[1aAiI]$/.test(typeAttr)) {
      props.type = typeAttr;
    }
  }

  if (tag === 'br') {
    return React.createElement('br', props);
  }

  const children: React.ReactNode[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const childNode = renderDomNodeToReact(el.childNodes[i], `${key}-${i}`);
    if (childNode !== null && childNode !== undefined) {
      children.push(childNode);
    }
  }

  return React.createElement(tag, props, children.length > 0 ? children : undefined);
}

export const SanitizedLessonBody: React.FC<SanitizedLessonBodyProps> = ({
  html,
  className = '',
  sizeClassName = 'text-sm sm:text-base',
}) => {
  const renderedNodes = useMemo(() => {
    const cleanHtml = sanitizeLessonBodyHtml(html);
    if (!cleanHtml || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return null;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${cleanHtml}</div>`, 'text/html');
    const root = doc.body.firstElementChild || doc.body;

    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < root.childNodes.length; i++) {
      const rendered = renderDomNodeToReact(root.childNodes[i], `lesson-${i}`);
      if (rendered !== null && rendered !== undefined) {
        nodes.push(rendered);
      }
    }
    return nodes;
  }, [html]);

  if (!renderedNodes || renderedNodes.length === 0) {
    return null;
  }

  return (
    <div className={`lesson-content text-main ${sizeClassName} ${className}`.trim()}>
      {renderedNodes}
    </div>
  );
};
