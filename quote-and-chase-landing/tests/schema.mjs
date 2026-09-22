// Run the real schema on real Postgres (pglite = Postgres compiled to WASM), so a syntax or constraint
// mistake is caught here rather than on the first deploy against Neon.
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
globalThis.__relayDb = { query: (t, p = []) => db.query(t, p), exec: (s) => db.exec(s) };
const { migrate, q } = await import('../api/_db.js');

let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const ran = await migrate();
ok(ran.length >= 1 && ran[0] === '001-init.sql' && ran.every(f => /^\d{3}-.*\.sql$/.test(f)), 'every migration applies to an empty database, in order: ' + ran.join(', '));
ok((await migrate()).length === 0, 'running it again does nothing');

const tables = (await q("select table_name from information_schema.tables where table_schema='public' order by 1")).rows.map(r => r.table_name);
ok(['booking','busy','doc','inbound','job_index','migration','outbound','painter'].every(t => tables.includes(t)), 'every table is there: ' + tables.join(', '));

await q("insert into painter (id, trading_name, phone, state) values ($1,$2,$3,$4)", ['cus_1', "Dave's Painting", '+61412000000', 'SA']);
await q(`insert into job_index (painter_id, job_id, client_name, client_phone, quote_no, total_cents, status, sent_at)
         values ('cus_1','j1','Jane','+61411222333','Q-1001',269500,'quoted', now())`);

// the lookup an inbound reply actually does
const hit = (await q(`select painter_id, job_id, client_name from job_index
  where client_phone=$1 and status='quoted' order by sent_at desc limit 1`, ['+61411222333'])).rows[0];
ok(hit && hit.painter_id === 'cus_1' && hit.job_id === 'j1' && hit.client_name === 'Jane',
   'an inbound number finds the painter and the job: ' + JSON.stringify(hit));

// a booking is the source of truth, and a job cannot hold two live ones
await q("insert into booking (id, painter_id, job_id, start_day, days) values ('b1','cus_1','j1','2026-10-13',2)");
let clash = false;
try { await q("insert into booking (id, painter_id, job_id, start_day, days) values ('b2','cus_1','j1','2026-10-20',2)"); }
catch (e) { clash = true; }
ok(clash, 'a second live booking on the same job is refused by the database, not by hopeful code');
await q("update booking set cancelled_at = now() where id='b1'");
await q("insert into booking (id, painter_id, job_id, start_day, days) values ('b2','cus_1','j1','2026-10-20',2)");
ok(true, 'once the first is cancelled the job can be rebooked');

// document sync, last revision wins
await q("insert into doc (painter_id, kind, id, rev, body) values ('cus_1','job','j1',1,'{\"total\":2695}')");
await q(`insert into doc (painter_id, kind, id, rev, body) values ('cus_1','job','j1',2,'{"total":2800}')
         on conflict (painter_id, kind, id) do update set rev=excluded.rev, body=excluded.body, updated_at=now()
         where doc.rev < excluded.rev`);
ok((await q("select body->>'total' t from doc where id='j1'")).rows[0].t === '2800', 'a newer revision replaces an older one');
await q(`insert into doc (painter_id, kind, id, rev, body) values ('cus_1','job','j1',1,'{"total":1}')
         on conflict (painter_id, kind, id) do update set rev=excluded.rev, body=excluded.body, updated_at=now()
         where doc.rev < excluded.rev`);
ok((await q("select body->>'total' t from doc where id='j1'")).rows[0].t === '2800', 'a stale one is ignored, so a phone that was offline cannot undo newer work');

// busy days keep their source apart
await q("insert into busy (painter_id, day, source) values ('cus_1','2026-10-13','app'), ('cus_1','2026-10-13','gcal')");
ok((await q("select count(*)::int n from busy where day='2026-10-13'")).rows[0].n === 2, 'the same day can be busy from his jobs and from his calendar without one wiping the other');

// deleting a painter takes his data with him, replies included, and leaves other people's alone
const { forgetPainter } = await import('../api/_store.js');
await q("insert into painter (id, trading_name, phone, state) values ('cus_2','Bob',$1,'SA')", ['+61412000002']);
await q("insert into inbound (id, painter_id, job_id, from_addr, body, action) values ('SM1','cus_1','j1','+61411222333','YES','accepted')");
await q("insert into inbound (id, painter_id, job_id, from_addr, body, action) values ('SM2','cus_2','j9','+61411222444','YES','accepted')");
await q("insert into inbound (id, painter_id, job_id, from_addr, body, action) values ('SM3',null,'','+61411999999','what?','unmatched')");
const gone = await forgetPainter('cus_1');
ok(gone.painter === 1 && gone.replies === 1, 'forgetting a painter reports what went: ' + JSON.stringify(gone));
const left = (await q("select (select count(*) from doc)+(select count(*) from job_index)+(select count(*) from busy)+(select count(*) from booking)+(select count(*) from outbound)+(select count(*) from inbound where painter_id='cus_1') n")).rows[0].n;
ok(Number(left) === 0, 'deleting a painter deletes everything of his (' + left + ' rows left)');
const others = (await q("select id from inbound order by id")).rows.map(r => r.id).join(',');
ok(others === 'SM2,SM3', "another painter's replies, and the ones that belong to nobody, are untouched: " + others);
ok((await q("select count(*)::int n from painter")).rows[0].n === 1, 'and the other painter is still there');

await db.close();
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
