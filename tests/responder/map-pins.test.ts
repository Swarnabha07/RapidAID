import test from "node:test";
import assert from "node:assert/strict";
import { buildMapPins, hasValidCoordinates, type MapIncidentLike } from "../../lib/utils/map-pins";

function inc(over: Partial<MapIncidentLike> = {}): MapIncidentLike {
  return { id: "R1", urgency: "Critical", status: "Open", isSOS: false, lat: 22.5, lng: 88.3, ...over };
}

test("valid reports become pins, with urgency and SOS preserved", () => {
  const { pins, missing } = buildMapPins([inc(), inc({ id: "R2", urgency: "Normal", isSOS: true })]);
  assert.equal(missing, 0);
  assert.deepEqual(pins.map((p) => [p.id, p.urgency, p.isSOS]), [["R1", "critical", false], ["R2", "normal", true]]);
});

test("missing or invalid coordinates are counted, never placed at a made-up position", () => {
  const { pins, missing } = buildMapPins([
    inc({ id: "a", lat: null }),
    inc({ id: "b", lng: null }),
    inc({ id: "c", lat: NaN }),
    inc({ id: "d", lat: 91 }),
    inc({ id: "e", lng: -181 }),
    inc({ id: "ok" }),
  ]);
  assert.deepEqual(pins.map((p) => p.id), ["ok"]);
  assert.equal(missing, 5);
});

test("(0, 0) is a valid coordinate and resolved incidents are flagged", () => {
  assert.equal(hasValidCoordinates(0, 0), true);
  const { pins } = buildMapPins([inc({ lat: 0, lng: 0, status: "Resolved" })]);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].resolved, true);
});

test("every incident is either a pin or counted as missing (nothing silently dropped)", () => {
  const list = [inc({ id: "1" }), inc({ id: "2", lat: null }), inc({ id: "3", isSOS: true })];
  const { pins, missing } = buildMapPins(list);
  assert.equal(pins.length + missing, list.length);
});
