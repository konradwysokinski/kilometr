import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import { parsePrice } from '../lib/price';
import s from './PriceDialog.module.css';

interface Props {
  gear: GearStats;
  open: boolean;
  onClose: () => void;
}

/**
 * The one thing Kilometr asks for that Strava doesn't know: what the item cost.
 * Saved locally in the item's settings, so it survives a re-import.
 */
export function PriceDialog({ gear, open, onClose }: Props) {
  const { updateSettings, locale, t } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const current = gear.settings.price;
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Whole prices as "599", others with both decimals ("549,90" in Polish).
      const text = current === undefined ? '' : Number.isInteger(current) ? String(current) : current.toFixed(2);
      setValue(locale === 'pl' ? text.replace('.', ',') : text);
      setError(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, current, locale]);

  const save = (price: number | undefined) => {
    updateSettings(gear.gear.id, { price });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the scrim
      }}
    >
      <form
        className={s.body}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const price = parsePrice(value);
          if (price === null) setError(true);
          else save(price);
        }}
      >
        <h2 id={titleId} className={s.title}>
          {t.price.title(gear.name)}
        </h2>

        <div className={s.field}>
          <label htmlFor={inputId} className={s.label}>
            {t.price.label}
          </label>
          <div className={`${s.inputWrap} ${error ? s.invalid : ''}`}>
            <input
              id={inputId}
              className={s.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="599"
              value={value}
              aria-describedby={error ? `${errorId} ${hintId}` : hintId}
              aria-invalid={error || undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
            />
            <span className={s.unit} aria-hidden="true">
              {t.price.currency}
            </span>
          </div>
          {error && (
            <p id={errorId} className={s.error}>
              {t.price.invalid}
            </p>
          )}
          <p id={hintId} className={s.hint}>
            {t.price.hint}
          </p>
        </div>

        <div className={s.actions}>
          {current !== undefined && (
            <button type="button" className={s.remove} onClick={() => save(undefined)}>
              {t.price.remove}
            </button>
          )}
          <button type="button" className={s.secondary} onClick={onClose}>
            {t.price.cancel}
          </button>
          <button type="submit" className={s.primary}>
            {t.price.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
