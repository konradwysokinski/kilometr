import { NavLink } from 'react-router';
import { useStore } from '../app/store';
import { Icon } from './Icon';
import s from './NoticeBell.module.css';

/** Top-right of the content panel on every screen; new notices toast just below it. */
export function NoticeBell() {
  const { notices, t } = useStore();
  const unread = notices.filter((n) => !n.read).length;
  const label = unread > 0 ? `${t.notices.title}, ${t.notices.unread(unread)}` : t.notices.title;

  return (
    <NavLink to="/notifications" aria-label={label} title={t.notices.title} className={s.bell}>
      <Icon name="bell" size={18} />
      {unread > 0 && <span className={s.dot} aria-hidden="true" />}
    </NavLink>
  );
}
