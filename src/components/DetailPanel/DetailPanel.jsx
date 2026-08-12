import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import './DetailPanel.css';

/**
 * Persistent, reusable object detail panel.
 *
 * Desktop: docks to the right of the workspace content in place.
 * Mobile (<960px): becomes a bottom sheet over a scrim.
 *
 * - Closes with Escape or the scrim / close button.
 * - Focus moves into the panel on open and returns to the invoker on close.
 * - Never navigates away from the current context — it layers on top of it.
 */
export default function DetailPanel({
  open,
  onClose,
  eyebrow,
  title,
  badges = null,
  children,
  footer = null,
}) {
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 40);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="detail-panel__scrim" aria-hidden="true" onClick={onClose} />
      <aside className="detail-panel" role="complementary" aria-label={title || 'Object details'}>
        <header className="detail-panel__header">
          <div className="detail-panel__heading">
            {eyebrow && <span className="detail-panel__eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
            {badges && <div className="detail-panel__badges">{badges}</div>}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="detail-panel__close"
            aria-label="Close detail panel"
            onClick={onClose}
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="detail-panel__body">
          {children}
        </div>
        {footer && <footer className="detail-panel__footer">{footer}</footer>}
      </aside>
    </>
  );
}
