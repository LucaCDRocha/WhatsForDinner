// Multi-channel microphone management for Focusrite Scarlet 4i4

let audioContext = null;
let mediaStream = null;
let channelSplitter = null;
let micAnalysers = [null, null, null, null];
let monitoringActive = false;
let assignedChannel = null; // Which channel this player is using (0-3)

const VOLUME_THRESHOLD = 10; // Adjust based on testing
const CHECK_INTERVAL = 100; // Check volume every 100ms

/**
 * Initialize multi-channel audio system
 */
async function initMultiChannelAudio() {
	try {
		console.log("🎤 Initializing multi-channel audio...");

		// First check what's available
		const devices = await navigator.mediaDevices.enumerateDevices();
		const audioInputs = devices.filter((d) => d.kind === "audioinput");
		console.log("Available audio inputs:", audioInputs);

		// Request 4 audio channels
		mediaStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 4,
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
			},
		});

		// Check what we actually got
		const track = mediaStream.getAudioTracks()[0];
		const settings = track.getSettings();
		console.log("Audio track settings:", settings);

		if (settings.channelCount < 4) {
			console.warn(`⚠️ Only ${settings.channelCount} channels available. Expected 4.`);
			console.warn("Check Windows Sound Settings:");
			console.warn("1. Set Focusrite to 4 channels");
			console.warn("2. Disable mono mixing");
		}

		// Create Web Audio context
		audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(mediaStream);

		// Split into 4 channels
		channelSplitter = audioContext.createChannelSplitter(4);
		source.connect(channelSplitter);

		console.log("✅ Multi-channel audio initialized");
		return true;
	} catch (error) {
		console.error("❌ Failed to initialize multi-channel audio:", error);
		return false;
	}
}

/**
 * Create volume analyzer for a specific channel
 */
function createChannelAnalyser(channelIndex) {
	if (!audioContext || !channelSplitter) {
		console.error("Audio context not initialized");
		return null;
	}

	const analyser = audioContext.createAnalyser();
	analyser.fftSize = 256;
	analyser.smoothingTimeConstant = 0.8;

	channelSplitter.connect(analyser, channelIndex);

	console.log(`📊 Created analyser for channel ${channelIndex}`);
	return analyser;
}

/**
 * Get current volume level for a channel
 */
function getChannelVolume(analyser) {
	if (!analyser) return 0;

	const dataArray = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(dataArray);

	// Calculate average volume
	const sum = dataArray.reduce((a, b) => a + b, 0);
	const average = sum / dataArray.length;

	return average;
}

/**
 * Monitor all channels and detect which has sound
 */
function startChannelMonitoring(callback) {
	if (!audioContext || !channelSplitter) {
		console.error("Cannot monitor: audio not initialized");
		return;
	}

	// Create analysers for all 4 channels if not already created
	for (let i = 0; i < 4; i++) {
		if (!micAnalysers[i]) {
			micAnalysers[i] = createChannelAnalyser(i);
		}
	}

	monitoringActive = true;

	function checkVolumes() {
		if (!monitoringActive) return;

		const volumes = micAnalysers.map((analyser) => getChannelVolume(analyser));

		// Call callback with volume data
		if (callback) {
			callback(volumes);
		}

		setTimeout(checkVolumes, CHECK_INTERVAL);
	}

	checkVolumes();
	console.log("🔊 Started monitoring all channels");
}

/**
 * Stop monitoring channels
 */
function stopChannelMonitoring() {
	monitoringActive = false;
	console.log("🔇 Stopped monitoring channels");
}

/**
 * Assign this player to a specific microphone channel
 */
function assignPlayerToChannel(channel) {
	if (channel < 0 || channel > 3) {
		console.error("Invalid channel:", channel);
		return;
	}

	assignedChannel = channel;
	console.log(`👤 Player assigned to microphone channel ${channel + 1}`);
}

/**
 * Get the assigned channel for this player
 */
function getAssignedChannel() {
	return assignedChannel;
}

/**
 * Check if assigned microphone is active
 */
function isMyMicActive() {
	if (assignedChannel === null || !micAnalysers[assignedChannel]) {
		return false;
	}

	const volume = getChannelVolume(micAnalysers[assignedChannel]);
	return volume > VOLUME_THRESHOLD;
}

/**
 * Get audio stream for assigned channel (for speech recognition)
 */
