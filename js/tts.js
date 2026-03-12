// Text-to-Speech functionality using Web Speech API (adapted for multiplayer)

// TTS configuration
const ttsConfig = {
	rate: 1.0, // Speed
	pitch: 1.15, // Higher pitch sounds more upbeat
	volume: 0.95,
	preferredVoice: null,
	enabled: true, // TTS enabled by default for Elphi subtitles
};

// Speech synthesis instance
let synthesis = window.speechSynthesis;
let availableVoices = [];
let isSpeaking = false;

/**
 * Initialize TTS and load available voices
 */
function initTTS() {
	if (!synthesis) {
		console.error("Speech Synthesis not supported in this browser.");
		return false;
	}

	// Load voices
	loadVoices();

	// Chrome requires voices to be loaded asynchronously
	if (speechSynthesis.onvoiceschanged !== undefined) {
		speechSynthesis.onvoiceschanged = loadVoices;
	}

	console.log("✅ Text-to-Speech initialized");
	return true;
}

/**
 * Load voices and find the best natural one
 */
function loadVoices() {
	availableVoices = synthesis.getVoices();

	if (availableVoices.length === 0) {
		console.warn("No voices available yet.");
		return;
	}

	console.log(`📢 Found ${availableVoices.length} voices`);

	// Find the best voice
	const bestVoice = findBestVoice();
	if (bestVoice) {
		ttsConfig.preferredVoice = bestVoice;
		console.log(`🎤 Selected voice: ${bestVoice.name} (${bestVoice.lang})`);
	}
}

/**
 * Find the best natural-sounding voice
 */
function findBestVoice() {
	if (availableVoices.length === 0) return null;

	// Quality keywords - prioritized
	const qualityKeywords = [
		"jenny",
		"aria",
		"neural",
		"wavenet",
		"samantha",
		"google",
		"premium",
		"enhanced",
		"natural",
		"microsoft",
	];

	// Score each voice
	const scoredVoices = availableVoices.map((voice) => {
		let score = 0;
		const nameLower = voice.name.toLowerCase();
		const isEnglish = voice.lang.startsWith("en");

		// Check quality keywords
		qualityKeywords.forEach((keyword, index) => {
			if (nameLower.includes(keyword)) {
				score += 15 - index;
			}
		});

		// Prefer English
		if (isEnglish) score += 5;
		if (voice.lang === "en-US") score += 3;

		// Prefer local voices
		if (voice.localService) score += 2;

		// Prefer female voices (more cheerful)
		if (
			nameLower.includes("female") ||
			nameLower.includes("samantha") ||
			nameLower.includes("jenny") ||
			nameLower.includes("aria")
		) {
			score += 8;
		}

		return { voice, score };
	});

	// Sort and return best
	scoredVoices.sort((a, b) => b.score - a.score);
	return scoredVoices[0].voice;
}

/**
 * Speak text with natural voice
 */
function speak(text, options = {}) {
	if (!ttsConfig.enabled) return Promise.resolve();

	return new Promise((resolve, reject) => {
		if (!text || text.trim() === "") {
			resolve();
			return;
		}

		// Stop current speech if needed
		if (options.interrupt) {
			stopSpeaking();
		}

		const utterance = new SpeechSynthesisUtterance(text);

		// Apply configuration
		utterance.rate = options.rate || ttsConfig.rate;
		utterance.pitch = options.pitch || ttsConfig.pitch;
		utterance.volume = options.volume || ttsConfig.volume;

		// Set voice
		if (ttsConfig.preferredVoice) {
			utterance.voice = ttsConfig.preferredVoice;
		}

		// Event handlers
		utterance.onstart = () => {
			isSpeaking = true;
			console.log(`🗣️ Speaking: "${text.substring(0, 50)}..."`);
		};

		utterance.onend = () => {
			isSpeaking = false;
			console.log("✅ Speech completed");
			resolve();
		};

		utterance.onerror = (event) => {
			isSpeaking = false;
			console.error("Speech error:", event.error);
			reject(event);
		};

		// Speak
		synthesis.speak(utterance);
	});
}

/**
 * Stop speaking
 */
function stopSpeaking() {
	if (synthesis && isSpeaking) {
		synthesis.cancel();
		isSpeaking = false;
		console.log("🔇 Speech stopped");
	}
}

/**
 * Toggle TTS on/off
 */
function toggleTTS() {
	ttsConfig.enabled = !ttsConfig.enabled;
	console.log(`TTS ${ttsConfig.enabled ? "enabled" : "disabled"}`);
	return ttsConfig.enabled;
}

/**
 * Check if TTS is supported
 */
function isTTSSupported() {
	return !!window.speechSynthesis;
}

// Initialize on load
if (isTTSSupported()) {
	initTTS();
}
