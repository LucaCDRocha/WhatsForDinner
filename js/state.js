// Game state variables

let ws = null;
let playerId = null;
let playerData = null;
let gameState = null;
let isControlPanel = false; // First player can control game start/analyze
let countdownTimer = null;
let countdownSeconds = 0;

// Question timer variables
let thinkingTimer = null;
let thinkingSeconds = 0;
let currentQuestionId = null; // Track when question changes
