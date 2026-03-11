const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

// Check if fetch is available (Node 18+)
if (typeof fetch === "undefined") {
	console.error("❌ ERROR: fetch is not available!");
	console.error("Please upgrade to Node.js 18 or later, or install node-fetch");
	process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Store connected clients
const players = new Map();
let gameState = {
	status: "waiting", // waiting, ready, playing, ended
	players: [],
	scenario: "",
	generalContext: "",
	question: "",
	tension: 50,
	round: 0,
	responses: [],
};

const ROLES = [
	{ name: "Player 1", color: "#FF6B6B" },
	{ name: "Player 2", color: "#4ECDC4" },
	{ name: "Player 3", color: "#45B7D1" },
	{ name: "Player 4", color: "#FFA07A" },
];

// WebSocket connection handler
wss.on("connection", (ws) => {
	const playerId = Math.random().toString(36).substring(7);
	console.log(`🔌 New player connected: ${playerId}`);

	ws.on("message", (message) => {
		try {
			const data = JSON.parse(message);
			console.log(`📨 Message from ${playerId}:`, data);

			switch (data.type) {
				case "join":
					handlePlayerJoin(ws, playerId, data);
					break;

				case "ready":
					handlePlayerReady(playerId, data.ready);
					break;

				case "answer":
					handlePlayerAnswer(playerId, data.answer);
					break;

				case "request_state":
					ws.send(JSON.stringify({ type: "state_update", state: gameState }));
					break;
			}
		} catch (error) {
			console.error("Error handling message:", error);
		}
	});

	ws.on("close", () => {
		console.log(`🔌 Player disconnected: ${playerId}`);
		handlePlayerDisconnect(playerId);
	});
});

/**
 * Handle player joining
 */
function handlePlayerJoin(ws, playerId, data) {
	// Find available role
	const assignedRoles = gameState.players.map((p) => p.roleIndex);
	let roleIndex = -1;

	for (let i = 0; i < ROLES.length; i++) {
		if (!assignedRoles.includes(i)) {
			roleIndex = i;
			break;
		}
	}

	if (roleIndex === -1) {
		ws.send(JSON.stringify({ type: "error", message: "Game is full (4 players max)" }));
		ws.close();
		return;
	}

	const player = {
		id: playerId,
		roleIndex: roleIndex,
		role: ROLES[roleIndex].name,
		color: ROLES[roleIndex].color,
		ready: false,
		response: "",
	};

	players.set(playerId, { ws, player });
	gameState.players.push(player);

	// Send player their info
	ws.send(
		JSON.stringify({
			type: "joined",
			player: player,
		}),
	);

	// Broadcast updated state to all players
	broadcastState();

	console.log(`✅ Player ${playerId} joined as ${player.role}`);
}

/**
 * Handle player ready
 */
function handlePlayerReady(playerId, readyState) {
	const playerData = players.get(playerId);
	if (!playerData) return;

	// Set the ready state (can be true or false for toggle)
	playerData.player.ready = readyState !== undefined ? readyState : true;

	// Update in gameState as well
	const player = gameState.players.find((p) => p.id === playerId);
	if (player) {
		player.ready = playerData.player.ready;
	}

	console.log(
		`${playerData.player.ready ? "✓" : "✗"} Player ${playerId} is ${playerData.player.ready ? "ready" : "not ready"}`,
	);

	// Check if 2-4 players are ready
	const readyCount = gameState.players.filter((p) => p.ready).length;

	if (readyCount >= 2 && readyCount <= 4 && gameState.status === "waiting") {
		gameState.status = "ready";
		console.log(`🎮 ${readyCount} players ready! Game can start.`);
	} else if (readyCount < 2 && gameState.status === "ready") {
		gameState.status = "waiting";
		console.log(`⏸️ Only ${readyCount} player(s) ready. Waiting for more...`);
	}

	broadcastState();
}

/**
 * Handle player answer
 */
function handlePlayerAnswer(playerId, answer) {
	const player = gameState.players.find((p) => p.id === playerId);
	if (!player) return;

	player.response = answer;
	gameState.responses.push({
		playerId: playerId,
		role: player.role,
		answer: answer,
		round: gameState.round,
	});

	console.log(`💬 ${player.role}: ${answer}`);

	broadcastState();

	// Check if all players have responded
	const allResponded = gameState.players.every((p) => p.response && p.response.trim() !== "");

	if (allResponded && gameState.status === "playing") {
		console.log("✅ All players have responded! Auto-analyzing...");
		// Automatically trigger analysis after a short delay (1 second)
		setTimeout(() => {
			autoAnalyzeResponses();
		}, 1000);
	}
}

/**
 * Automatically analyze responses when all players have answered
 */
async function autoAnalyzeResponses() {
	if (gameState.status !== "playing") {
		console.log("⚠️ Skipping auto-analysis - game status is not 'playing'");
		return;
	}

	try {
		console.log("\n" + "=".repeat(60));
		console.log("🤖 STARTING AUTOMATIC ANALYSIS");
		console.log("=".repeat(60));

		// Build the prompt for harmony analysis
		const responses = gameState.players.map((p) => `${p.assignedRole || p.role}: "${p.response}"`).join("\n");

		console.log("\n📝 Responses to analyze:");
		console.log(responses);
		console.log("");

		const systemPrompt = {
			role: "system",
			content: `You are analyzing family coordination in a stressful situation. Each family member has an assigned role and age (shown in parentheses, e.g., "Mom (42)" or "Teenager (15)"). Check if responses show good teamwork (which reduces tension) or conflict/confusion (which increases tension). Pay attention to how family members interact based on their roles and ages (e.g., Mom coordinating with Dad, teenagers helping appropriately for their age, younger children being supervised, etc.). Consider age-appropriate responses and capabilities.

You'll see the current question being asked and the family's responses. If there is conversation history from previous rounds, use it to understand the context and how the family has been coordinating.

After analyzing harmony, generate the NEXT challenge or question they need to address (under 10 words) that:
- Flows naturally from what just happened
- Matches the tension level after your action
- If tension will be low (0-30): simple follow-up tasks
- If tension will be moderate (30-60): complications or related decisions
- If tension will be high (60-90): urgent complications or conflicts to resolve

Respond with ONLY this format:
Harmony: [YES/NO]
Score: [0-100] (100 = perfect teamwork, 0 = total conflict)
Reason: [One short sentence why]
Action: [INFLATE/DEFLATE] by [0-30]
NEXT_QUESTION: [Your next question here]

DEFLATE when: Family shows clear coordination, agreement on roles, good communication, mutual support, age-appropriate tasks.
INFLATE when: Responses show conflict, confusion, everyone doing the same thing, no clear plan, blame, age-inappropriate expectations.

Be strict - only say YES if responses show clear coordination and agreement on who does what.`,
		};

		const userPrompt = {
			role: "user",
			content: `Scenario: ${gameState.scenario}\n\nQuestion: ${gameState.question}\n\nCurrent Tension: ${gameState.tension}\n\nResponses:\n${responses}`,
		};

		console.log("📡 Calling LM Studio API at http://localhost:1234...");

		// Call LM Studio API
		const lmResponse = await fetch("http://localhost:1234/v1/chat/completions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "local-model",
				messages: [systemPrompt, userPrompt],
				temperature: 0.7,
				max_tokens: 300,
			}),
		});

		console.log(`✅ LM Studio responded with status: ${lmResponse.status}`);

		if (!lmResponse.ok) {
			throw new Error(`LM Studio API responded with status ${lmResponse.status}`);
		}

		const data = await lmResponse.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error("Invalid response format from LM Studio API");
		}

		const aiResponse = data.choices[0].message.content.trim();

		console.log("\n=== AI ANALYSIS RESPONSE ===");
		console.log(aiResponse);
		console.log("=========================\n");

		// Parse analysis
		const harmonyMatch = aiResponse.match(/Harmony:\s*(YES|NO)/i);
		const scoreMatch = aiResponse.match(/Score:\s*(\d+)/i);
		const reasonMatch = aiResponse.match(/Reason:\s*(.+?)(?=Action:|$)/is);
		const actionMatch = aiResponse.match(/Action:\s*(INFLATE|DEFLATE)\s*by\s*(\d+)/i);
		const nextQuestionMatch = aiResponse.match(/NEXT_QUESTION:\s*(.+?)$/is);

		if (actionMatch) {
			const action = actionMatch[1].toUpperCase();
			const amount = parseInt(actionMatch[2]);
			const reason = reasonMatch ? reasonMatch[1].trim() : "Analysis completed";
			const nextQuestion = nextQuestionMatch ? nextQuestionMatch[1].trim() : "";

			// Calculate new tension
			let newTension = gameState.tension;
			if (action === "INFLATE") {
				newTension = Math.min(100, gameState.tension + amount);
			} else if (action === "DEFLATE") {
				newTension = Math.max(0, gameState.tension - amount);
			}

			gameState.tension = newTension;

			console.log(
				`📊 Analysis: ${action} by ${amount} | Tension: ${gameState.tension} → ${newTension} | Reason: ${reason}`,
			);

			// Check win/lose conditions
			if (newTension <= 0) {
				gameState.status = "won";
				console.log("🎉 GAME WON!");
			} else if (newTension >= 100) {
				gameState.status = "lost";
				console.log("💔 GAME LOST!");
			} else if (nextQuestion && nextQuestion.toUpperCase() !== "NONE") {
				gameState.question = cleanMarkdown(nextQuestion);
				gameState.round++;
				console.log(`➡️ Next question (Round ${gameState.round}): ${gameState.question}`);
				// Clear responses for next round
				gameState.players.forEach((p) => (p.response = ""));
			}

			broadcastState();
		} else {
			console.error("❌ Failed to parse analysis response - no action match found");
			throw new Error("Failed to parse AI analysis response");
		}
	} catch (error) {
		console.error("\n" + "=".repeat(60));
		console.error("❌ ERROR IN AUTO-ANALYSIS");
		console.error("=".repeat(60));
		console.error("Error details:", error.message);
		console.error("Stack trace:", error.stack);

		// Notify all clients about the error
		const errorMessage = JSON.stringify({
			type: "error",
			message: `Analysis failed: ${error.message}\n\nPlease check that LM Studio is running with a model loaded.`,
		});

		players.forEach((playerData) => {
			if (playerData.ws.readyState === 1) {
				// WebSocket.OPEN
				playerData.ws.send(errorMessage);
			}
		});

		console.error("=".repeat(60) + "\n");
	}
}

