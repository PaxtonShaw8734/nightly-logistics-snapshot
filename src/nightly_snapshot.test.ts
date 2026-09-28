import assert from "node:assert/strict";
import { selectEventsForSnapshot } from "./nightly_snapshot.js";

const result = selectEventsForSnapshot({
  date: "2026-09-12",
  events: [
    { shipment_id: "a", event: "in_transit", occurred_at: "2026-09-12T01:00:00Z" },
    { shipment_id: "b", event: "exception", occurred_at: "2026-09-12T02:00:00Z" },
    { shipment_id: "c", event: "exception", occurred_at: "2026-09-12T03:00:00Z", exception_note: "Address check" }
  ]
});
assert.deepEqual(result.events.map((event) => event.shipment_id), ["a", "c"]);
console.log("snapshot decision test passed");
