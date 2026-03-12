// Speech-to-Text functionality using Web Speech API (adapted for multiplayer)

// Speech recognition instance
let recognition = null;
let isListening = false;
let originalText = ""; // Store original text before starting recognition

// Silence detection variables
let silenceTimer = null;
let lastSpeechTime = 0;
const SILENCE_DURATION = 2000; // 2 seconds of silence to auto-stop

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
	recognition.continuous = true; // Keep listening for continuous input
	recognition.interimResults = true; // Show partial results while speaking
	recognition.lang = "en-US"; // Set language

	// Handle speech recognition results
	recognition.onresult = (event) => {
		let interimTranscript = "";
		let finalTranscript = "";

		// Update last speech time (user is speaking)
		lastSpeechTime = Date.now();

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

			// Only start silence timer if we have actual text to submit
			if (textarea.value && textarea.value.trim().length > 0) {
				resetSilenceTimer();
			}
		}
	};

	// Handle errors
	recognition.onerror = (event) => {
		console.error("Speech recognition error:", event.error);

		// Handle "no-speech" error - restart recording automatically if we were listening
		if (event.error === "no-speech") {
			console.log("No speech detected - restarting recording automatically");
			// Don't call stopSpeechRecognition, just let it restart
			if (isListening) {
				// Small delay before restarting
				setTimeout(() => {
					if (isListening && recognition) {
						try {
							recognition.start();
							console.log("Recording restarted after no-speech");
						} catch (e) {
							console.log("Could not restart recording:", e);
						}
					}
				}, 100);
			}
			return;
		}

		// Handle "aborted" error silently - it's expected when manually stopping
		if (event.error === "aborted") {
			console.log("Speech recognition aborted");
			stopSpeechRecognition();
			return;
		}

		// Show alerts only for actual errors that need user attention
		const errorMessages = {
			"not-allowed": "Microphone access denied. Please allow microphone access in your browser settings.",
			network: "Network error occurred. Please check your internet connection.",
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
		clearSilenceTimer();

		// Only auto-submit if we have text and stopped due to silence
		const textarea = document.getElementById("answerInput");
		if (isListening && textarea && textarea.value && textarea.value.trim() !== "") {
			console.log("Auto-submitting voice answer:", textarea.value);
			stopSpeechRecognition();
			// Small delay to ensure UI updates
			setTimeout(() => {
				submitAnswer();
			}, 500);
		} else if (isListening) {
			// No text captured but still listening - restart automatically
			console.log("No speech detected but still listening - restarting recognition");
			setTimeout(() => {
				if (isListening && recognition) {
					try {
						recognition.start();
						console.log("Recording restarted after automatic end");
					} catch (e) {
						console.log("Could not restart recording:", e);
					}
				}
			}, 100);
		} else {
			stopSpeechRecognition();
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
	clearSilenceTimer();

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
	if (button && button.innerHTML.includes("Answer Submitted")) {
		return;
	}

	// Check if already recording
	if (isListening) {
		stopSpeechRecognition();
		return;
	}

	// Check if microphone is assigned (for multi-mic setup)
	let playerRole = "Player";
	if (typeof playerData !== "undefined" && playerData) {
		playerRole = playerData.roleIndex === 0 ? "Player 1" : "Player 2";
	}

	if (window.microphoneManager) {
		const assignedChannel = window.microphoneManager.getAssignedChannel();
		if (assignedChannel !== null) {
			console.log(`🎤 ${playerRole}: Starting recording on Channel ${assignedChannel + 1}`);
			console.log(`⚠️ ${playerRole}: Please speak into your assigned microphone`);
		} else {
			console.warn(`⚠️ ${playerRole}: No microphone channel assigned. Using default device.`);
		}
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

	// Enable the button (in case it was disabled by thinking timer)
	if (button) {
		button.disabled = false;
	}

	try {
		recognition.start();
		lastSpeechTime = Date.now(); // Initialize speech timer
		// Don't start silence timer yet - wait for actual speech to be detected
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

/**
 * Start silence detection timer
 */
function resetSilenceTimer() {
	clearSilenceTimer();

	console.log("⏱️ Silence detection active - will auto-stop after 5s of no speech");

	silenceTimer = setTimeout(() => {
		const timeSinceLastSpeech = Date.now() - lastSpeechTime;

		if (timeSinceLastSpeech >= SILENCE_DURATION && isListening) {
			console.log(`🔇 ${SILENCE_DURATION / 1000} seconds of silence detected, stopping recording...`);
			stopSpeechRecognition();

			// Auto-submit if we have content
			const textarea = document.getElementById("answerInput");
			if (textarea && textarea.value && textarea.value.trim() !== "") {
				setTimeout(() => {
					submitAnswer();
				}, 500);
			}
		}
	}, SILENCE_DURATION);
}

/**
 * Clear silence detection timer
 */
function clearSilenceTimer() {
	if (silenceTimer) {
		clearTimeout(silenceTimer);
		silenceTimer = null;
	}
}
