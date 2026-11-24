import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useStore } from '../app/store';
import { Icon } from './Icon';
import { NoticeCard } from './NoticeCard';
import s from './NoticeBell.module.css';

const PANEL_ID = 'notice-panel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bell in the top-right corner of the content panel on every screen. It opens
 * notifications in a panel that slides in from the right, with no scrim, so the
 * screen behind stays usable. While the panel is open the bell becomes its X.
 */
export function NoticeBell({ open, onOpenChange }: Props) {
  const { notices, markAllRead, t, f } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const unread = notices.filter((n) => !n.read).length;
  const label = open
    ? t.notices.closePanel
    : unread > 0
      ? `${t.notices.title}, ${t.notices.unread(unread)}`
      : t.notices.title;

  // Opening the panel counts as reading it. Re-runs when saved notices finish
  // loading; markAllRead does nothing once all are read.
  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead, notices]);

  // The panel lists every notice, so a toast on top of it would only repeat one.
  useEffect(() => {
    if (open) toast.dismiss();
  }, [open]);

  // Leaving the screen closes the panel.
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    const close = (refocus: boolean) => {
      onOpenChange(false);
      if (refocus) bellRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || bellRef.current?.contains(target)) return;
      // Hand focus back to the bell only if it was in the panel; a click on
      // something focusable outside then takes it as usual.
      close(!!panelRef.current?.contains(document.activeElement));
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        aria-label={label}
        title={open ? undefined : t.notices.title}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className={s.bell}
        data-open={open || undefined}
        onClick={() => onOpenChange(!open)}
      >
        <Icon name={open ? 'close' : 'bell'} size={open ? 16 : 18} />
        {!open && unread > 0 && <span className={s.dot} aria-hidden="true" />}
      </button>

      <aside
        ref={panelRef}
        id={PANEL_ID}
        aria-labelledby={`${PANEL_ID}-title`}
        tabIndex={-1}
        className={s.panel}
        data-open={open || undefined}
        inert={!open}
      >
        <h2 id={`${PANEL_ID}-title`} className={s.title}>
          {t.notices.title}
        </h2>
        {notices.length === 0 ? (
          <p className={s.empty}>{t.notices.empty}</p>
        ) : (
          <ul className={s.list}>
            {notices.map((n) => (
              <li key={n.id}>
                <time className={s.date} dateTime={n.createdAt}>
                  {f.date(new Date(n.createdAt))}
                </time>
                <NoticeCard
                  notice={n}
                  onAction={() => {
                    onOpenChange(false);
                    navigate('/activities');
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
