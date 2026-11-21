import React, { useEffect, useRef, useState } from 'react';

const VIEWER_SWIPE_ORDER = ['home', 'calendar', 'schedules', 'ministries', 'lessons'] as const;
const EDGE_GUARD_PX = 24;
const MIN_SWIPE_DISTANCE_PX = 60;
const HORIZONTAL_DOMINANCE_RATIO = 1.5;

interface ViewerSwipeContainerProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function hasHorizontalScrollableAncestor(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let el = target instanceof HTMLElement ? target : (target instanceof Node ? target.parentElement : null);
  while (el && el !== boundary) {
    if (el.tagName === 'TABLE') return true;
    if (el.scrollWidth > el.clientWidth + 2) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : (target instanceof Node ? target.parentElement : null);
  if (!el) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [data-no-swipe]'));
}

function isPopupOpenInDom(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], .fixed.inset-0.z-50'));
}

export const ViewerSwipeContainer: React.FC<ViewerSwipeContainerProps> = ({
  currentTab,
  onNavigate,
  disabled = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lockedAxis: 'none' | 'horizontal' | 'vertical';
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lockedAxis: 'none',
  });

  const [swipeAnimDirection, setSwipeAnimDirection] = useState<'none' | 'from-left' | 'from-right'>('none');
  const [swipeSeq, setSwipeSeq] = useState(0);
  const swipeTriggeredTabRef = useRef<string | null>(null);

  // Clear swipe animation direction if user navigated via tap/link instead of swipe
  useEffect(() => {
    if (swipeTriggeredTabRef.current === currentTab) {
      swipeTriggeredTabRef.current = null;
      return;
    }
    setSwipeAnimDirection('none');
  }, [currentTab]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStateRef.current.active = false;
    touchStateRef.current.lockedAxis = 'none';

    if (disabled) return;
    if (e.touches.length !== 1) return;

    const currentIdx = VIEWER_SWIPE_ORDER.indexOf(currentTab as (typeof VIEWER_SWIPE_ORDER)[number]);
    if (currentIdx === -1) return;

    const touch = e.touches[0];
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    if (touch.clientX <= EDGE_GUARD_PX || (viewportWidth > 0 && touch.clientX >= viewportWidth - EDGE_GUARD_PX)) {
      return;
    }

    if (isPopupOpenInDom()) return;
    if (isSwipeIgnoredTarget(e.target)) return;
    if (hasHorizontalScrollableAncestor(e.target, containerRef.current)) return;

    touchStateRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lockedAxis: 'none',
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    if (!state.active) return;

    if (e.touches.length !== 1) {
      state.active = false;
      return;
    }

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (state.lockedAxis === 'none' && (absX > 10 || absY > 10)) {
      if (absY > absX) {
        state.lockedAxis = 'vertical';
        state.active = false;
      } else if (absX > absY * 1.2) {
        state.lockedAxis = 'horizontal';
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    if (!state.active || state.lockedAxis === 'vertical') {
      state.active = false;
      return;
    }
    state.active = false;

    if (disabled || isPopupOpenInDom()) return;
    if (e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (Math.abs(dx) < MIN_SWIPE_DISTANCE_PX) return;
    if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO) return;

    const currentIdx = VIEWER_SWIPE_ORDER.indexOf(currentTab as (typeof VIEWER_SWIPE_ORDER)[number]);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < VIEWER_SWIPE_ORDER.length - 1) {
      const nextTab = VIEWER_SWIPE_ORDER[currentIdx + 1];
      swipeTriggeredTabRef.current = nextTab;
      setSwipeAnimDirection('from-right');
      setSwipeSeq((s) => s + 1);
      onNavigate(nextTab);
    } else if (dx > 0 && currentIdx > 0) {
      const prevTab = VIEWER_SWIPE_ORDER[currentIdx - 1];
      swipeTriggeredTabRef.current = prevTab;
      setSwipeAnimDirection('from-left');
      setSwipeSeq((s) => s + 1);
      onNavigate(prevTab);
    }
  };

  const handleTouchCancel = () => {
    touchStateRef.current.active = false;
    touchStateRef.current.lockedAxis = 'none';
  };

  const animClass =
    swipeAnimDirection === 'from-right'
      ? 'viewer-swipe-from-right'
      : swipeAnimDirection === 'from-left'
        ? 'viewer-swipe-from-left'
        : '';

  return (
    <div
      ref={containerRef}
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onAnimationEnd={() => setSwipeAnimDirection('none')}
      key={swipeAnimDirection !== 'none' ? `swipe-${currentTab}-${swipeSeq}` : undefined}
      className={`flex-1 flex flex-col ${animClass}`}
    >
      {children}
    </div>
  );
};
