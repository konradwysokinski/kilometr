import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { NoticeBell } from '../components/NoticeBell';
import { NoticeToasts } from '../components/NoticeToasts';
import { Sidebar } from '../components/Sidebar';
import { useStore } from './store';
import s from './Layout.module.css';

const SIDEBAR_ID = 'sidebar';
/** Matches the drawer breakpoint in Sidebar.module.css. */
const NARROW = '(max-width: 820px)';

export function Layout() {
  const { t } = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Detail screens are a step down from a list, so the top bar offers a way back.
  const isDetail = pathname.startsWith('/gear/');
  const goBack = () => {
    // React Router keeps the history index; with nothing to go back to, go home.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Picking a screen closes the drawer.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const drawer = document.getElementById(SIDEBAR_ID);
    drawer?.querySelector<HTMLElement>('a[aria-current="page"], a')?.focus();
    // The page behind stays put while the drawer is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    // Widening the window past the breakpoint turns the drawer back into the sidebar.
    const mq = window.matchMedia(NARROW);
    const onWide = () => {
      if (!mq.matches) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
      // Back to the button that opened it, unless the user moved on to a screen.
      if (drawer?.contains(document.activeElement) || document.activeElement === document.body) {
        menuButton.current?.focus();
      }
    };
  }, [menuOpen]);

  return (
    <div className={s.app}>
      {/*
        Narrow windows only: left, where you are (back on detail screens, the
        wordmark home); right, actions (the bell, placed here by its own CSS,
        and the menu that opens the sidebar as a drawer).
      */}
      <header className={s.topbar} inert={menuOpen}>
        {isDetail && (
          <button type="button" className={s.barButton} aria-label={t.nav.back} onClick={goBack}>
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        <Link to="/" className={s.wordmark}>
          Kilometr
        </Link>
        <button
          ref={menuButton}
          type="button"
          className={`${s.barButton} ${s.menuButton}`}
          aria-label={t.nav.openMenu}
          aria-expanded={menuOpen}
          aria-controls={SIDEBAR_ID}
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" size={18} />
        </button>
      </header>

      <Sidebar id={SIDEBAR_ID} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div
        className={s.scrim}
        data-open={menuOpen || undefined}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />

      <main className={s.panel} inert={menuOpen}>
        <NoticeBell open={noticesOpen} onOpenChange={setNoticesOpen} />
        <Outlet />
      </main>
      <NoticeToasts paused={noticesOpen} />
    </div>
  );
}
