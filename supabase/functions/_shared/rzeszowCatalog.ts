import { nextWarsawNoon } from './transport.ts';

export const DATASET_URL = 'https://otwartedane.erzeszow.pl/v1/datasets/180/?format=json';
export interface Catalog {
  id: 180; name: string; url: string; fetchedAt: string;
  resources: { id: number; name: string; description: string }[];
}
export function parseCatalog(value: unknown, at: Date): Catalog {
  if (!value || typeof value !== 'object') throw new Error('Invalid catalog');
  const data = value as Record<string, unknown>;
  if (data.id !== 180 || data.slug !== 'rozklady-jazdy-gtfs' || typeof data.name !== 'string' || !Array.isArray(data.related_files)) throw new Error('Invalid GTFS dataset');
  const resources = data.related_files.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid resource');
    const r = item as Record<string, unknown>;
    if (typeof r.name !== 'string' || typeof r.extension !== 'string' || typeof r.id !== 'number') throw new Error('Invalid resource');
    // related_files includes unrelated transport datasets; never report those as GTFS.
    return r.extension.toUpperCase() === 'ZIP' && /GTFS/i.test(r.name)
      ? [{ id: r.id, name: r.name, description: typeof r.description === 'string' ? r.description : '' }] : [];
  });
  return { id: 180, name: data.name, url: 'https://otwartedane.erzeszow.pl/dataset/rozklady-jazdy-gtfs', resources, fetchedAt: at.toISOString() };
}
export interface CatalogStore {
  read(): Promise<{ payload: unknown; expiresAt: string } | undefined>;
  claim(): Promise<{ status: string; token?: string }>;
  save(payload: Catalog, expiresAt: string): Promise<void>;
  finish(token: string, status: 'no-data' | 'error'): Promise<void>;
}
export async function loadCatalog(store: CatalogStore, fetcher: typeof fetch = fetch, at = new Date()): Promise<Catalog> {
  const cached = await store.read();
  if (cached && Date.parse(cached.expiresAt) > at.getTime()) return cached.payload as Catalog;
  const claim = await store.claim();
  if (claim.status !== 'claimed' || !claim.token) throw new Error('Catalog request in progress or cooling down');
  try {
    const response = await fetcher(DATASET_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Official API HTTP ${response.status}`);
    const catalog = parseCatalog(await response.json(), at);
    await store.save(catalog, nextWarsawNoon(at));
    await store.finish(claim.token, 'no-data');
    return catalog;
  } catch (error) {
    await store.finish(claim.token, 'error');
    throw error;
  }
}