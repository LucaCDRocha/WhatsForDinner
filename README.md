# What's For Dinner? - Original Game

A multiplayer collaborative game where 4 players work together as a family to reduce tension through communication and cooperation.

## Features

- **4-Player Multiplayer**: All players on one PC using different browser windows
- **WebSocket Real-time Communication**: Synchronized game state across all players
- **AI-Powered Scenarios**: Uses LM Studio to generate unique family scenarios
- **Role-Based Gameplay**: Each player gets a unique family role and perspective
- **Tension System**: Collaborate to reduce family tension from starting value to 0
- **Win/Lose Conditions**: 
  - Win: Reduce tension to 0
  - Lose: Tension reaches 100

## Setup

### 1. Install LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model (recommended: Llama 3, Mistral, or similar)
3. Go to "Local Server" tab
4. Click "Start Server" (default port: 1234)

### 2. Install Dependencies

```bash
cd WhatsForDinnerOG
npm install
```

### 3. Start the Game Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## How to Play

### Starting the Game

1. Open **4 different browser windows** (or tabs)
2. Navigate to `http://localhost:3000/player.html` in each window
3. Each window will automatically be assigned a family role:
   - Player 1: Parent 1 (Red)
   - Player 2: Parent 2 (Teal)
   - Player 3: Teenager (Blue)
   - Player 4: Youngest child (Orange)

### Game Flow

1. **Waiting Lobby**: All players see the welcome screen showing who has joined
2. **Ready Up**: Each player clicks "I'm Ready!" button
3. **Game Start**: Once all 4 players are ready, Player 1 can click "Start Game"
   - AI generates a unique family scenario
   - Each player receives their role and situation
4. **Answer Questions**: Players type their responses to the scenario question
5. **Analysis**: Once all players answer, Player 1 clicks "Analyze Responses"
   - AI analyzes the harmony and cooperation
   - Tension increases or decreases based on responses
6. **Continue or End**:
   - If tension reaches 0: **You Win!** 🎉
   - If tension reaches 100: **Game Over** 😢
   - Otherwise: New question appears, repeat from step 4

### Tips for Success

- **Communicate**: Try to understand other family members' perspectives
- **Compromise**: Find middle ground between different needs
- **Be Empathetic**: Consider age, responsibilities, and constraints of each role
- **Work Together**: The goal is to reduce tension, not win individually

## Game Screens

### 1. Welcome Screen
- Blue/purple gradient background
- Shows "What's for dinner?" title
- Lists all connected players
- Ready button for each player

### 2. Playing Screen
- Light blue background
- Shows:
  - Your role (with age)
  - General family situation
  - Your specific perspective
  - Current question
  - Tension meter (0-100%)
  - Answer input field

### 3. Win Screen
- Green background
- "You win!" message
- Shows final tension: 0%

### 4. Lose Screen
- Red/orange background
- "Game over" message
- Explains tension was too high

## Architecture

### Server (`server.js`)
- Express.js web server
- WebSocket server for real-time communication
- Manages game state
- Proxies API calls to LM Studio

### Client (`player.html` + `js/player.js`)
- Responsive web interface
- WebSocket client
- Visual feedback and animations
- Handles user input and game flow

### API Integration
- Uses LM Studio local API
- Generates scenarios with role-specific situations
- Analyzes player responses for harmony
- Provides feedback and tension adjustments

## Troubleshooting

### "Not connected to server"
- Make sure the server is running (`npm start`)
- Check that you're accessing `http://localhost:3000`

### "Error starting game" / "Error analyzing responses"
- Ensure LM Studio is running
- Check that a model is loaded in LM Studio
- Verify the Local Server is started on port 1234
- Look for errors in the server console

### Players not syncing
- Refresh all browser windows
- Check the server console for WebSocket errors
- Make sure all players are connected before starting

### Game stuck
- Refresh all browser windows to reset
- Or use the "Try Again" / "Play Again" buttons

## Development

### Run with auto-restart
```bash
npm run dev
```

### Project Structure
```
WhatsForDinnerOG/
├── server.js           # WebSocket & API server
├── package.json        # Dependencies
├── player.html         # Main game interface
├── js/
│   └── player.js       # Client-side game logic
└── README.md           # This file
```

## Technologies

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: LM Studio (local) via OpenAI-compatible API

## Credits

Based on the "What's For Dinner?" family activity concept. Combines:
- API structure from WhatsForDinnerSimple
- Multiplayer architecture from WhatsForDinnerMultiti
- Custom visual design inspired by the show's aesthetic

---

**Enjoy the game and remember: Family harmony is about working together!** 👨‍👩‍👧‍👦
