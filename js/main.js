// Initialization and event handlers

document.addEventListener("DOMContentLoaded", () => {
	console.log("🚀 WhatsForDinner Game initializing...");

	// Connect to WebSocket server
	connect();

	console.log("✅ Game initialized");
});

// Microphone Testing Functions
let micTestActive = false;

/**
 * Test all 4 microphones and show volume levels
 */
async function testMicrophone() {
	console.log("🎤 Testing microphones...");

	// Initialize multi-channel audio if not already done
	const success = await window.microphoneManager.init();

	if (!success) {
		alert(
			"❌ Could not access 4-channel audio. Check:\n\n1. Focusrite is connected\n2. Windows Sound Settings set to 4 channels\n3. Browser has microphone permission",
		);
		return;
	}

	// Show the meter display
	const micLevels = document.getElementById("micLevels");
	micLevels.style.display = "grid";

	// Start monitoring and update UI
	micTestActive = true;
	window.microphoneManager.startMonitoring((volumes) => {
		if (!micTestActive) return;

		volumes.forEach((volume, index) => {
			const meter = document.querySelector(`.mic-meter[data-channel="${index}"]`);
			if (meter) {
				const fill = meter.querySelector(".meter-fill");
				const value = meter.querySelector(".meter-value");

				const percentage = Math.min(100, (volume / 100) * 100);
				fill.style.height = `${percentage}%`;
				value.textContent = Math.round(volume);

				// Highlight active mics
				if (volume > 10) {
					fill.style.background = "#4CAF50";
				} else {
					fill.style.background = "#ddd";
				}
			}
		});
	});

	console.log("✅ Mic test running. Speak into each microphone.");
}

/**
 * Assign the player to their microphone based on player number
 */
async function assignMicToPlayer() {
	if (!window.microphoneManager) {
		alert("Please test microphones first!");
		return;
	}

	// Check if player is connected and has an ID
	if (!playerId || playerId < 1 || playerId > 4) {
		alert("⚠️ Please wait to be assigned a player number first!\n\nMake sure you're connected to the game server.");
		console.error("Cannot assign mic: playerId is", playerId);
		return;
	}

	const playerNum = playerId; // From state.js (1-4)
	const channel = playerNum - 1; // 0-indexed (0-3)

	console.log(`Assigning Player ${playerNum} to Channel ${channel}`);

	// Initialize if needed
	if (!micTestActive) {
		const success = await window.microphoneManager.init();
		if (!success) {
			alert("Failed to initialize audio system");
			return;
		}
	}

	// Assign channel
	window.microphoneManager.assignChannel(channel);

	// Update UI
	const display = document.getElementById("micChannelDisplay");
	display.textContent = `Mic ${playerNum} (Channel ${channel})`;
	display.style.color = "#4CAF50";

	// Stop test if running
	micTestActive = false;
	window.microphoneManager.stopMonitoring();

	console.log(`✅ Player ${playerNum} assigned to Mic ${playerNum}`);
}

// Make functions globally accessible
window.testMicrophone = testMicrophone;
window.assignMicToPlayer = assignMicToPlayer;
