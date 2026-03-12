// WebSocket connection management

/**
 * Connect to WebSocket server
 */
function connect() {
	ws = new WebSocket(WS_URL);

	ws.onopen = () => {
		console.log("✅ Connected to server");
		updateConnectionStatus("connected");

		// Join the game
		ws.send(
			JSON.stringify({
				type: "join",
			}),
		);
	};

	ws.onmessage = (event) => {
		const message = JSON.parse(event.data);
		console.log("📨 Received:", message);

		switch (message.type) {
			case "joined":
				handleJoined(message.player);
				break;

			case "state_update":
				handleStateUpdate(message.state);
				break;

			case "start_thinking_timer":
				// Player 1 TTS has completed, start thinking timer for all players
				console.log("💬 Player 1 finished narration, starting thinking timer");
				if (typeof startThinkingTimer === "function") {
					startThinkingTimer();
				}
				break;

			case "error":
				console.error("⚠️ Server error:", message.message);
				// Remove analyzing status if it exists
				const statusMessage = document.getElementById("autoAnalysisStatus");
				if (statusMessage) {
					statusMessage.remove();
				}
				alert(message.message);
				break;
		}
	};

	ws.onclose = () => {
		console.log("❌ Disconnected from server");
		updateConnectionStatus("disconnected");
		setTimeout(connect, 2000); // Reconnect after 2 seconds
	};

	ws.onerror = (error) => {
		console.error("WebSocket error:", error);
		updateConnectionStatus("disconnected");
	};
}

/**
 * Handle joined message from server
 */
async function handleJoined(player) {
	playerData = player;
	playerId = player.id;
	console.log(`✅ Joined as ${player.role} with Mic Channel ${player.micChannel + 1}`, player);

	// Check if this is the first player (control panel)
	isControlPanel = player.roleIndex === 0;

	// Update role badge
	const roleBadge = document.getElementById("roleBadge");
	if (roleBadge) {
		// assignedRole already includes name and age (e.g., "Sarah: Mom (42)")
		roleBadge.textContent = `Role: ${player.assignedRole || player.role}`;
		roleBadge.style.background = player.color;
	}

	// Auto-assign microphone channel
	if (player.micChannel !== undefined) {
		console.log(`🎤 Auto-assigning ${player.role} → Mic Channel ${player.micChannel + 1}...`);

		// Initialize multi-channel audio
		const success = await window.microphoneManager.init();

		if (success) {
			// Assign the designated channel
			window.microphoneManager.assignChannel(player.micChannel);

			// Update microphone display
			const micChannelDisplay = document.getElementById("micChannelDisplay");
			if (micChannelDisplay) {
				micChannelDisplay.textContent = `✓ ${player.role} → Mic ${player.micChannel + 1}`;
				micChannelDisplay.style.color = "#4CAF50";
				micChannelDisplay.style.fontWeight = "bold";
			}
			console.log(`✅ ${player.role} assigned to Mic Channel ${player.micChannel + 1}`);
		} else {
			console.error("❌ Failed to initialize microphone");
			const micChannelDisplay = document.getElementById("micChannelDisplay");
			if (micChannelDisplay) {
				micChannelDisplay.textContent = `❌ Mic initialization failed - check permissions`;
				micChannelDisplay.style.color = "#f44336";
			}
		}
	}

	// Update ready button state
	const readyBtn = document.getElementById("readyBtn");
	if (readyBtn && playerData) {
		if (playerData.ready) {
			readyBtn.textContent = "✓ Ready!";
			readyBtn.style.background = "#45a049";
		} else {
			readyBtn.textContent = "I'm Ready!";
			readyBtn.style.background = "#4CAF50";
		}
	}
}

/**
 * Handle state update from server
 */
function handleStateUpdate(state) {
	gameState = state;
	console.log("📊 State updated:", state);

	// If game is reset to waiting, clean up all client states
	if (state.status === "waiting") {
		resetAllClientStates();
	}

	// Update player data from state if we have an ID
	if (playerId) {
		const updatedPlayerData = state.players.find((p) => p.id === playerId);
		if (updatedPlayerData) {
			playerData = updatedPlayerData;

			// Update role badge with new assigned role (when game starts)
			const roleBadge = document.getElementById("roleBadge");
			if (roleBadge && playerData) {
				// assignedRole already includes name and age (e.g., "Sarah: Mom (42)")
				roleBadge.textContent = `Role: ${playerData.assignedRole || playerData.role}`;
				roleBadge.style.background = playerData.color;
				console.log("🎭 Role badge updated:", playerData.assignedRole || playerData.role);
			}
		}
	}

	// Update UI based on game status
	updatePlayerList(state.players);
	updateGameUI(state);

	// Handle countdown timer for auto-start
	updateCountdown(state);

	// Update ready button state
	const readyBtn = document.getElementById("readyBtn");
	if (readyBtn && playerData) {
		if (playerData.ready) {
			readyBtn.textContent = "✓ Ready!";
			readyBtn.style.background = "#45a049";
		} else {
			readyBtn.textContent = "I'm Ready!";
			readyBtn.style.background = "#4CAF50";
		}
	}
}

