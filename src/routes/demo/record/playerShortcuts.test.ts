import { describe, expect, it } from "vitest";
import { playerActionFor, SEEK_STEP_SECONDS } from "./playerShortcuts.js";

const keyEvent = (key: string, overrides: Partial<KeyboardEvent> = {}) => ({
	key,
	metaKey: false,
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	defaultPrevented: false,
	...overrides
});

describe("playerActionFor", () => {
	it("maps space, z, and arrows to player actions", () => {
		expect(playerActionFor(keyEvent(" "))).toEqual({ type: "togglePlayback" });
		expect(playerActionFor(keyEvent("z"))).toEqual({ type: "restart" });
		expect(playerActionFor(keyEvent("Z"))).toEqual({ type: "restart" });
		expect(playerActionFor(keyEvent("ArrowLeft"))).toEqual({
			type: "seekBy",
			seconds: -SEEK_STEP_SECONDS
		});
		expect(playerActionFor(keyEvent("ArrowRight"))).toEqual({
			type: "seekBy",
			seconds: SEEK_STEP_SECONDS
		});
	});

	it("maps command or control + z to undo", () => {
		expect(playerActionFor(keyEvent("z", { metaKey: true }))).toEqual({
			type: "undo"
		});
		expect(playerActionFor(keyEvent("z", { ctrlKey: true }))).toEqual({
			type: "undo"
		});
	});

	it("ignores unmapped keys, other modifier combos, and handled events", () => {
		expect(playerActionFor(keyEvent("x"))).toBeUndefined();
		expect(
			playerActionFor(keyEvent("ArrowLeft", { metaKey: true }))
		).toBeUndefined();
		expect(
			playerActionFor(keyEvent("z", { metaKey: true, shiftKey: true }))
		).toBeUndefined();
		expect(playerActionFor(keyEvent("z", { altKey: true }))).toBeUndefined();
		expect(
			playerActionFor(keyEvent("ArrowLeft", { defaultPrevented: true }))
		).toBeUndefined();
	});
});
