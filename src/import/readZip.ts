import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { ExportError, type ExportFiles } from './stravaExport';

const baseName = (path: string) => path.split('/').pop()?.toLowerCase() ?? '';

/**
 * Reads only the CSV files we need. The archive is read lazily from the File,
 * so a multi-gigabyte export with GPX/FIT files is fine.
 */
export async function readExportZip(file: Blob): Promise<ExportFiles> {
  let reader: ZipReader<unknown> | null = null;
  try {
    reader = new ZipReader(new BlobReader(file));
    const entries = await reader.getEntries();
    const find = (name: string) => entries.find((e) => !e.directory && baseName(e.filename) === name);
    const read = async (name: string) => {
      const entry = find(name);
      return entry && !entry.directory ? entry.getData(new TextWriter()) : undefined;
    };

    const activities = await read('activities.csv');
    if (!activities) throw new ExportError('no-activities');
    return { activities, shoes: await read('shoes.csv'), bikes: await read('bikes.csv') };
  } catch (e) {
    if (e instanceof ExportError) throw e;
    throw new ExportError('not-zip');
  } finally {
    await reader?.close().catch(() => undefined);
  }
}
