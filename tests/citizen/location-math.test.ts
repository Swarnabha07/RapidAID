/** T4 location helpers. Run: npx --yes tsx --test tests/citizen/*.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCoordinates,
  normalizeLatLng,
  parseCoordinateInput,
  roundCoordinate,
  wrapLongitude,
} from "../../lib/utils/location-math";

test("wrapLongitude brings repeated world copies back into -180..180", () => {
  assert.equal(wrapLongitude(190), -170);
  assert.equal(wrapLongitude(-190), 170);
  assert.equal(wrapLongitude(360), 0);
  assert.equal(wrapLongitude(88.36), 88.36);
  assert.equal(wrapLongitude(180), 180);
  assert.equal(wrapLongitude(-180), -180);
  const w = wrapLongitude(725.5);
  assert.ok(w >= -180 && w <= 180);
});

test("normalizeLatLng rounds, wraps longitude and rejects impossible places", () => {
  assert.deepEqual(normalizeLatLng(22.57264999, 88.36391111), { lat: 22.57265, lng: 88.363911 });
  assert.deepEqual(normalizeLatLng(10, 200), { lat: 10, lng: -160 });
  assert.equal(normalizeLatLng(91, 0), null);
  assert.equal(normalizeLatLng(-90.0001, 0), null);
  assert.equal(normalizeLatLng(Number.NaN, 0), null);
  assert.equal(normalizeLatLng(0, Number.POSITIVE_INFINITY), null);
  assert.deepEqual(normalizeLatLng(90, 180), { lat: 90, lng: 180 });
});

test("roundCoordinate keeps six decimals", () => {
  assert.equal(roundCoordinate(1.23456789), 1.234568);
});

test("parseCoordinateInput accepts plain numbers and comma decimals", () => {
  const ok = parseCoordinateInput(" 22.5726 ", "88,3639");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.value, { lat: 22.5726, lng: 88.3639 });
});

test("parseCoordinateInput rejects blanks, junk and out-of-range values with a message", () => {
  for (const [a, b] of [
    ["", "1"],
    ["1", ""],
    ["abc", "1"],
    ["1e3", "1"],
    ["91", "1"],
    ["1", "181"],
    ["1", "--2"],
  ] as const) {
    const r = parseCoordinateInput(a, b);
    assert.equal(r.ok, false, `${a},${b}`);
    if (!r.ok) assert.ok(r.error.length > 0);
  }
});

test("formatCoordinates is compact and stable", () => {
  assert.equal(formatCoordinates({ lat: 22.5726, lng: 88.3639 }), "22.57260, 88.36390");
});
