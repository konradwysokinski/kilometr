import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useStore } from '../app/store';
import { Icon } from './Icon';
import { NoticeCard } from './NoticeCard';
import s from './NoticeBell.module.css';

const PANEL_ID = 'notice-panel';

/** Where the X sits when the bell isn't near the top of the screen: the panel's own padding (40 + 10, or 28 + 10 on phones). */
const fallbackTop = () => (window.matchMedia('(max-width: 640px)').matches ? 38 : 50);

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
  // Where the bell is on screen when the panel opens. The X stays exactly there,
  // so nothing jumps, and the panel lines its title up with it.
  const [anchor, setAnchor] = useState({ top: 50, left: 0 });
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
    // The anchor is measured once, so a new layout would leave the X floating.
    // Only a width change counts: phones resize the height as the address bar hides.
    const width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== width) onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onResize);
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
        style={open ? { top: anchor.top, left: anchor.left } : undefined}
        onClick={() => {
          if (!open && bellRef.current) {
            const r = bellRef.current.getBoundingClientRect();
            // Out of view, or low on a phone where the sidebar sits above the content:
            // the X takes the panel's usual corner instead.
            const offCorner = r.top < 0 || r.top > 120;
            setAnchor({ top: offCorner ? fallbackTop() : Math.max(r.top, 20), left: r.left });
          }
          onOpenChange(!open);
        }}
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
        style={{ '--x-top': `${anchor.top}px` } as CSSProperties}
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
