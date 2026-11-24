import { withAssignments } from '../domain/assign';
import type { Dataset, GearSettings } from '../domain/types';
import { readExportZip } from './readZip';
import { parseStravaExport } from './stravaExport';

/**
 * Builds a dataset from an export .zip. Things the user entered in Kilometr
 * (prices, limits, parts, picked shoes…) survive a re-import because gear keeps its ID.
 */
export async function importStravaExport(file: Blob, previous: Dataset | null): Promise<Dataset> {
  const parsed = parseStravaExport(await readExportZip(file));

  const settings: Record<string, GearSettings> = { ...(previous?.source === 'export' ? previous.settings : {}) };
  for (const [id, nickname] of Object.entries(parsed.nicknames)) {
    settings[id] = { nickname, ...settings[id] };
  }

  const next: Dataset = {
    source: 'export',
    updatedAt: new Date().toISOString(),
    gear: parsed.gear,
    activities: parsed.activities,
    settings,
    parts: previous?.source === 'export' ? previous.parts : [],
  };
  // Shoes picked in Kilometr stay on their runs, unless the new export has shoes on them.
  return withAssignments(next, previous?.source === 'export' ? previous.assignments : undefined);
}
