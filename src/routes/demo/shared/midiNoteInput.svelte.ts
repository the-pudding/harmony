import { onDestroy } from "svelte";
import {
	createMidiInput,
	midiErrorMessage,
	midiUnavailableReason
} from "../../../chord-processing/index.js";
import type { MidiDeviceInfo } from "../../../chord-processing/types.js";

const activeInputName = (inputs: MidiDeviceInfo[]): string =>
	inputs.find((input) => input.isActive)?.name ?? "";

export const createMidiNoteInput = (onNoteOn: (midi: number) => void) => {
	let isConnected = $state(false);
	let inputName = $state("");
	let connectError = $state("");

	const midiInput = createMidiInput({
		onNoteOn: ({ midi }) => onNoteOn(midi),
		onStateChange: (inputs) => {
			inputName = activeInputName(inputs);
		}
	});

	const connect = async () => {
		const unavailableReason = midiUnavailableReason();
		connectError = unavailableReason ?? "";
		if (unavailableReason) return;
		try {
			inputName = (await midiInput.connect())?.name ?? "";
			isConnected = true;
		} catch (error) {
			connectError = midiErrorMessage(error);
		}
	};

	onDestroy(midiInput.disconnect);

	return {
		get isConnected() {
			return isConnected;
		},
		get inputName() {
			return inputName;
		},
		get connectError() {
			return connectError;
		},
		connect
	};
};
