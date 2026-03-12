// UI update functions

/**
 * Update countdown timer
 */
function updateCountdown(state) {
	const countdownBox = document.getElementById("countdownBox");
	if (!countdownBox) return;

	const playerCount = state.players.length;
	const readyCount = state.players.filter((p) => p.ready).length;

	// Check if we should start countdown (both players ready, and not already playing)
	if ((state.status === "waiting" || state.status === "ready") && readyCount === 2) {
		// Start countdown if not already running
		if (!countdownTimer) {
			countdownSeconds = COUNTDOWN_DURATION;
			startCountdownTimer();
		}
	} else {
		// Stop countdown if conditions not met
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}

		// Update message based on ready count
		if (playerCount === 0) {
			countdownBox.textContent = "... Waiting for people to join";
		} else if (playerCount === 1) {
			countdownBox.textContent = `... Waiting for second player to join (${playerCount}/2 joined)`;
		} else if (readyCount < 2) {
			countdownBox.textContent = `... Waiting for both players to be ready (${readyCount}/2 ready)`;
		} else if (playerCount > 2) {
			countdownBox.textContent = "Game is full (2/2 players)";
		}
	}
}

/**
 * Start the countdown timer
 */
function startCountdownTimer() {
	const countdownBox = document.getElementById("countdownBox");

	countdownTimer = setInterval(() => {
		countdownSeconds--;

		if (countdownSeconds > 0) {
			countdownBox.textContent = `Game starting in ${countdownSeconds} second${countdownSeconds !== 1 ? "s" : ""}...`;
		} else {
			clearInterval(countdownTimer);
			countdownTimer = null;
			countdownBox.textContent = "Starting game...";

			// Auto-start the game (only control panel starts it)
			if (isControlPanel) {
				setTimeout(() => {
					startGame();
				}, 500);
			}
		}
	}, 1000);
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(status) {
	const indicator = document.querySelector(".status-indicator");
	indicator.className = "status-indicator";

	if (status === "connected") {
		indicator.classList.add("status-connected");
		indicator.innerHTML = "🟢 Connected";
	} else if (status === "connecting") {
		indicator.classList.add("status-connecting");
		indicator.innerHTML = '<span class="loading"></span> Connecting...';
	} else {
		indicator.classList.add("status-disconnected");
		indicator.innerHTML = "🔴 Disconnected";
	}
}

/**
 * Update player list
 */
function updatePlayerList(players) {
	const playerList = document.getElementById("playerList");
	if (!playerList) return;

	playerList.innerHTML = players
		.map((p) => {
			// Show different indicators based on game state
			let indicator = "";
			if (gameState.status === "playing") {
				// During gameplay, show if player has answered
				indicator = p.response ? " ✓" : " ...";
			} else if (gameState.status === "waiting" || gameState.status === "ready") {
				// During waiting, show ready status
				indicator = p.ready ? " ✓" : "";
			}

			return `
        <div class="player-item ${p.ready ? "ready" : ""}">
            <div class="player-dot" style="background: ${p.color}"></div>
            <div class="player-name">${p.assignedRole || p.role}${indicator}</div>
        </div>
    `;
		})
		.join("");
}

/**
 * Update game UI based on state
 */
function updateGameUI(state) {
	const body = document.body;
	const welcomeScreen = document.getElementById("welcomeScreen");
	const playingScreen = document.getElementById("playingScreen");
	const winScreen = document.getElementById("winScreen");
	const loseScreen = document.getElementById("loseScreen");
	const gameCard = document.getElementById("gameCard");

	// Hide all screens
	welcomeScreen.classList.add("hidden");
	playingScreen.classList.add("hidden");
	winScreen.classList.add("hidden");
	loseScreen.classList.add("hidden");

	switch (state.status) {
		case "waiting":
		case "ready":
			body.className = state.status;
			welcomeScreen.classList.remove("hidden");
			if (gameCard) gameCard.classList.add("hidden");
			break;

		case "playing":
			body.className = "playing";
			if (gameCard) gameCard.classList.remove("hidden");
			playingScreen.classList.remove("hidden");
			updatePlayingScreen(state);
			break;

		case "won":
			body.className = "won";
			if (gameCard) gameCard.classList.remove("hidden");
			winScreen.classList.remove("hidden");
			break;

		case "lost":
			body.className = "lost";
			if (gameCard) gameCard.classList.remove("hidden");
			loseScreen.classList.remove("hidden");
			break;
	}
}

/**
 * Update playing screen with current scenario and question
 */
function updatePlayingScreen(state) {
	// Update general context
	const generalContext = document.getElementById("generalContext");
	if (generalContext && state.generalContext) {
		generalContext.textContent = state.generalContext;
	}

	// Update player-specific situation
	const yourSituation = document.getElementById("yourSituation");
	if (yourSituation && playerData) {
		yourSituation.textContent =
			playerData.situation ||
			"Trying to keep everyone organized and making sure they don't forget anything important.";
	}

	// Update question
	const questionBox = document.getElementById("questionBox");
	if (questionBox && state.question) {
		questionBox.textContent = state.question;

		// Hide Elphi message and reasoning section when new question appears
		const elphiMessage = document.getElementById("elphiMessage");
		if (elphiMessage) {
			elphiMessage.classList.add("hidden");
		}

		const aiReasoning = document.getElementById("aiReasoning");
		if (aiReasoning) {
			aiReasoning.classList.add("hidden");
		}
	}

	// Update tension
	const tensionValue = document.getElementById("tensionValue");
	const tensionFill = document.getElementById("tensionFill");
	const tensionText = document.getElementById("tensionText");

	if (tensionValue && tensionFill && tensionText) {
		tensionValue.textContent = state.tension;
		tensionFill.style.width = `${state.tension}%`;
		tensionText.textContent = `${state.tension}%`;
	}

	// Check if player has already answered
	const voiceRecordBtn = document.getElementById("voiceRecordBtn");
	const answerInput = document.getElementById("answerInput");

	if (!voiceRecordBtn || !answerInput) {
		console.error("Voice record button or answer input not found in DOM");
		return;
	}

	if (playerData && playerData.response) {
		voiceRecordBtn.disabled = true;
		voiceRecordBtn.innerHTML = "✓ Answer Submitted";
		voiceRecordBtn.classList.remove("recording");
		answerInput.value = playerData.response;
	} else {
		voiceRecordBtn.disabled = false;
		voiceRecordBtn.innerHTML = "🎤 Record";
		voiceRecordBtn.classList.remove("recording");
		// Clear input for new question if it was previously filled
		if (answerInput.value && !playerData.response) {
			answerInput.value = "";
		}
	}

	// Show status message when all players have answered (auto-analysis will happen)
	const allAnswered = state.players.every((p) => p.response && p.response.trim() !== "");
	let statusMessage = document.getElementById("autoAnalysisStatus");

	if (allAnswered && !statusMessage) {
		// Create status message after the elphi message
		statusMessage = document.createElement("div");
		statusMessage.id = "autoAnalysisStatus";
		statusMessage.style.cssText =
			"margin: 30px auto; padding: 20px 40px; background: linear-gradient(135deg, #6B9BD1 0%, #5A8BC1 100%); color: white; border-radius: 20px; font-size: 1.3rem; font-weight: 600; text-align: center; box-shadow: 0 10px 30px rgba(107, 155, 209, 0.5); max-width: 600px;";
		statusMessage.innerHTML =
			'<span style="font-size: 1.5rem;">🤖</span> All answers received! Analyzing responses...';
		const elphiMessage = document.getElementById("elphiMessage");
		if (elphiMessage && elphiMessage.parentElement) {
			elphiMessage.parentElement.insertBefore(statusMessage, elphiMessage.nextSibling);
		}
	} else if (!allAnswered && statusMessage) {
		statusMessage.remove();
	}

	// Display AI feedback and reasoning when available
	if (state.feedback) {
		console.log("🎯 Displaying feedback from state:", state.feedback);

		// Show Elphi subtitle
		const elphiMessage = document.getElementById("elphiMessage");
		const elphiText = elphiMessage?.querySelector(".elphi-text");
		if (elphiMessage && elphiText) {
			elphiText.textContent = state.feedback;
			elphiMessage.classList.remove("hidden");
		}

		// Show AI reasoning section
		const aiReasoning = document.getElementById("aiReasoning");
		const reasoningText = document.getElementById("reasoningText");
		if (aiReasoning && reasoningText) {
			reasoningText.textContent = state.feedback;
			aiReasoning.classList.remove("hidden");
			console.log("✅ AI Reasoning section displayed from state update");
		}

		// Remove "analyzing" status message if it exists
		if (statusMessage) {
			statusMessage.remove();
		}
	}
}