async function getChannelAudioStream(channelIndex) {
	if (!audioContext || !channelSplitter) {
		console.error("Audio context not initialized");
		return null;
	}

	try {
		// Create a destination for this specific channel
		const destination = audioContext.createMediaStreamDestination();
		channelSplitter.connect(destination, channelIndex);

		console.log(`🎙️ Created audio stream for channel ${channelIndex}`);
		return destination.stream;
	} catch (error) {
		console.error("Failed to create channel stream:", error);
		return null;
	}
}

/**
 * Cleanup audio resources
 */
function cleanupAudio() {
	stopChannelMonitoring();

	if (mediaStream) {
		mediaStream.getTracks().forEach((track) => track.stop());
		mediaStream = null;
	}

	if (audioContext) {
		audioContext.close();
		audioContext = null;
	}

	channelSplitter = null;
	micAnalysers = [null, null, null, null];
	assignedChannel = null;

	console.log("🧹 Audio resources cleaned up");
}

/**
 * Display volume levels (for debugging/UI)
 */
function logChannelVolumes() {
	if (!monitoringActive) {
		console.log("Monitoring not active");
		return;
	}

	const volumes = micAnalysers.map((analyser, i) => {
		const vol = getChannelVolume(analyser);
		const bar = "█".repeat(Math.floor(vol / 5));
		return `Ch${i + 1}: ${bar} ${vol.toFixed(1)}`;
	});

	console.log(volumes.join(" | "));
}

/**
 * Quick diagnostic test - logs audio settings
 */
async function diagnosticTest() {
	console.log("\n=== 🔍 MICROPHONE DIAGNOSTIC TEST ===\n");

	// 1. Check available devices
	console.log("1️⃣ Available Audio Devices:");
	const devices = await navigator.mediaDevices.enumerateDevices();
	const audioInputs = devices.filter((d) => d.kind === "audioinput");
	audioInputs.forEach((device, i) => {
		console.log(`   ${i + 1}. ${device.label || "Unnamed Device"} [${device.deviceId.substring(0, 20)}...]`);
	});

	// 2. Request audio and check settings
	console.log("\n2️⃣ Requesting Audio Stream:");
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 4,
				echoCancellation: false,
			},
		});

		const track = stream.getAudioTracks()[0];
		const settings = track.getSettings();

		console.log("   Audio Track Settings:");
		console.log(`   - Device: ${settings.deviceId || "Default"}`);
		console.log(
			`   - Channel Count: ${settings.channelCount} ${settings.channelCount === 4 ? "✅" : "⚠️ Expected 4!"}`,
		);
		console.log(`   - Sample Rate: ${settings.sampleRate} Hz`);
		console.log(`   - Sample Size: ${settings.sampleSize} bits`);
		console.log(`   - Echo Cancellation: ${settings.echoCancellation}`);
		console.log(`   - Auto Gain Control: ${settings.autoGainControl}`);
		console.log(`   - Noise Suppression: ${settings.noiseSuppression}`);

		// Clean up
		stream.getTracks().forEach((t) => t.stop());

		if (settings.channelCount < 4) {
			console.log("\n⚠️ WARNING: Only", settings.channelCount, "channel(s) detected!");
			console.log("   Solutions:");
			console.log("   1. Open Windows Sound Settings");
			console.log("   2. Select Focusrite Scarlett 4i4");
			console.log("   3. Set format to '4 channel, 48000 Hz'");
			console.log("   4. Restart browser");
		} else {
			console.log("\n✅ All systems ready for 4-channel audio!");
		}
	} catch (error) {
		console.error("❌ Error accessing microphone:", error);
		console.log("   Make sure:");
		console.log("   - Focusrite is connected");
		console.log("   - Browser has microphone permission");
		console.log("   - No other app is using the device exclusively");
	}

	console.log("\n=== END DIAGNOSTIC TEST ===\n");
}

// Expose functions
window.microphoneManager = {
	init: initMultiChannelAudio,
	assignChannel: assignPlayerToChannel,
	getAssignedChannel: getAssignedChannel,
	startMonitoring: startChannelMonitoring,
	stopMonitoring: stopChannelMonitoring,
	isMyMicActive: isMyMicActive,
	getChannelStream: getChannelAudioStream,
	logVolumes: logChannelVolumes,
	diagnostic: diagnosticTest,
	cleanup: cleanupAudio,
};
