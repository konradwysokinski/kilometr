import { useParams } from 'react-router';
import { useDataset } from '../app/store';
import { BikeDetail } from './BikeDetail';
import { ShoeDetail } from './ShoeDetail';

export function GearDetail() {
  const { id = '' } = useParams();
  const { stats, t } = useDataset();
  const gear = stats.get(id);

  if (!gear) return <p style={{ color: 'var(--ink-muted)' }}>{t.detail.missing}</p>;
  // Keyed so switching items from the sidebar starts fresh.
  if (gear.gear.kind === 'bike') return <BikeDetail key={id} bike={gear} />;
  return <ShoeDetail key={id} shoe={gear} />;
}
