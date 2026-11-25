import { useStore } from '../app/store';
import type { Notice } from '../domain/notifications';
import { Icon } from './Icon';
import s from './NoticeCard.module.css';

interface Props {
  notice: Notice;
  onAction: () => void;
  /** Warn dot while the notice still needs a look. Toasts are always new. */
  unread?: boolean;
  /** Shown in a toast; the panel has no close button. */
  onClose?: () => void;
}

/** One notice, shared by the toast and the notifications panel. */
export function NoticeCard({ notice, onAction, unread = true, onClose }: Props) {
  const { t, f } = useStore();
  const n = notice.activityIds.length;
  return (
    <div className={`${s.card} ${onClose ? s.toast : ''}`} role={onClose ? 'status' : undefined}>
      <span className={`${s.dot} ${unread ? '' : s.dotRead}`} aria-hidden="true" />
      <div className={s.text}>
        <span className={s.title}>{t.overview.unassigned(n, f.int(n), f.km(notice.km))}</span>
        <span className={s.body}>{t.overview.unassignedHint}</span>
      </div>
      <button type="button" className={s.action} onClick={onAction}>
        {t.overview.assignShoes}
      </button>
      {onClose && (
        <button type="button" className={s.close} aria-label={t.notices.close} onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
