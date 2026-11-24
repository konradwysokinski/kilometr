import { useState } from 'react';
import { Outlet } from 'react-router';
import { NoticeBell } from '../components/NoticeBell';
import { NoticeToasts } from '../components/NoticeToasts';
import { Sidebar } from '../components/Sidebar';
import s from './Layout.module.css';

export function Layout() {
  const [noticesOpen, setNoticesOpen] = useState(false);
  return (
    <div className={s.app}>
      <Sidebar />
      <main className={s.panel}>
        <NoticeBell open={noticesOpen} onOpenChange={setNoticesOpen} />
        <Outlet />
      </main>
      <NoticeToasts paused={noticesOpen} />
    </div>
  );
}
