import { describe, expect, it, vi } from 'vitest';
import { loadCatalog, parseCatalog, DATASET_URL, type CatalogStore } from '../../supabase/functions/_shared/rzeszowCatalog';
import { nextWarsawNoon } from '../../supabase/functions/_shared/transport';

const payload = { id: 180, slug: 'rozklady-jazdy-gtfs', name: 'Rozkłady jazdy GTFS', related_files: [{ id: 1101, name: 'GTFS[03-11-2026_31-12-2026]', extension: 'ZIP' }, { id: 1072, name: 'Cennik', extension: 'PDF' }] };
const at = new Date('2026-10-24T09:59:00Z');
function store(): CatalogStore {
  return { read: vi.fn(async () => undefined), claim: vi.fn(async () => ({ status: 'claimed', token: 'test' })), save: vi.fn(async () => {}), finish: vi.fn(async () => {}) };
}
describe('official Rzeszów catalog', () => {
  it('keeps GTFS ZIPs only and never fabricates assignments', () => {
    expect(parseCatalog(payload, at).resources.map(r => r.id)).toEqual([1101]);
    expect(parseCatalog(payload, at)).not.toHaveProperty('courses');
  });
  it('rejects a different dataset and broken responses', () => {
    expect(() => parseCatalog({ ...payload, id: 36 }, at)).toThrow();
    expect(() => parseCatalog('<html>', at)).toThrow();
  });
  it('uses valid cache without external requests', async () => {
    const s = store(); s.read = vi.fn(async () => ({ payload: parseCatalog(payload, at), expiresAt: '2026-10-24T10:00:00Z' }));
    const fetcher = vi.fn();
    await loadCatalog(s, fetcher, at);
    expect(fetcher).not.toHaveBeenCalled(); expect(s.claim).not.toHaveBeenCalled();
  });
  it('refreshes at noon via JSON API and persists until next Polish noon', async () => {
    const s = store(); s.read = vi.fn(async () => ({ payload: parseCatalog(payload, at), expiresAt: '2026-10-24T10:00:00Z' }));
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload)));
    const noon = new Date('2026-10-24T10:00:00Z');
    await loadCatalog(s, fetcher, noon);
    expect(fetcher).toHaveBeenCalledWith(DATASET_URL, expect.objectContaining({ headers: { Accept: 'application/json' } }));
    expect(s.save).toHaveBeenCalledWith(parseCatalog(payload, noon), '2026-10-25T11:00:00.000Z');
  });
  it('does not overwrite data when the API is offline', async () => {
    const s = store();
    await expect(loadCatalog(s, vi.fn(async () => { throw new Error('offline'); }), at)).rejects.toThrow('offline');
    expect(s.save).not.toHaveBeenCalled(); expect(s.finish).toHaveBeenCalledWith('test', 'error');
  });
  it('does not fetch while another identical lookup owns the lease', async () => {
    const s = store(); s.claim = vi.fn(async () => ({ status: 'busy' })); const fetcher = vi.fn();
    await expect(loadCatalog(s, fetcher, at)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('expires before noon the same day and handles both DST changes', () => {
    expect(nextWarsawNoon(at)).toBe('2026-10-24T10:00:00.000Z');
    expect(nextWarsawNoon(new Date('2026-03-28T11:00:00Z'))).toBe('2026-03-29T10:00:00.000Z');
    expect(nextWarsawNoon(new Date('2026-10-24T10:00:01Z'))).toBe('2026-10-25T11:00:00.000Z');
  });
});