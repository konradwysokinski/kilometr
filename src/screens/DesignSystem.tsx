import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../app/store';
import type { Theme } from '../app/context';
import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { GearCard } from '../components/GearCard';
import { KpiCard } from '../components/KpiCard';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Segmented } from '../components/Segmented';
import { ShareDonut } from '../components/ShareDonut';
import { WearBar } from '../components/WearBar';
import { WeeklyChart } from '../components/WeeklyChart';
import { sampleDataset } from '../data/sample';
import { gearStats } from '../domain/gear';
import { kmByGear, kmShare, periodGear, periodKm, periodSummary } from '../domain/overview';
import { gearColour } from '../lib/colour';
import dialog from '../components/ConfirmDialog.module.css';
import news from '../components/NewsletterForm.module.css';
import overview from './Overview.module.css';
import s from './DesignSystem.module.css';

/**
 * /design-system (and /ds): the living design system. Everything on it is
 * the app's own CSS variables and components, fed with the sample data, so it
 * can't drift from the product. It needs no data of the visitor's.
 */
export function DesignSystem() {
  const { t, f, theme, setThemePref } = useStore();
  const now = useMemo(() => new Date(), []);
  const sample = useMemo(() => {
    const data = sampleDataset(now);
    const stats = gearStats(data, now);
    const month = { kind: 'month' as const, anchor: now };
    const used = kmByGear(data, month);
    const listed = periodGear(stats, used, true);
    return {
      stats,
      summary: periodSummary(data, month),
      chart: periodKm(data, stats, month, 'shoe', now),
      slices: kmShare(listed.filter((x) => x.gear.gear.kind === 'shoe')),
      // Priced pairs only: the cards' "Add price" would write into data this page doesn't have.
      cards: ['g-hs5', 'g-np41', 'g-ses4'].flatMap((id) => stats.get(id) ?? []),
    };
  }, [now]);
  const inMonth = t.period.inMonth(now.getMonth(), f.monthName(now));
  const [pill, setPill] = useState<'all' | 'shoe' | 'bike'>('all');
  useEffect(() => {
    document.title = `${t.ds.title} · Kilometr`;
  }, [t]);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          <a href="/" className={s.wordmark}>
            Kilometr
          </a>
          <h1 className={s.title}>{t.ds.title}</h1>
          <p className={s.lead}>{t.ds.lead}</p>
        </div>
        <div className={s.controls}>
          <Segmented<Theme>
            label={t.settings.theme}
            options={[
              { value: 'light', label: t.settings.themes.light },
              { value: 'dark', label: t.settings.themes.dark },
            ]}
            value={theme}
            onChange={setThemePref}
          />
          <LanguageSwitch />
          <a href="/" className={s.open}>
            {t.ds.openApp}
          </a>
        </div>
      </header>

      <main className={s.panel}>
        <Section title={t.ds.principlesTitle}>
          <ol className={s.principles}>
            {t.ds.principles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Section>

        <Section title={t.ds.colours} hint={t.ds.coloursHint}>
          <Swatches title={t.ds.ground} names={GROUND} />
          <Swatches title={t.ds.text} names={TEXT} />
          <Swatches title={t.ds.brand} names={BRAND} />
          <Swatches title={t.ds.states} names={STATES} />
          <Swatches title={t.ds.gear} hint={t.ds.gearHint} names={GEAR} />
        </Section>

        <Section title={t.ds.type} hint={t.ds.typeHint}>
          <div className={s.typeList}>
            {TYPE.map((x) => (
              <div key={x.name} className={s.typeRow}>
                <span className={s.typeSpec}>
                  <span className={s.typeName}>{x.name}</span>
                  {x.spec}
                </span>
                <span className={s.typeSample} style={x.style}>
                  {x.name === 'wordmark' ? 'Kilometr' : x.name.startsWith('kpi') ? '736 km' : t.ds.sample}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <div className={s.split}>
          <Section title={t.ds.spacing} hint={t.ds.spacingHint}>
            <div className={s.spaces}>
              {SPACES.map((n) => (
                <div key={n} className={s.space}>
                  <span className={s.spaceBar} style={{ width: `var(--space-${n})` }} />
                  <code>--space-{n}</code>
                  <span className={s.muted}>{n * 4}px</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t.ds.radii}>
            <div className={s.radii}>
              {RADII.map(([name, px]) => (
                <div key={name} className={s.radius}>
                  <span className={s.radiusBox} style={{ borderRadius: `var(--radius-${name})` }} />
                  <code>--radius-{name}</code>
                  <span className={s.muted}>{px}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title={t.ds.shadows} hint={t.ds.shadowsHint}>
          <div className={s.shadows}>
            {['panel', 'float', 'modal'].map((name) => (
              <div key={name} className={s.shadow} style={{ boxShadow: `var(--shadow-${name})` }}>
                <code>--shadow-{name}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t.ds.components} hint={t.ds.sampleNote}>
          <Example title={t.ds.buttons}>
            <div className={s.row}>
              <button type="button" className={dialog.primary}>
                {t.ds.primary}
              </button>
              <button type="button" className={dialog.secondary}>
                {t.ds.secondary}
              </button>
            </div>
          </Example>

          <Example title={t.ds.pills}>
            <div className={s.row}>
              {(
                [
                  ['all', t.overview.filterAll, null],
                  ['shoe', t.overview.filterShoes, 5],
                  ['bike', t.overview.filterBikes, 2],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={overview.pill}
                  aria-pressed={pill === key}
                  onClick={() => setPill(key)}
                >
                  {label}
                  {count !== null && <span className={overview.count}>{count}</span>}
                </button>
              ))}
              <LanguageSwitch size="md" />
            </div>
          </Example>

          <Example title={t.ds.chips}>
            <div className={s.row}>
              <Chip>92%</Chip>
              <Chip tone="warn">{t.gear.nearlyDone}</Chip>
              <Chip tone="danger">{t.gear.overLimit}</Chip>
              <Chip tone="accent">{t.start.importTag}</Chip>
            </div>
          </Example>

          <Example title={t.ds.input}>
            <label className={s.field}>
              <span className={s.muted}>{t.ds.inputLabel}</span>
              <input className={news.input} inputMode="decimal" placeholder="599" />
            </label>
          </Example>

          <Example title={t.ds.avatars}>
            <div className={s.row}>
              {sample.cards.map((g) => (
                <Avatar key={g.gear.id} initials={g.initials} colour={g.colour} />
              ))}
              <Avatar initials="SG" colour={4} size={56} />
              <Avatar initials="HS5" colour={1} size={76} photoBadge />
            </div>
          </Example>

          <Example title={t.ds.wear} hint={t.ds.wearHint}>
            <div className={s.wears}>
              {sample.cards.map((g) =>
                g.wear ? (
                  <WearBar
                    key={g.gear.id}
                    ratio={g.wear.ratio}
                    colour={gearColour(g.colour)}
                    label={t.gear.ofLimit(f.int(g.totalKm), f.km(g.wear.limitKm))}
                  />
                ) : null,
              )}
            </div>
          </Example>

          <Example title={t.ds.kpis}>
            <div className={overview.kpis}>
              <KpiCard
                label={t.overview.running}
                value={f.km(sample.summary.runKm)}
                sub={t.overview.runsOnPairs(
                  sample.summary.runCount,
                  f.int(sample.summary.runCount),
                  sample.summary.shoeIds.length,
                  f.int(sample.summary.shoeIds.length),
                )}
              />
              <KpiCard
                label={t.overview.riding}
                value={f.km(sample.summary.rideKm)}
                sub={t.overview.ridesOn(sample.summary.rideCount, f.int(sample.summary.rideCount), 'Grail CF SL')}
              />
              <ShareDonut
                label={t.overview.sharePairs}
                slices={sample.slices}
                sub={t.overview.shareTop}
                empty={t.overview.wearNone(inMonth)}
              />
            </div>
          </Example>

          <Example title={t.ds.cards}>
            <div className={overview.grid}>
              {sample.cards.map((g) => (
                <GearCard key={g.gear.id} gear={g} />
              ))}
            </div>
          </Example>

          <Example title={t.ds.chart}>
            <WeeklyChart kind="shoe" bars={sample.chart.bars} series={sample.chart.series} inPeriod={inMonth} />
          </Example>
        </Section>
      </main>
    </div>
  );
}

// Constants, so the swatches' effect doesn't re-run on every render.
const GROUND = ['canvas', 'surface', 'surface-sunken', 'line', 'line-soft', 'track', 'grid'];
const TEXT = ['ink', 'ink-muted'];
const BRAND = ['accent', 'accent-hover', 'accent-soft', 'on-accent'];
const STATES = ['warn', 'warn-ink', 'warn-soft', 'danger'];
const GEAR = ['gear-1', 'gear-2', 'gear-3', 'gear-4', 'gear-5', 'gear-6', 'gear-7', 'gear-other'];
const SPACES = [1, 2, 3, 4, 5, 6, 8, 10];
const RADII = [
  ['nav', '10px'],
  ['control', '12px'],
  ['tile', '14px'],
  ['card', '18px'],
  ['pill', '999px'],
] as const;

const TYPE = [
  { name: 'wordmark', spec: '30/34 · 400 serif', style: { font: '400 30px/34px var(--font-serif)' } },
  { name: 'kpi-xl', spec: '40/46 · 400', style: { font: '400 40px/46px var(--font-sans)', letterSpacing: '-0.02em' } },
  { name: 'kpi', spec: '34/40 · 400', style: { font: '400 34px/40px var(--font-sans)', letterSpacing: '-0.02em' } },
  { name: 'title', spec: '30/36 · 500', style: { font: '500 30px/36px var(--font-sans)', letterSpacing: '-0.02em' } },
  {
    name: 'card-number',
    spec: '22/28 · 400',
    style: { font: '400 22px/28px var(--font-sans)', letterSpacing: '-0.02em' },
  },
  { name: 'heading', spec: '18/24 · 500', style: { font: '500 18px/24px var(--font-sans)' } },
  { name: 'heading-sm', spec: '16/22 · 500', style: { font: '500 16px/22px var(--font-sans)' } },
  { name: 'body', spec: '14/20 · 400', style: { font: '400 14px/20px var(--font-sans)' } },
  { name: 'caption', spec: '13/18 · 400', style: { font: '400 13px/18px var(--font-sans)' } },
  { name: 'small', spec: '12/16 · 400–500', style: { font: '400 12px/16px var(--font-sans)' } },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {hint && <p className={s.muted}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Example({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className={s.example}>
      <div>
        <h3 className={s.exampleTitle}>{title}</h3>
        {hint && <p className={s.muted}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** One group of colour tokens; the values are read from the live CSS, so they follow the theme. */
function Swatches({ title, hint, names }: { title: string; hint?: string; names: string[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  // The store sets data-theme in an effect after this renders, so read again whenever it changes.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const style = getComputedStyle(root);
      setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [names]);
  return (
    <div className={s.swatchGroup}>
      <div>
        <h3 className={s.exampleTitle}>{title}</h3>
        {hint && <p className={s.muted}>{hint}</p>}
      </div>
      <div className={s.swatches}>
        {names.map((n) => (
          <div key={n} className={s.swatch}>
            <span className={s.chipColour} style={{ background: `var(--${n})` }} />
            <code>--{n}</code>
            <span className={s.muted}>{values[n] ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
