import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import { addActiveSeconds, exportAll, getUsage, grantExtraMinutes, listUsage } from './index';

beforeEach(async () => {
  await resetStorageForTests();
});

describe('usage', () => {
  it('renvoie un enregistrement à zéro sans l\'écrire si rien n\'existe', async () => {
    const usage = await getUsage('p1', '2026-09-25');
    expect(usage).toEqual({ profileId: 'p1', day: '2026-09-25', activeSeconds: 0, extraMinutes: 0 });

    const bundle = await exportAll();
    expect(bundle.usage).toEqual([]);
  });

  it('addActiveSeconds crée puis incrémente', async () => {
    const created = await addActiveSeconds('p1', '2026-09-25', 30);
    expect(created).toEqual({ profileId: 'p1', day: '2026-09-25', activeSeconds: 30, extraMinutes: 0 });

    const incremented = await addActiveSeconds('p1', '2026-09-25', 15);
    expect(incremented.activeSeconds).toBe(45);
  });

  it('grantExtraMinutes crée puis incrémente sans toucher activeSeconds', async () => {
    await addActiveSeconds('p1', '2026-09-25', 30);

    const granted = await grantExtraMinutes('p1', '2026-09-25', 5);
    expect(granted.extraMinutes).toBe(5);
    expect(granted.activeSeconds).toBe(30);

    const grantedAgain = await grantExtraMinutes('p1', '2026-09-25', 15);
    expect(grantedAgain.extraMinutes).toBe(20);
  });

  it('isole les jours et les profils', async () => {
    await addActiveSeconds('p1', '2026-09-25', 10);
    await addActiveSeconds('p1', '2026-09-26', 20);
    await addActiveSeconds('p2', '2026-09-25', 30);

    expect((await getUsage('p1', '2026-09-25')).activeSeconds).toBe(10);
    expect((await getUsage('p1', '2026-09-26')).activeSeconds).toBe(20);
    expect((await getUsage('p2', '2026-09-25')).activeSeconds).toBe(30);
  });

  it('addActiveSeconds ventile aussi par activité quand elle est fournie', async () => {
    const created = await addActiveSeconds('p1', '2026-09-25', 10, 'hub');
    expect(created.activeSeconds).toBe(10);
    expect(created.activitySeconds).toEqual({ hub: 10 });

    const incremented = await addActiveSeconds('p1', '2026-09-25', 5, 'hub');
    expect(incremented.activeSeconds).toBe(15);
    expect(incremented.activitySeconds).toEqual({ hub: 15 });

    const other = await addActiveSeconds('p1', '2026-09-25', 7, 'dictation');
    expect(other.activeSeconds).toBe(22);
    expect(other.activitySeconds).toEqual({ hub: 15, dictation: 7 });
  });

  it('addActiveSeconds sans activité ne touche pas activitySeconds', async () => {
    await addActiveSeconds('p1', '2026-09-25', 10, 'hub');
    const updated = await addActiveSeconds('p1', '2026-09-25', 5);
    expect(updated.activeSeconds).toBe(15);
    expect(updated.activitySeconds).toEqual({ hub: 10 });
  });

  it('listUsage renvoie les jours d\'un profil triés par jour croissant', async () => {
    await addActiveSeconds('p1', '2026-09-26', 10);
    await addActiveSeconds('p1', '2026-09-24', 20);
    await addActiveSeconds('p2', '2026-09-25', 30);

    const days = await listUsage('p1');
    expect(days.map((d) => d.day)).toEqual(['2026-09-24', '2026-09-26']);
    expect(await listUsage('inconnu')).toEqual([]);
  });
});
