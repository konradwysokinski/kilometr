import { useEffect, useId, useRef } from 'react';
import s from './ConfirmDialog.module.css';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  /** Destructive actions get the danger colour on the confirm button. */
  tone?: 'default' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * A short yes / no question in a native <dialog> (showModal): focus trap,
 * Escape and an inert page behind it come from the browser. Cancel has focus
 * first, so Enter never confirms something destructive by accident.
 */
export function ConfirmDialog({ open, title, body, confirm, cancel, tone = 'default', onClose, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the scrim
      }}
    >
      <div className={s.body}>
        <h2 id={titleId} className={s.title}>
          {title}
        </h2>
        <p id={bodyId} className={s.text}>
          {body}
        </p>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={onClose} autoFocus>
            {cancel}
          </button>
          <button type="button" className={`${s.primary} ${tone === 'danger' ? s.danger : ''}`} onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
