// Game logic functions (prompt functions are in api.js)

/**
 * Start the game (control panel only)
 */
async function startGame() {
	console.log("🎮 Starting game...");

	// Clear any running countdown
	if (countdownTimer) {
		clearInterval(countdownTimer);
		countdownTimer = null;
	}

	if (!isControlPanel) {
		console.log("Not control panel, skipping start");
		return;
	}

	try {
		const [systemPrompt, userPrompt] = getScenarioPrompts(gameState.players.length);

		const response = await fetch(`${API_BASE_URL}/api/start`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "local-model",
				messages: [systemPrompt, userPrompt],
				temperature: 0.8,
				max_tokens: 500,
			}),
		});

		const data = await response.json();

		if (data.success) {
			console.log("✅ Game started!", data);
		} else {
			throw new Error(data.error || "Failed to start game");
		}
	} catch (error) {
		console.error("Error starting game:", error);

		let errorMessage = "Error starting game: " + error.message;

		if (error.message.includes("Failed to parse")) {
			errorMessage += "\n\n💡 Tip: The AI model couldn't format the response correctly. Try:";
			errorMessage += "\n1. Check the server console for the actual AI response";
			errorMessage += "\n2. Try clicking 'I'm Ready!' again to regenerate";
			errorMessage += "\n3. Make sure you're using a capable model in LM Studio (not too small)";
		} else if (error.message.includes("fetch")) {
			errorMessage +=
				"\n\nMake sure LM Studio is running with a model loaded and the server is started on port 1234.";
		}

		alert(errorMessage);

		// Update countdown box to show error
		const countdownBox = document.getElementById("countdownBox");
		if (countdownBox) {
			countdownBox.textContent = "Error - Click 'I'm Ready!' to try again";
		}

		// Reset countdown if control panel
		if (isControlPanel && countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
	}
}

/**
 * Analyze responses (control panel only)
 */
async function analyzeResponses() {
	if (!isControlPanel) return;

	const analyzeBtn = document.getElementById("analyzeBtn");
	if (analyzeBtn) {
		analyzeBtn.disabled = true;
		analyzeBtn.innerHTML = '<span class="loading"></span> Analyzing...';
	}

	try {
		const responses = gameState.players.map((p) => `${p.assignedRole || p.role}: "${p.response}"`).join("\n");
		const [systemPrompt, userPrompt] = getHarmonyAnalysisPrompts(
			gameState.scenario,
			gameState.question,
			gameState.tension,
			responses,
		);

		const response = await fetch(`${API_BASE_URL}/api/analyze`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "local-model",
				messages: [systemPrompt, userPrompt],
				temperature: 0.7,
				max_tokens: 300,
			}),
		});

		const data = await response.json();

		if (data.success) {
			console.log("✅ Analysis complete!", data);

			// Show feedback (stays visible)
			const elphiMessage = document.getElementById("elphiMessage");
			const elphiText = elphiMessage.querySelector(".elphi-text");
			if (elphiText) {
				elphiText.textContent = data.feedback;
				elphiMessage.classList.remove("hidden");

				// Read Elphi subtitle with TTS only for Player 1 and only if it's new feedback
				if (
					typeof speak === "function" &&
					data.feedback !== lastSpokenFeedback &&
					playerData &&
					playerData.roleIndex === 0
				) {
					console.log("🔊 Player 1: Starting TTS narration (from analysis)...");

					// Update button to show narrating state
					const voiceRecordBtn = document.getElementById("voiceRecordBtn");
					if (voiceRecordBtn) {
						voiceRecordBtn.disabled = true;
						voiceRecordBtn.innerHTML = "🔊 Narrating...";
						voiceRecordBtn.classList.remove("recording");
					}

					speak(data.feedback, { interrupt: false })
						.then(() => {
							// TTS finished, signal server to start thinking timer for all players
							console.log("✅ Player 1 TTS complete (from analysis), signaling server");
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
					lastSpokenFeedback = data.feedback;
				} else if (data.feedback !== lastSpokenFeedback && playerData && playerData.roleIndex !== 0) {
					// For Player 2, update button to wait for Player 1's narration
					console.log("⏳ Player 2: Waiting for Player 1's narration (from analysis)...");
					const voiceRecordBtn = document.getElementById("voiceRecordBtn");
					if (voiceRecordBtn) {
						voiceRecordBtn.disabled = true;
						voiceRecordBtn.innerHTML = "🔊 Waiting for narrator...";
						voiceRecordBtn.classList.remove("recording");
					}
					lastSpokenFeedback = data.feedback;
				}
			}
		} else {
			throw new Error(data.error || "Failed to analyze responses");
		}
	} catch (error) {
		console.error("Error analyzing:", error);
		alert("Error analyzing responses: " + error.message);

		if (analyzeBtn) {
			analyzeBtn.disabled = false;
			analyzeBtn.textContent = "Analyze Responses";
		}
	}
}
