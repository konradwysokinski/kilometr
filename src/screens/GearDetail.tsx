import { useParams } from 'react-router';
import { useDataset } from '../app/store';
import { Placeholder } from './Placeholder';
import { ShoeDetail } from './ShoeDetail';

export function GearDetail() {
  const { id = '' } = useParams();
  const { stats, t } = useDataset();
  const gear = stats.get(id);

  if (!gear) return <p style={{ color: 'var(--ink-muted)' }}>{t.detail.missing}</p>;
  // Bike detail (parts and service log) is a separate screen, not built yet.
  if (gear.gear.kind === 'bike') return <Placeholder screen="bikes" />;
  // Keyed so switching pairs from the sidebar starts fresh.
  return <ShoeDetail key={id} shoe={gear} />;
}
