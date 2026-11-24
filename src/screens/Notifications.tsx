import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../app/store';
import { NoticeCard } from '../components/NoticeCard';
import s from './Notifications.module.css';

export function Notifications() {
  const { notices, markAllRead, t, f } = useStore();
  const navigate = useNavigate();

  // Opening the list counts as reading it.
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <>
      <h1 className={s.title}>{t.notices.title}</h1>
      {notices.length === 0 ? (
        <p className={s.empty}>{t.notices.empty}</p>
      ) : (
        <ul className={s.list}>
          {notices.map((n) => (
            <li key={n.id}>
              <time className={s.date} dateTime={n.createdAt}>
                {f.date(new Date(n.createdAt))}
              </time>
              <NoticeCard notice={n} onAction={() => navigate('/activities')} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
