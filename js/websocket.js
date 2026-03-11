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
function handleJoined(player) {
	playerData = player;
	playerId = player.id;
	console.log(`✅ Joined as ${player.role}`, player);

	// Check if this is the first player (control panel)
	isControlPanel = player.roleIndex === 0;

	// Update role badge
	const roleBadge = document.getElementById("roleBadge");
	if (roleBadge) {
		// assignedRole already includes name and age (e.g., "Sarah: Mom (42)")
		roleBadge.textContent = `Role: ${player.assignedRole || player.role}`;
		roleBadge.style.background = player.color;
	}

	// Update microphone display with player number
	const micChannelDisplay = document.getElementById("micChannelDisplay");
	if (micChannelDisplay && playerId) {
		micChannelDisplay.textContent = `Player ${playerId} → Use Mic ${playerId}`;
		micChannelDisplay.style.color = "#000";
		micChannelDisplay.style.fontWeight = "bold";
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
 * Mark player as ready
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

	// Update button
	const readyBtn = document.getElementById("readyBtn");
	if (readyBtn) {
		if (newReadyState) {
			readyBtn.textContent = "✓ Ready!";
			readyBtn.style.background = "#45a049";
		} else {
			readyBtn.textContent = "I'm Ready!";
			readyBtn.style.background = "#4CAF50";
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
