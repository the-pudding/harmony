const INSECURE_CONTEXT_MESSAGE =
	"Web MIDI requires a secure context. Open this page via http://localhost (not file:// or a remote http:// URL).";

const UNSUPPORTED_BROWSER_MESSAGE =
	"Web MIDI API is not supported in this browser. Try Chrome or Edge.";

export const midiUnavailableReason = (): string | null => {
	if (!window.isSecureContext) return INSECURE_CONTEXT_MESSAGE;
	if (typeof navigator.requestMIDIAccess !== "function")
		return UNSUPPORTED_BROWSER_MESSAGE;
	return null;
};

export const midiErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
