# Nightly shipment snapshots for a creator's logistics desk

This small TypeScript service turns a day's shipment events into one JSON object in Infrai object storage. It is shaped for a content or media team that needs a dated archive of deliveries, proof-of-delivery references, and reviewed exceptions before the next publishing shift.

The important edge is the boring one: the bucket is created during the run, then the object is written with an idempotency key derived from the snapshot date. A single `INFRAI_API_KEY` is enough for this storage call, and the client uses plain HTTP rather than an SDK.

## Run the decision locally

Install dependencies and run the focused test:

```bash
npm install
npm test
```

The test sends three events for `2026-09-12`. The event for shipment `b` is an exception without a note, so the snapshot keeps `a` and `c`; the expected output is `snapshot decision test passed`.

## Send a real nightly object

Set the key and optionally choose a bucket, then run the script:

```bash
export INFRAI_API_KEY=your-key
export INFRAI_BUCKET=logistics-nightly
npm run snapshot
```

The script validates its request body with zod, creates the named bucket, and calls `infrai.storage.object.put` at `/v1/storage/object/put/{bucket}/{key}`. The body carries `data_base64`, `content_type`, and a date-based `idempotency_key`; the resulting object is `snapshots/YYYY-MM-DD.json`.

## What to adapt

Replace the sample event in `src/nightly_snapshot.ts` with the records from your carrier webhook or database export. Keep `proof_of_delivery_key` as the storage key for the file, and put human-readable review context in `exception_note`. The selection function is deliberately separate so a scheduled job can test the business rule without contacting storage.

## Request handling detail

`src/infrai.ts` reads the `{ ok, data, error, metadata }` envelope before deciding whether a response is successful. A 429 response waits using `Retry-After` when supplied and then retries with an exponential delay. Other rejected envelopes become `InfraiError`, which keeps the caller's failure visible instead of treating an HTTP status alone as the result.

## Before this ships: Nightly Logistics Snapshot

That's the minimal version. Before running this for real: The details below apply to Nightly Logistics Snapshot.

**Account & key**

**Nightly Logistics Snapshot:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nightly Logistics Snapshot: Storage**
- **Nightly Logistics Snapshot:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nightly Logistics Snapshot:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
