import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import { addActiveSeconds, exportAll, getUsage, grantExtraMinutes } from './index';

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
});
