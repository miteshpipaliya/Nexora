import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Checks whether an event originated from an element that must allow selection and copying
 * (inputs, textareas, selects, editable areas, and explicitly marked .allow-select elements).
 */
export function isAllowedElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], .allow-select, pre, code')
  );
}

export const CopyGuard: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) {
      document.body.classList.add('admin-route');
      return () => {
        document.body.classList.remove('admin-route');
      };
    }

    document.body.classList.remove('admin-route');

    const handleCopyCut = (e: ClipboardEvent) => {
      if (!isAllowedElement(e.target)) {
        e.preventDefault();
      }
    };

    const handleSelectStart = (e: Event) => {
      if (!isAllowedElement(e.target)) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (!isAllowedElement(e.target)) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isAllowedElement(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isAdmin]);

  return null;
};