/**
 * Reset all client-side states when returning to waiting screen
 * This ensures a clean slate when a player disconnects or game resets
 */
function resetAllClientStates() {
	console.log("🔄 Resetting all client states...");

	// Stop all timers
	if (countdownTimer) {
		clearInterval(countdownTimer);
		countdownTimer = null;
	}
	if (thinkingTimer) {
		clearInterval(thinkingTimer);
		thinkingTimer = null;
	}

	// Stop speech recognition if active
	if (typeof stopSpeechRecognition === "function") {
		stopSpeechRecognition();
	}

	// Stop TTS if speaking
	if (typeof stopSpeaking === "function") {
		stopSpeaking();
	}

	// Reset state variables
	currentQuestionId = null;
	lastSpokenFeedback = null;
	countdownSeconds = 0;
	thinkingSeconds = 0;

	// Reset UI elements
	const answerInput = document.getElementById("answerInput");
	if (answerInput) {
		answerInput.value = "";
	}

	const voiceRecordBtn = document.getElementById("voiceRecordBtn");
	if (voiceRecordBtn) {
		voiceRecordBtn.disabled = false;
		voiceRecordBtn.innerHTML = "🎤 Record";
		voiceRecordBtn.classList.remove("recording");
	}

	const elphiMessage = document.getElementById("elphiMessage");
	if (elphiMessage) {
		elphiMessage.classList.add("hidden");
		const elphiText = elphiMessage.querySelector(".elphi-text");
		if (elphiText) {
			elphiText.textContent = "";
		}
	}

	const countdownBox = document.getElementById("countdownBox");
	if (countdownBox) {
		countdownBox.textContent = "... Waiting for people to join";
	}

	console.log("✅ All client states reset");
}

/**
 * Mark player as ready (toggle)
 */
function markReady() {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		alert("Not connected to server");
		return;
	}

	// Toggle ready state
	const newReadyState = !(playerData && playerData.ready);

	ws.send(
		JSON.stringify({
			type: "ready",
			ready: newReadyState,
		}),
	);

	if (playerData) {
		playerData.ready = newReadyState;
	}

	// Update status display (minimal)
	const readyStatus = document.getElementById("readyStatus");
	if (readyStatus) {
		if (newReadyState) {
			readyStatus.textContent = "✓ Ready";
			readyStatus.style.color = "#4CAF50";
			readyStatus.style.opacity = "0.5";
		} else {
			readyStatus.textContent = "Press R";
			readyStatus.style.color = "#999";
			readyStatus.style.opacity = "0.3";
		}
	}
}

/**
 * Mark player ready with specific state (for keyboard control)
 */
function markReadyWithState(readyState) {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		console.log("Not connected to server");
		return;
	}

	// Only send if state is changing
	if (playerData && playerData.ready === readyState) {
		return;
	}

	ws.send(
		JSON.stringify({
			type: "ready",
			ready: readyState,
		}),
	);

	if (playerData) {
		playerData.ready = readyState;
	}

	// Update status display (minimal)
	const readyStatus = document.getElementById("readyStatus");
	if (readyStatus) {
		if (readyState) {
			readyStatus.textContent = "✓ Ready";
			readyStatus.style.color = "#4CAF50";
			readyStatus.style.opacity = "0.5";
		} else {
			readyStatus.textContent = "Press R";
			readyStatus.style.color = "#999";
			readyStatus.style.opacity = "0.3";
		}
	}
}

/**
 * Submit player answer
 */
function submitAnswer() {
	const answerInput = document.getElementById("answerInput");

	if (!answerInput) {
		console.error("Answer input not found");
		return;
	}

	const answer = answerInput.value.trim();

	if (!answer) {
		alert("Please type an answer first");
		return;
	}

	if (!ws || ws.readyState !== WebSocket.OPEN) {
		alert("Not connected to server");
		return;
	}

	ws.send(
		JSON.stringify({
			type: "answer",
			answer: answer,
		}),
	);

	// Update button (now using voice record button)
	const voiceRecordBtn = document.getElementById("voiceRecordBtn");
	if (voiceRecordBtn) {
		voiceRecordBtn.disabled = true;
		voiceRecordBtn.textContent = "✓ Answer Submitted";
	}

	if (answerInput) {
		answerInput.disabled = true;
	}

	console.log("✅ Answer submitted:", answer);
}

/**
 * Reset game
 */
async function resetGame() {
	try {
		await fetch(`${API_BASE_URL}/api/reset`, { method: "POST" });
		console.log("✅ Game reset");
	} catch (error) {
		console.error("Error resetting game:", error);
		window.location.reload();
	}
}
