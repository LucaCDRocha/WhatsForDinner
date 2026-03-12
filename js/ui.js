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

			// Reset last spoken feedback for new question
			lastSpokenFeedback = null;

			// Hide Elphi message and reasoning section when new question appears
			const elphiMessage = document.getElementById("elphiMessage");
			if (elphiMessage) {
				elphiMessage.classList.add("hidden");
			}

			// For new questions (without feedback), start thinking timer immediately
			// BUT if there's feedback coming with this question, wait for TTS to complete first
			if (playerData && !playerData.response && !state.feedback) {
				console.log(
					`🎤 New question for ${playerData.roleIndex === 0 ? "Player 1" : "Player 2"} - starting thinking timer`,
				);
				startThinkingTimer();
			} else if (state.feedback) {
				console.log("🔊 New question with feedback - waiting for narration before starting timer");
			}
		}
	}

	// Update tension
	const tensionValue = document.getElementById("tensionValue");
	const tensionFill = document.getElementById("tensionFill");

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
		// Check turn-based logic
		const player1 = state.players.find((p) => p.roleIndex === 0);
		const player2 = state.players.find((p) => p.roleIndex === 1);

		if (playerData.roleIndex === 1 && player1 && !player1.response) {
			// Player 2 must wait for Player 1
			voiceRecordBtn.disabled = true;
			voiceRecordBtn.innerHTML = "⏳ Waiting for Player 1...";
			voiceRecordBtn.classList.remove("recording");
		} else if (playerData.roleIndex === 1 && player1 && player1.response && !playerData.response) {
			// Player 1 has answered, now it's Player 2's turn - start recording immediately
			if (!thinkingTimer && !isListening) {
				console.log("🎤 Player 1 finished, starting Player 2's recording immediately");

				// Enable button and show recording state
				voiceRecordBtn.disabled = false;
				voiceRecordBtn.innerHTML = "🎤 Recording...";
				voiceRecordBtn.classList.add("recording");

				// Start recording immediately (no thinking time for Player 2)
				setTimeout(() => {
					startVoiceAnswer();
				}, 500);
			}
		} else if (!playerData.response) {
			// Default: reset button if no timer is running
			voiceRecordBtn.disabled = false;
			voiceRecordBtn.innerHTML = "🎤 Record";
			voiceRecordBtn.classList.remove("recording");
			// Clear input for new question if it was previously filled
			if (answerInput.value) {
				answerInput.value = "";
			}
		}
	}
	// If thinking timer or recording is active, don't change button state

	// Display AI feedback as Elphi subtitle
	if (state.feedback) {
		console.log("🎯 Displaying feedback from state:", state.feedback);

		// Show Elphi subtitle
		const elphiMessage = document.getElementById("elphiMessage");
		const elphiText = elphiMessage?.querySelector(".elphi-text");
		if (elphiMessage && elphiText) {
			elphiText.textContent = state.feedback;
			elphiMessage.classList.remove("hidden");

			// Read Elphi subtitle with TTS only for Player 1 and only if it's new feedback
			if (
				typeof speak === "function" &&
				state.feedback !== lastSpokenFeedback &&
				playerData &&
				playerData.roleIndex === 0
			) {
				console.log("🔊 Player 1: Starting TTS narration...");

				// Update button to show narrating state
				const voiceRecordBtn = document.getElementById("voiceRecordBtn");
				if (voiceRecordBtn) {
					voiceRecordBtn.disabled = true;
					voiceRecordBtn.innerHTML = "🔊 Narrating...";
					voiceRecordBtn.classList.remove("recording");
				}

				speak(state.feedback, { interrupt: false })
					.then(() => {
						// TTS finished, signal server to start thinking timer for all players
						console.log("✅ Player 1 TTS complete, signaling server");
						if (ws && ws.readyState === WebSocket.OPEN) {
							ws.send(JSON.stringify({ type: "tts_complete" }));
						}
					})
					.catch((error) => {
						console.error("TTS error:", error);
						// If TTS fails, still signal to start timer
						if (ws && ws.readyState === WebSocket.OPEN) {
							ws.send(JSON.stringify({ type: "tts_complete" }));
						}
					});
				lastSpokenFeedback = state.feedback;
			} else if (state.feedback !== lastSpokenFeedback && playerData && playerData.roleIndex !== 0) {
				// For Player 2, update button to wait for Player 1's narration
				console.log("⏳ Player 2: Waiting for Player 1's narration...");
				const voiceRecordBtn = document.getElementById("voiceRecordBtn");
				if (voiceRecordBtn) {
					voiceRecordBtn.disabled = true;
					voiceRecordBtn.innerHTML = "🔊 Waiting for narrator...";
					voiceRecordBtn.classList.remove("recording");
				}
				lastSpokenFeedback = state.feedback;
			}
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

	if (!voiceRecordBtn) return;

	// Disable button and show countdown
	voiceRecordBtn.disabled = true;
	voiceRecordBtn.innerHTML = `⏳ Think & discuss (${thinkingSeconds}s)`;

	const playerRole = playerData ? (playerData.roleIndex === 0 ? "Player 1" : "Player 2") : "Player";
	console.log(`🤔 ${playerRole}: Starting 10-second thinking timer...`);

	// Start countdown
	thinkingTimer = setInterval(() => {
		thinkingSeconds--;

		if (thinkingSeconds > 0) {
			// Update button
			voiceRecordBtn.innerHTML = `⏳ Think & discuss (${thinkingSeconds}s)`;
		} else {
			// Thinking time is over
			clearInterval(thinkingTimer);
			thinkingTimer = null;

			// Check if this is Player 2 and Player 1 hasn't answered yet
			if (playerData && playerData.roleIndex === 1) {
				const player1 = gameState.players.find((p) => p.roleIndex === 0);

				if (player1 && !player1.response) {
					// Player 1 hasn't answered yet - show waiting message
					console.log(`⏳ ${playerRole}: Waiting for Player 1 to finish...`);
					voiceRecordBtn.disabled = true;
					voiceRecordBtn.innerHTML = "⏳ Waiting for Player 1...";
					voiceRecordBtn.classList.remove("recording");
					return; // Don't start recording yet
				}
			}

			// Player 1 OR Player 2 (after Player 1 finished) - start recording
			voiceRecordBtn.innerHTML = "🎤 Recording...";
			voiceRecordBtn.classList.add("recording");

			console.log(`✅ ${playerRole}: Thinking time over! Auto-starting recording...`);

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
}
