import { Outlet } from 'react-router';
import { NoticeToasts } from '../components/NoticeToasts';
import { Sidebar } from '../components/Sidebar';
import s from './Layout.module.css';

export function Layout() {
  return (
    <div className={s.app}>
      <Sidebar />
      <main className={s.panel}>
        <Outlet />
      </main>
      <NoticeToasts />
    </div>
  );
}
