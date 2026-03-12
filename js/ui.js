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
		// Check if this is a new question
		const isNewQuestion = currentQuestionId !== state.question;

		if (isNewQuestion) {
			currentQuestionId = state.question;
			questionBox.textContent = state.question;

			// Hide Elphi message and reasoning section when new question appears
			const elphiMessage = document.getElementById("elphiMessage");
			if (elphiMessage) {
				elphiMessage.classList.add("hidden");
			}

			// Start thinking timer for new question (only if player hasn't answered)
			if (playerData && !playerData.response) {
				startThinkingTimer();
			}
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
		// Player has already answered - stop any timers and lock button
		stopThinkingTimer();
		voiceRecordBtn.disabled = true;
		voiceRecordBtn.innerHTML = "✓ Answer Submitted";
		voiceRecordBtn.classList.remove("recording");
		answerInput.value = playerData.response;
	} else if (!thinkingTimer && !isListening) {
		// Only reset button if no timer is running and not currently recording
		voiceRecordBtn.disabled = false;
		voiceRecordBtn.innerHTML = "🎤 Record";
		voiceRecordBtn.classList.remove("recording");
		// Clear input for new question if it was previously filled
		if (answerInput.value && !playerData.response) {
			answerInput.value = "";
		}
	}
	// If thinking timer or recording is active, don't change button state

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

	// Display AI feedback as Elphi subtitle
	if (state.feedback) {
		console.log("🎯 Displaying feedback from state:", state.feedback);

		// Show Elphi subtitle
		const elphiMessage = document.getElementById("elphiMessage");
		const elphiText = elphiMessage?.querySelector(".elphi-text");
		if (elphiMessage && elphiText) {
			elphiText.textContent = state.feedback;
			elphiMessage.classList.remove("hidden");
		}

		// Remove "analyzing" status message if it exists
		if (statusMessage) {
			statusMessage.remove();
		}
	}
}

/**
 * Start the 10-second thinking timer before recording starts
 */
function startThinkingTimer() {
	// Clear any existing thinking timer
	if (thinkingTimer) {
		clearInterval(thinkingTimer);
		thinkingTimer = null;
	}

	// Set thinking time to 10 seconds
	thinkingSeconds = 10;

	const voiceRecordBtn = document.getElementById("voiceRecordBtn");
	const timerDisplay = document.getElementById("timerDisplay");
	const timerText = document.getElementById("timerText");

	if (!voiceRecordBtn) return;

	// Disable button and show countdown
	voiceRecordBtn.disabled = true;
	voiceRecordBtn.innerHTML = `⏳ Think & discuss (${thinkingSeconds}s)`;

	// Show timer display
	if (timerDisplay) {
		timerDisplay.classList.remove("hidden");
		if (timerText) {
			timerText.textContent = `⏳ Think & discuss: ${thinkingSeconds}s`;
		}
	}

	console.log("🤔 Starting 10-second thinking timer...");

	// Start countdown
	thinkingTimer = setInterval(() => {
		thinkingSeconds--;

		if (thinkingSeconds > 0) {
			// Update button
			voiceRecordBtn.innerHTML = `⏳ Think & discuss (${thinkingSeconds}s)`;
			// Update timer display
			if (timerText) {
				timerText.textContent = `⏳ Think & discuss: ${thinkingSeconds}s`;
			}
		} else {
			// Thinking time is over, start recording automatically
			clearInterval(thinkingTimer);
			thinkingTimer = null;

			voiceRecordBtn.innerHTML = "🎤 Recording...";
			voiceRecordBtn.classList.add("recording");

			// Update timer display to show recording status
			if (timerText) {
				timerText.innerHTML = "🔴 Recording... (stops after 5s of silence)";
			}

			console.log("✅ Thinking time over! Auto-starting recording...");

			// Auto-start voice recording
			setTimeout(() => {
				startVoiceAnswer();
			}, 500);
		}
	}, 1000);
}

/**
 * Stop the thinking timer if it's running
 */
function stopThinkingTimer() {
	if (thinkingTimer) {
		clearInterval(thinkingTimer);
		thinkingTimer = null;
	}

	// Hide timer display
	const timerDisplay = document.getElementById("timerDisplay");
	if (timerDisplay) {
		timerDisplay.classList.add("hidden");
	}
}
