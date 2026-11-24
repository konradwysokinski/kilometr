import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { readExportZip } from './readZip';
import { ExportError, parseStravaDate, parseStravaExport } from './stravaExport';

// Shaped like a real export: "Distance" twice (km, then metres), descriptions with line breaks.
const ACTIVITIES = [
  'Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Activity Gear,Moving Time,Distance,Elevation Gain',
  '101,"Nov 23, 2026, 7:12:45 AM",Morning Trail Run,Trail Run,"Muddy,\nvery muddy",3900,"12.40",Mud ones,3800,12400.0,410.0',
  '102,"Nov 21, 2026, 6:05:00 PM",Evening Run,Run,,2700,"9.02",Nike Pegasus 41,2650,9020.5,35.0',
  '103,"Nov 20, 2026, 12:30:00 PM",Lunch Run,Run,,1800,"5.00",,1790,5000.0,',
  '104,"Nov 19, 2026, 8:00:00 AM",Gravel loop,Gravel Ride,,9000,"61.30",Canyon Grail CF SL,8800,61300.0,520.0',
  '105,"Nov 18, 2026, 7:00:00 AM",Pool,Swim,,1800,"2.00",,1800,2000.0,0',
  '106,"Nov 17, 2026, 7:00:00 AM",Old pair,Run,,1800,"6.00",Asics Novablast 3,1800,6000.0,20',
].join('\n');

const SHOES = [
  'Shoe Name,Shoe Brand,Shoe Model,Shoe Default Sport Types',
  'Mud ones,Hoka,Speedgoat 5,TrailRun',
  ',Nike,Pegasus 41,Run',
].join('\n');

const BIKES = ['Bike Name,Bike Brand,Bike Model,Bike Default Sport Types', ',Canyon,Grail CF SL,Ride'].join('\n');

describe('parseStravaDate', () => {
  it('reads Strava dates as UTC', () => {
    expect(parseStravaDate('Nov 23, 2026, 7:12:45 AM')).toBe('2026-11-23T07:12:45.000Z');
    expect(parseStravaDate('Nov 21, 2026, 12:05:00 AM')).toBe('2026-11-21T00:05:00.000Z');
    expect(parseStravaDate('Nov 21, 2026, 12:05:00 PM')).toBe('2026-11-21T12:05:00.000Z');
    expect(parseStravaDate('not a date')).toBeNull();
  });
});

describe('parseStravaExport', () => {
  const out = parseStravaExport({ activities: ACTIVITIES, shoes: SHOES, bikes: BIKES });
  const byId = new Map(out.activities.map((a) => [a.id, a]));

  it('keeps runs, walks and rides, skips other sports', () => {
    expect(out.activities.map((a) => a.id)).toEqual(['101', '102', '103', '104', '106']);
  });

  it('uses the distance in metres and maps types', () => {
    expect(byId.get('102')!.distance).toBe(9020.5);
    expect(byId.get('101')!.sportType).toBe('TrailRun');
    expect(byId.get('104')!.sportType).toBe('GravelRide');
    expect(byId.get('101')!.elevationGain).toBe(410);
    expect(byId.get('103')!.elevationGain).toBe(0);
  });

  it('matches gear by its Strava name or by brand + model', () => {
    const hoka = out.gear.find((g) => g.model === 'Speedgoat 5')!;
    expect(byId.get('101')!.gearId).toBe(hoka.id);
    expect(out.nicknames[hoka.id]).toBe('Mud ones');
    const bike = out.gear.find((g) => g.kind === 'bike')!;
    expect(byId.get('104')!.gearId).toBe(bike.id);
    expect(byId.get('103')!.gearId).toBeNull();
  });

  it('keeps gear that only appears on activities', () => {
    const asics = out.gear.find((g) => g.brand === 'Asics')!;
    expect(asics).toMatchObject({ kind: 'shoe', model: 'Novablast 3' });
    expect(out.gear).toHaveLength(4);
  });

  it('rejects files that are not activities.csv', () => {
    expect(() => parseStravaExport({ activities: 'foo,bar\n1,2' })).toThrow(ExportError);
  });
});

describe('surface (Dirt Distance)', () => {
  const withDirt = [
    'Activity ID,Activity Date,Activity Name,Activity Type,Distance,Activity Gear,Distance,Elevation Gain,Dirt Distance',
    '201,"Nov 23, 2026, 7:12:45 AM",Forest loop,Run,"10.00",Mud ones,10000.0,300.0,3000.5',
    '202,"Mar 2, 2020, 7:12:45 AM",Old run,Run,"8.00",Mud ones,8000.0,40.0,',
  ].join('\n');
  const out = parseStravaExport({ activities: withDirt, shoes: SHOES });
  const byId = new Map(out.activities.map((a) => [a.id, a]));

  it('keeps the unpaved metres, and marks runs without the value as unknown', () => {
    expect(byId.get('201')!.dirtDistance).toBe(3000.5);
    expect(byId.get('202')!.dirtDistance).toBeNull();
  });

  it('leaves it out when the export has no such column', () => {
    const plain = parseStravaExport({ activities: ACTIVITIES, shoes: SHOES, bikes: BIKES });
    expect(plain.activities.every((a) => !('dirtDistance' in a))).toBe(true);
  });
});

describe('readExportZip', () => {
  async function zip(files: Record<string, string>) {
    const writer = new ZipWriter(new BlobWriter('application/zip'));
    for (const [name, text] of Object.entries(files)) await writer.add(name, new TextReader(text));
    return writer.close();
  }

  it('finds the CSV files, also inside a top folder', async () => {
    const blob = await zip({
      'export_123/activities.csv': ACTIVITIES,
      'export_123/shoes.csv': SHOES,
      'export_123/activities/101.gpx': '<gpx/>',
    });
    const files = await readExportZip(blob);
    expect(files.activities).toBe(ACTIVITIES);
    expect(files.shoes).toBe(SHOES);
    expect(files.bikes).toBeUndefined();
  });

  it('explains what went wrong', async () => {
    await expect(readExportZip(new Blob(['hello']))).rejects.toMatchObject({ code: 'not-zip' });
    await expect(readExportZip(await zip({ 'profile.csv': 'a,b' }))).rejects.toMatchObject({ code: 'no-activities' });
  });
});
