import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useDataset } from '../app/store';
import { byLastUsed, type GearStats } from '../domain/gear';
import { unassignedRuns } from '../domain/overview';
import type { GearKind } from '../domain/types';
import { gearColour } from '../lib/colour';
import { Icon, type IconName } from './Icon';
import s from './Sidebar.module.css';

const SIDEBAR_MAX = 5;

const NAV: { to: string; key: 'overview' | 'shoes' | 'bikes' | 'activities' | 'retired'; icon: IconName }[] = [
  { to: '/', key: 'overview', icon: 'overview' },
  { to: '/shoes', key: 'shoes', icon: 'shoe' },
  { to: '/bikes', key: 'bikes', icon: 'bike' },
  { to: '/activities', key: 'activities', icon: 'activity' },
  { to: '/retired', key: 'retired', icon: 'archive' },
];

const navClass = ({ isActive }: { isActive: boolean }) => `${s.navRow} ${isActive ? s.active : ''}`;

interface Props {
  id: string;
  /** Phones and narrow windows only: the sidebar is a drawer there. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ id, open, onClose }: Props) {
  const { data, stats, now, t } = useDataset();
  const location = useLocation();
  const runsWithoutShoes = unassignedRuns(data, now).length;
  const all = [...stats.values()];

  return (
    <nav id={id} aria-label={t.nav.label} className={s.sidebar} data-open={open || undefined}>
      <div className={s.top}>
        <Link to="/" className={s.wordmark}>
          Kilometr
        </Link>
        <button type="button" className={s.close} aria-label={t.nav.closeMenu} onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className={s.group}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end className={navClass}>
            <Icon name={item.icon} className={s.navIcon} />
            <span className={s.grow}>{t.nav[item.key]}</span>
            {item.key === 'activities' && runsWithoutShoes > 0 && (
              <span className={s.warnDot} role="img" aria-label={t.activities.unassigned} />
            )}
          </NavLink>
        ))}
      </div>

      <GearSection title={t.sidebar.shoesInRotation} kind="shoe" all={all} />
      <GearSection title={t.sidebar.bikes} kind="bike" all={all} />

      <div className={`${s.group} ${s.footer}`}>
        <SourceStatus />
        {/* Settings open as a modal over the current screen (see App), so the drawer closes by hand. */}
        <NavLink to="/settings" state={{ background: location }} className={navClass} onClick={onClose}>
          <Icon name="settings" className={s.navIcon} />
          {t.nav.settings}
        </NavLink>
      </div>
    </nav>
  );
}

/** Where the data comes from, and the way to refresh it. */
function SourceStatus() {
  const { data, clear, importFile, importState, stravaState, syncStrava, locale, t, f } = useDataset();
  const input = useRef<HTMLInputElement>(null);
  // "Synced 12 minutes ago" moves on by itself.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (data.source === 'sample') {
    return (
      <div className={s.sync}>
        <span className={s.syncDot} aria-hidden="true" />
        <span className={s.grow}>{t.sidebar.sampleData}</span>
        <button type="button" className={s.textButton} onClick={clear}>
          {t.sidebar.useMine}
        </button>
      </div>
    );
  }

  const reading = importState.status === 'reading';
  const syncing = stravaState.status === 'syncing';
  const failed = importState.status === 'error' || (data.source === 'strava' && stravaState.status === 'error');
  const updated = data.updatedAt ? new Date(data.updatedAt) : null;
  const twoLines = data.source === 'strava' && !syncing && stravaState.status !== 'error' && !!updated;
  const label = reading
    ? t.sidebar.reading
    : syncing
      ? t.sidebar.syncing
      : data.source === 'strava'
        ? stravaState.status === 'error'
          ? t.sidebar.syncFailed
          : updated
            ? t.sidebar.syncedAgo(f.ago(updated, now))
            : t.sidebar.synced
        : updated
          ? t.sidebar.imported(f.dayMonth(updated))
          : t.sidebar.synced;

  return (
    <>
      <div className={s.sync}>
        <span className={`${s.syncDot} ${failed ? s.syncDotWarn : ''}`} aria-hidden="true" />
        <span className={s.grow} role="status" title={updated ? updated.toLocaleString(locale) : undefined}>
          {twoLines ? (
            // "Synced" over "12 minutes ago": the time stays whole in the narrow sidebar.
            <>
              <span className={s.syncTitle}>{t.sidebar.syncedTitle}</span>{' '}
              <span className={s.syncWhen}>{f.ago(updated!, now)}</span>
            </>
          ) : (
            label
          )}
        </span>
        {data.source === 'strava' && (
          <button
            type="button"
            className={s.iconButton}
            disabled={syncing}
            aria-label={t.sidebar.syncNow}
            title={t.sidebar.syncNow}
            onClick={() => void syncStrava()}
          >
            <Icon name="refresh" size={15} />
          </button>
        )}
        {data.source === 'export' && (
          <>
            <button
              type="button"
              className={s.iconButton}
              disabled={reading}
              aria-label={t.sidebar.importAgain}
              title={t.sidebar.importAgain}
              onClick={() => input.current?.click()}
            >
              <Icon name="refresh" size={15} />
            </button>
            <input
              ref={input}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
      {importState.status === 'error' && <p className={s.syncError}>{t.start.errors[importState.code]}</p>}
    </>
  );
}

interface SectionProps {
  title: string;
  kind: GearKind;
  all: GearStats[];
}

function GearSection({ title, kind, all }: SectionProps) {
  const { t, f } = useDataset();
  const [expanded, setExpanded] = useState(false);
  // Retired pairs and "kept for walks" never appear in the sidebar.
  const active = all.filter((g) => g.gear.kind === kind && !g.retired && !g.settings.keepForWalks).sort(byLastUsed);
  const rotation = active.filter((g) => g.inRotation);
  const shown = expanded ? active : rotation.slice(0, SIDEBAR_MAX);
  if (active.length === 0) return null;

  return (
    <div className={s.group}>
      <div className={s.sectionLabel}>{title}</div>
      {shown.map((g) => (
        <NavLink key={g.gear.id} to={`/gear/${g.gear.id}`} className={({ isActive }) => `${s.gearRow} ${isActive ? s.active : ''}`}>
          <span className={s.swatch} style={{ background: gearColour(g.colour) }} aria-hidden="true" />
          <span className={s.gearName}>{g.shortName}</span>
          <span className={s.gearKm}>
            {f.int(g.totalKm)}
            <span className="visually-hidden"> km</span>
          </span>
        </NavLink>
      ))}
      {active.length > shown.length || expanded ? (
        <button type="button" className={s.showAll} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t.sidebar.showFewer : t.sidebar.showAll(f.int(active.length))}
        </button>
      ) : null}
    </div>
  );
}
