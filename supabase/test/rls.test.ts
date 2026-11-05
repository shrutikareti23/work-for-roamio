import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

import { as, createUser, freshDb } from './db';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

let db: PGlite;

async function createTrip(userId: string, title = 'Lisbon') {
  return as(db, userId, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into trips (title, destination, start_date, end_date)
       values ($1, 'Lisbon, Portugal', '2026-12-10', '2026-12-15') returning id`,
      [title],
    );
    return r.rows[0]!.id;
  });
}

const count = async (userId: string | null, table: string) =>
  as(db, userId, async (tx) => (await tx.query(`select * from ${table}`)).rows.length);

beforeEach(async () => {
  db = await freshDb();
  await createUser(db, ALICE, 'alice@example.com');
  await createUser(db, BOB, 'bob@example.com');
});

describe('profiles', () => {
  it('are created automatically on sign-up and only visible to their owner', async () => {
    const rows = await as(
      db,
      ALICE,
      async (tx) => (await tx.query('select id from profiles')).rows,
    );
    expect(rows).toEqual([{ id: ALICE }]);
  });

  it('cannot be edited by someone else', async () => {
    await as(db, BOB, (tx) =>
      tx.query(`update profiles set display_name = 'hacked' where id = $1`, [ALICE]),
    );
    const name = await as(
      db,
      ALICE,
      async (tx) =>
        (await tx.query<{ display_name: string | null }>('select display_name from profiles'))
          .rows[0],
    );
    expect(name?.display_name).toBeNull();
  });
});

describe('trips', () => {
  it('each user sees only their own trips', async () => {
    await createTrip(ALICE, 'Alice trip');
    await createTrip(BOB, 'Bob trip');
    const aliceSees = await as(
      db,
      ALICE,
      async (tx) => (await tx.query('select title from trips')).rows,
    );
    expect(aliceSees).toEqual([{ title: 'Alice trip' }]);
  });

  it('owner is set automatically and cannot be faked', async () => {
    await expect(
      as(db, ALICE, (tx) =>
        tx.query(
          `insert into trips (user_id, title, destination, start_date, end_date)
           values ($1, 'x', 'y', '2026-12-10', '2026-12-11')`,
          [BOB],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('nobody can update or delete someone else’s trip', async () => {
    const id = await createTrip(ALICE);
    await as(db, BOB, async (tx) => {
      const upd = await tx.query(`update trips set title = 'mine now' where id = $1`, [id]);
      const del = await tx.query(`delete from trips where id = $1`, [id]);
      expect(upd.affectedRows).toBe(0);
      expect(del.affectedRows).toBe(0);
    });
    expect(await count(ALICE, 'trips')).toBe(1);
  });

  it('cannot be handed over to another user', async () => {
    const id = await createTrip(ALICE);
    await expect(
      as(db, ALICE, (tx) => tx.query(`update trips set user_id = $1 where id = $2`, [BOB, id])),
    ).rejects.toThrow(/row-level security/);
  });

  it('rejects bad dates', async () => {
    await expect(
      as(db, ALICE, (tx) =>
        tx.query(`insert into trips (title, destination, start_date, end_date)
                  values ('x', 'y', '2026-12-15', '2026-12-10')`),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe('trip_days', () => {
  it('cannot be added to someone else’s trip', async () => {
    const aliceTrip = await createTrip(ALICE);
    await expect(
      as(db, BOB, (tx) =>
        tx.query(
          `insert into trip_days (trip_id, day_date, data) values ($1, '2026-12-10', '{}')`,
          [aliceTrip],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('are deleted together with their trip', async () => {
    const id = await createTrip(ALICE);
    await as(db, ALICE, async (tx) => {
      await tx.query(
        `insert into trip_days (trip_id, day_date, data) values ($1, '2026-12-10', '{}')`,
        [id],
      );
      await tx.query(`delete from trips where id = $1`, [id]);
    });
    expect(await count(ALICE, 'trip_days')).toBe(0);
  });
});

describe('ratings', () => {
  const rate = (userId: string, place: string, up: boolean) =>
    as(db, userId, (tx) =>
      tx.query(`insert into ratings (place_id, thumbs_up) values ($1, $2)`, [place, up]),
    );

  it('are private to their author', async () => {
    await rate(ALICE, 'node/1', true);
    expect(await count(BOB, 'ratings')).toBe(0);
  });

  it('one rating per user per place, and place ids must be OSM ids', async () => {
    await rate(ALICE, 'node/1', true);
    await expect(rate(ALICE, 'node/1', false)).rejects.toThrow(/unique/);
    await expect(rate(ALICE, 'Eiffel Tower', true)).rejects.toThrow(/check constraint/);
  });

  it('app-wide counts appear only once a place has at least 5 ratings', async () => {
    const users = Array.from({ length: 5 }, (_, i) => `00000000-0000-0000-0000-00000000000${i}`);
    for (const [i, u] of users.entries()) {
      await createUser(db, u, `u${i}@example.com`);
      if (i < 4) await rate(u, 'node/7', i !== 0);
    }
    const summary = () =>
      as(
        db,
        ALICE,
        async (tx) => (await tx.query(`select * from get_place_ratings(array['node/7'])`)).rows,
      );
    expect(await summary()).toEqual([]); // only 4 ratings so far
    await rate(users[4]!, 'node/7', true);
    expect(await summary()).toEqual([
      { place_id: 'node/7', thumbs_up: 4, thumbs_down: 1, total: 5 },
    ]);
  });
});

describe('logged-out visitors', () => {
  it('cannot read any table', async () => {
    await createTrip(ALICE);
    await expect(count(null, 'trips')).rejects.toThrow(/permission denied/);
    await expect(count(null, 'ratings')).rejects.toThrow(/permission denied/);
  });

  it('cannot delete accounts', async () => {
    await expect(as(db, null, (tx) => tx.query('select delete_my_account()'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('delete_my_account', () => {
  it('removes the user and ALL their data, and nobody else’s', async () => {
    const aliceTrip = await createTrip(ALICE);
    await createTrip(BOB);
    await as(db, ALICE, async (tx) => {
      await tx.query(
        `insert into trip_days (trip_id, day_date, data) values ($1, '2026-12-10', '{}')`,
        [aliceTrip],
      );
      await tx.query(`insert into ratings (place_id, thumbs_up) values ('node/1', true)`);
      await tx.query('select delete_my_account()');
    });

    const left = async (table: string, col = 'user_id') =>
      (await db.query(`select count(*)::int as n from ${table} where ${col} = $1`, [ALICE]))
        .rows[0];
    expect(await left('auth.users', 'id')).toEqual({ n: 0 });
    expect(await left('profiles', 'id')).toEqual({ n: 0 });
    expect(await left('trips')).toEqual({ n: 0 });
    expect(await left('trip_days')).toEqual({ n: 0 });
    expect(await left('ratings')).toEqual({ n: 0 });
    expect(await count(BOB, 'trips')).toBe(1);
  });
});
