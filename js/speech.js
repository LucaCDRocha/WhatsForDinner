// Speech-to-Text functionality using Web Speech API (adapted for multiplayer)

// Speech recognition instance
let recognition = null;
let isListening = false;
let originalText = ""; // Store original text before starting recognition

/**
 * Initialize speech recognition
 */
function initSpeechRecognition() {
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

	if (!SpeechRecognition) {
		console.error("Speech Recognition not supported in this browser.");
		return false;
	}

	recognition = new SpeechRecognition();
	recognition.continuous = false; // Stop after user finishes speaking
	recognition.interimResults = true; // Show partial results while speaking
	recognition.lang = "en-US"; // Set language

	// Handle speech recognition results
	recognition.onresult = (event) => {
		let interimTranscript = "";
		let finalTranscript = "";

		// Process all results from the current recognition session
		for (let i = 0; i < event.results.length; i++) {
			const transcript = event.results[i][0].transcript;
			if (event.results[i].isFinal) {
				finalTranscript += transcript + " ";
			} else {
				interimTranscript += transcript;
			}
		}

		// Update the answer textarea
		const textarea = document.getElementById("answerInput");
		if (textarea) {
			if (finalTranscript) {
				// Append final transcript to original text
				textarea.value = (originalText + " " + finalTranscript).trim();
				originalText = textarea.value;
			} else if (interimTranscript) {
				// Show interim results (preview only)
				textarea.value = (originalText + " " + interimTranscript).trim();
			}
		}
	};

	// Handle errors
	recognition.onerror = (event) => {
		console.error("Speech recognition error:", event.error);

		const errorMessages = {
			"not-allowed": "Microphone access denied. Please allow microphone access in your browser settings.",
			"no-speech": "No speech detected. Please try again.",
			network: "Network error occurred. Please check your internet connection.",
			aborted: "Speech recognition was aborted.",
			"audio-capture": "No microphone found. Please connect a microphone.",
			"service-not-allowed": "Speech recognition service is not allowed.",
		};

		const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
		alert(message);

		stopSpeechRecognition();
	};

	// Handle speech recognition end
	recognition.onend = () => {
		console.log("Speech recognition ended.");
		stopSpeechRecognition();

		// Auto-submit the answer if we have text
		const textarea = document.getElementById("answerInput");
		if (textarea && textarea.value && textarea.value.trim() !== "") {
			console.log("Auto-submitting voice answer:", textarea.value);
			// Small delay to ensure UI updates
			setTimeout(() => {
				submitAnswer();
			}, 500);
		}
	};

	// Handle speech recognition start
	recognition.onstart = () => {
		console.log("Speech recognition started.");
		isListening = true;
		updateVoiceRecordButton(true);
	};

	return true;
}

/**
 * Start speech recognition
 */
function startSpeechRecognition() {
	// Initialize if not already done
	if (!recognition) {
		const initialized = initSpeechRecognition();
		if (!initialized) {
			alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
			return;
		}
	}

	// Stop any ongoing recognition
	if (isListening) {
		stopSpeechRecognition();
		return;
	}

	// Store the current text in the textarea before starting recognition
	const textarea = document.getElementById("answerInput");
	if (textarea) {
		originalText = textarea.value.trim();
	}

	try {
		recognition.start();
		console.log("Started speech recognition");
	} catch (error) {
		console.error("Error starting speech recognition:", error);
		stopSpeechRecognition();
	}
}

/**
 * Stop speech recognition
 */
function stopSpeechRecognition() {
	if (recognition && isListening) {
		try {
			recognition.stop();
		} catch (error) {
			console.error("Error stopping speech recognition:", error);
		}
	}

	isListening = false;
	updateVoiceRecordButton(false);
	originalText = ""; // Reset original text
}

/**
 * Update the voice record button appearance
 */
function updateVoiceRecordButton(listening) {
	const button = document.getElementById("voiceRecordBtn");
	if (button) {
		if (listening) {
			button.innerHTML = "🔴 Recording...";
			button.classList.add("recording");
		} else {
			button.innerHTML = "🎤 Record";
			button.classList.remove("recording");
		}
	}
}

/**
 * Start voice recording for answer (with auto-submit)
 */
function startVoiceAnswer() {
	const button = document.getElementById("voiceRecordBtn");

	// Check if already answered
	if (button && button.disabled) {
		return;
	}

	// Check if already recording
	if (isListening) {
		stopSpeechRecognition();
		return;
	}

	// Initialize if needed
	if (!recognition) {
		const initialized = initSpeechRecognition();
		if (!initialized) {
			alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
			return;
		}
	}

	// Clear any existing text
	const textarea = document.getElementById("answerInput");
	if (textarea) {
		textarea.value = "";
		originalText = "";
	}

	try {
		recognition.start();
		console.log("Started voice recording for answer");
	} catch (error) {
		console.error("Error starting voice recording:", error);
		stopSpeechRecognition();
	}
}

/**
 * Update the microphone button appearance (legacy - kept for compatibility)
 */
function updateMicrophoneButton(listening) {
	updateVoiceRecordButton(listening);
}

/**
 * Check if speech recognition is supported
 */
function isSpeechRecognitionSupported() {
	return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
