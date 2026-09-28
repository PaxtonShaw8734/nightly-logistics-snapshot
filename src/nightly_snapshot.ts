import { z } from "zod";
import { infrai } from "./infrai.js";

export const shipmentEventSchema = z.object({
  shipment_id: z.string().min(1),
  event: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
  occurred_at: z.string().datetime(),
  proof_of_delivery_key: z.string().optional(),
  exception_note: z.string().optional()
});
export const snapshotRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  events: z.array(shipmentEventSchema).min(1)
});
export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

export function selectEventsForSnapshot(input: SnapshotRequest): SnapshotRequest {
  const parsed = snapshotRequestSchema.parse(input);
  return { date: parsed.date, events: parsed.events.filter((event) => event.event !== "exception" || Boolean(event.exception_note)) };
}

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64"); }

export async function writeNightlySnapshot(input: unknown, bucket: string): Promise<{ key: string; count: number }> {
  const selected = selectEventsForSnapshot(input as SnapshotRequest);
  await infrai.storage.bucket.create({ name: bucket });
  const key = `snapshots/${selected.date}.json`;
  await infrai.storage.object.put(bucket, key, {
    data_base64: encode(selected),
    content_type: "application/json",
    idempotency_key: `nightly-snapshot-${selected.date}`
  });
  return { key, count: selected.events.length };
}

if (process.argv[1]?.endsWith("nightly_snapshot.ts")) {
  const date = new Date().toISOString().slice(0, 10);
  const sample = { date, events: [{ shipment_id: "demo-1", event: "in_transit", occurred_at: new Date().toISOString() }] };
  writeNightlySnapshot(sample, process.env.INFRAI_BUCKET ?? "logistics-nightly").then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}