/**
 * Handle player disconnect
 */
function handlePlayerDisconnect(playerId) {
	const playerData = players.get(playerId);
	if (!playerData) return;

	// Remove from players map
	players.delete(playerId);

	// Remove from game state
	gameState.players = gameState.players.filter((p) => p.id !== playerId);

	// If game was in progress, reset
	if (gameState.status !== "waiting") {
		resetGame();
	}

	broadcastState();
}

/**
 * Reset game state
 */
function resetGame() {
	gameState.status = "waiting";
	gameState.scenario = "";
	gameState.generalContext = "";
	gameState.question = "";
	gameState.tension = 50;
	gameState.round = 0;
	gameState.responses = [];

	// Reset player ready states
	gameState.players.forEach((p) => {
		p.ready = false;
		p.response = "";
	});
}

/**
 * Clean markdown formatting from AI responses
 * Removes asterisks, underscores, and other markdown symbols
 */
function cleanMarkdown(text) {
	if (!text) return text;

	return text
		.replace(/\*\*/g, "") // Remove bold (**text**)
		.replace(/\*/g, "") // Remove any remaining asterisks
		.replace(/__/g, "") // Remove underscores (for bold)
		.replace(/_/g, "") // Remove remaining underscores (for italic)
		.replace(/~~(.+?)~~/g, "$1") // Remove strikethrough
		.replace(/`/g, "") // Remove backticks
		.trim();
}

/**
 * Broadcast state to all connected players
 */
function broadcastState() {
	const message = JSON.stringify({
		type: "state_update",
		state: gameState,
	});

	players.forEach(({ ws }) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(message);
		}
	});
}

// API Endpoints

/**
 * Start game (generate scenario)
 */
app.post("/api/start", express.json(), async (req, res) => {
	// Check if 2-4 players are ready
	const readyCount = gameState.players.filter((p) => p.ready).length;
	if (readyCount < 2 || readyCount > 4) {
		return res.status(400).json({ error: `Not enough players ready (${readyCount}/2-4)` });
	}

	try {
		// Forward to LM Studio API
		const lmResponse = await fetch("http://localhost:1234/v1/chat/completions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(req.body),
		});

		const data = await lmResponse.json();
		const aiResponse = data.choices[0].message.content.trim();

		console.log("\n=== AI SCENARIO RESPONSE ===");
		console.log(aiResponse);
		console.log("=== END AI RESPONSE ===\n");

		// Parse AI response - VERY flexible patterns to handle various formats
		// Try multiple pattern variations for robustness
		let generalContextMatch = aiResponse.match(/GENERAL[_\s-]*CONTEXT:\s*(.+?)(?=SITUATION:|QUESTION:|$)/is);
		let situationMatch = aiResponse.match(/SITUATION:\s*(.+?)(?=QUESTION:|INFLATION:|ROLES:|$)/is);
		let questionMatch = aiResponse.match(/QUESTION:\s*(.+?)(?=INFLATION:|ROLES:|$)/is);
		let inflationMatch = aiResponse.match(/INFLATION:\s*(\d+)/i);
		let rolesMatch = aiResponse.match(/ROLES:\s*(.+?)$/is);

		// If standard parsing fails, try to extract from any key-value format
		if (!situationMatch) {
			// Try variations: "Situation:", "The situation:", etc.
			situationMatch = aiResponse.match(
				/(?:The\s+)?Situation:\s*(.+?)(?=Question:|QUESTION:|Inflation:|INFLATION:|Roles:|ROLES:|$)/is,
			);
		}
		if (!questionMatch) {
			// Try variations: "Question:", "The question:", etc.
			questionMatch = aiResponse.match(/(?:The\s+)?Question:\s*(.+?)(?=Inflation:|INFLATION:|Roles:|ROLES:|$)/is);
		}

		console.log("📋 Parse results:", {
			hasGeneralContext: !!generalContextMatch,
			hasSituation: !!situationMatch,
			hasQuestion: !!questionMatch,
			hasInflation: !!inflationMatch,
			hasRoles: !!rolesMatch,
		});

		// If still missing critical fields, show detailed error with actual content
		if (!situationMatch || !questionMatch) {
			console.error("❌ PARSING FAILED!");
			console.error("Missing required fields:");
			if (!situationMatch) console.error("  - SITUATION not found");
			if (!questionMatch) console.error("  - QUESTION not found");
			console.error("\n🔍 AI Response Preview:");
			console.error(aiResponse.substring(0, 500) + (aiResponse.length > 500 ? "..." : ""));
			console.error("\n💡 Suggestions:");
			console.error("  1. Check if LM Studio model is loaded and responding");
			console.error("  2. Try a more capable model (e.g., Llama 3, Mistral, Qwen)");
			console.error("  3. Ensure model context size is at least 4096 tokens");
			console.error("  4. Check that the system prompt is being sent correctly");
			throw new Error(
				`Failed to parse AI response. Missing: ${!situationMatch ? "SITUATION " : ""}${!questionMatch ? "QUESTION" : ""}. Check console for details.`,
			);
		}

		if (situationMatch && questionMatch) {
			gameState.generalContext = generalContextMatch ? cleanMarkdown(generalContextMatch[1]) : "";
			gameState.scenario = cleanMarkdown(situationMatch[1]);
			gameState.question = cleanMarkdown(questionMatch[1]);
			gameState.tension = inflationMatch ? parseInt(inflationMatch[1]) : 50;
			gameState.status = "playing";
			gameState.round = 1;

			// Parse and assign role-specific situations (using WhatsForDinnerSimple approach)
			if (rolesMatch) {
				const rolesText = rolesMatch[1];
				const roleLines = rolesText.split("\n").filter((line) => line.trim());

				console.log("=== PARSING ROLES ===");
				console.log("Total role lines:", roleLines.length);
				console.log("Total players:", gameState.players.length);

				// Collect all valid role assignments
				const assignments = [];
				roleLines.forEach((line, lineIndex) => {
					// Try with age format first: "Name: Role (age) - Situation"
					let match = line.match(/(.+?):\s*(.+?)\s*\((\d+)\)\s*-\s*(.+)/);
					if (match) {
						const [, roleName, roleType, age, situation] = match;
						assignments.push({
							name: cleanMarkdown(roleName.trim()),
							role: `${cleanMarkdown(roleType.trim())} (${age})`,
							age: age,
							situation: cleanMarkdown(situation.trim()),
						});
						console.log(`Line ${lineIndex} parsed (with age):`, assignments[assignments.length - 1]);
					} else {
						// Fallback: try without age: "Name: Role - Situation"
						match = line.match(/(.+?):\s*(.+?)\s*-\s*(.+)/);
						if (match) {
							const [, roleName, role, situation] = match;
							assignments.push({
								name: cleanMarkdown(roleName.trim()),
								role: cleanMarkdown(role.trim()),
								age: null,
								situation: cleanMarkdown(situation.trim()),
							});
							console.log(`Line ${lineIndex} parsed (no age):`, assignments[assignments.length - 1]);
						} else {
							console.log(`Line ${lineIndex} FAILED to parse: "${line}"`);
						}
					}
				});

				// Assign to players in order
				assignments.forEach((assignment, index) => {
					if (index < gameState.players.length) {
						gameState.players[index].assignedRole = `${assignment.name}: ${assignment.role}`;
						gameState.players[index].age = assignment.age;
						gameState.players[index].situation = assignment.situation;
						console.log(`✓ Assigned to Player ${index + 1} (ID: ${gameState.players[index].id}):`, {
							assignedRole: gameState.players[index].assignedRole,
							age: gameState.players[index].age,
							situation: gameState.players[index].situation.substring(0, 50) + "...",
						});
					} else {
						console.log(`⚠ Assignment ${index} skipped - only ${gameState.players.length} players connected`);
					}
				});
			}

			broadcastState();

			res.json({
				success: true,
				scenario: gameState.scenario,
				question: gameState.question,
				tension: gameState.tension,
			});
		} else {
			throw new Error("Failed to parse AI response");
		}
	} catch (error) {
		console.error("Error starting game:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Analyze responses
 */
app.post("/api/analyze", express.json(), async (req, res) => {
	try {
		// Forward to LM Studio API
		const lmResponse = await fetch("http://localhost:1234/v1/chat/completions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(req.body),
		});

		const data = await lmResponse.json();
		const aiResponse = data.choices[0].message.content.trim();

		console.log("AI Analysis Response:", aiResponse);

		// Parse analysis (new format from WhatsForDinnerSimple)
		const harmonyMatch = aiResponse.match(/Harmony:\s*(YES|NO)/i);
		const scoreMatch = aiResponse.match(/Score:\s*(\d+)/i);
		const reasonMatch = aiResponse.match(/Reason:\s*(.+?)(?=Action:|$)/is);
		const actionMatch = aiResponse.match(/Action:\s*(INFLATE|DEFLATE)\s*by\s*(\d+)/i);
		const nextQuestionMatch = aiResponse.match(/NEXT_QUESTION:\s*(.+?)$/is);

		if (actionMatch) {
			const action = actionMatch[1].toUpperCase();
			const amount = parseInt(actionMatch[2]);
			const reason = reasonMatch ? reasonMatch[1].trim() : "Analysis completed";
			const nextQuestion = nextQuestionMatch ? nextQuestionMatch[1].trim() : "";

			// Calculate new tension
			let newTension = gameState.tension;
			if (action === "INFLATE") {
				newTension = Math.min(100, gameState.tension + amount);
			} else if (action === "DEFLATE") {
				newTension = Math.max(0, gameState.tension - amount);
			}

			gameState.tension = newTension;

			// Check win/lose conditions
			if (newTension <= 0) {
				gameState.status = "won";
			} else if (newTension >= 100) {
				gameState.status = "lost";
			} else if (nextQuestion && nextQuestion.toUpperCase() !== "NONE") {
				gameState.question = cleanMarkdown(nextQuestion);
				gameState.round++;
				// Clear responses for next round
				gameState.players.forEach((p) => (p.response = ""));
			}

			broadcastState();

			res.json({
				success: true,
				tension: newTension,
				feedback: reason,
				nextQuestion: nextQuestion,
				status: gameState.status,
				action: `${action} by ${amount}`,
			});
		} else {
			throw new Error("Failed to parse analysis");
		}
	} catch (error) {
		console.error("Error analyzing:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Reset game
 */
app.post("/api/reset", (req, res) => {
	resetGame();
	broadcastState();
	res.json({ success: true });
});

/**
 * Get game state
 */
app.get("/api/state", (req, res) => {
	res.json(gameState);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
	console.log("=".repeat(60));
	console.log(`🎮 What's For Dinner - Game Server`);
	console.log(`🌐 Server running on http://localhost:${PORT}`);
	console.log(`📱 Open 4 browser windows to: http://localhost:${PORT}/player.html`);
	console.log("=".repeat(60));

	// Test LM Studio connection
	console.log("\n🔍 Testing LM Studio connection...");
	try {
		const testResponse = await fetch("http://localhost:1234/v1/models", {
			method: "GET",
		});

		if (testResponse.ok) {
			const data = await testResponse.json();
			const modelCount = data.data ? data.data.length : 0;
			console.log(`✅ LM Studio is running with ${modelCount} model(s) loaded`);
		} else {
			console.warn(`⚠️ LM Studio responded with status ${testResponse.status}`);
		}
	} catch (error) {
		console.error("❌ Cannot connect to LM Studio!");
		console.error("   Please make sure:");
		console.error("   1. LM Studio is running");
		console.error("   2. A model is loaded");
		console.error("   3. Local Server is started (port 1234)");
		console.error(`   Error: ${error.message}`);
	}
	console.log("=".repeat(60) + "\n");
});
