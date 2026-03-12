# 🎈 Arduino Balloon Controller Setup

This guide explains how to set up the physical balloon controller to display game tension levels in real-time.

## Hardware Requirements

### Components
- **Arduino Board** (Uno, Nano, or compatible)
- **Stepper Motor** (28BYJ-48 or equivalent)
  - Steps per revolution: 512
- **ULN2003 Driver Board** (for stepper motor)
- **5V Relay Module** 
- **Air Pump** (5V or 12V depending on your relay)
- **Balloon**
- **Air valve/tube system**
- **USB Cable** (for Arduino-Computer connection)
- **Power Supply** (for motor and pump)

### Wiring Diagram

#### Stepper Motor (via ULN2003 Driver)
```
Arduino Pin 8  → ULN2003 IN1
Arduino Pin 10 → ULN2003 IN2
Arduino Pin 9  → ULN2003 IN3
Arduino Pin 11 → ULN2003 IN4
```

#### Relay Module
```
Arduino Pin 3  → Relay IN
Relay COM      → Air Pump (+)
Relay NO       → Power Supply (+)
Air Pump (-)   → Power Supply (-)
```

#### Power
```
Arduino 5V     → ULN2003 VCC
Arduino GND    → ULN2003 GND
                → Relay GND
                → Power Supply GND (common ground!)
```

## Software Setup

### 1. Upload Arduino Sketch

1. Open Arduino IDE
2. Open the sketch file: `arduino/balloon_controller.ino`
3. Select your Arduino board: **Tools → Board**
4. Select the correct port: **Tools → Port** (e.g., COM3, /dev/ttyUSB0)
5. Click **Upload** ⬆️
6. Open **Serial Monitor** (Ctrl+Shift+M) to verify it's working
   - You should see: "Balloon Controller Ready!"

### 2. Configure Server.js

1. Find your Arduino port:
   - **Windows**: Device Manager → Ports → Check COM number (e.g., COM3)
   - **Mac**: Terminal → `ls /dev/tty.*` (e.g., /dev/tty.usbserial)
   - **Linux**: Terminal → `ls /dev/ttyUSB*` (e.g., /dev/ttyUSB0)

2. Edit `server.js` line 18:
   ```javascript
   const ARDUINO_PORT = "COM3"; // ← Change this to your port!
   ```

3. Save the file

### 3. Install Node Dependencies

```bash
cd WhatsForDinnerOG
npm install
```

This will install the `serialport` package for Arduino communication.

### 4. Start the Server

```bash
npm start
```

You should see:
```
🤖 Arduino connected on COM3
🎈 Sent to Arduino: TENSION:50
```

## How It Works

### Game → Arduino Communication

1. **Node.js Server** tracks game tension (0-100)
2. When tension changes, server sends: `TENSION:<value>`
3. **Arduino** receives command and updates balloon

### Balloon Control Logic

#### Inflate (Increase Tension)
- **Relay ON** → Air pump inflates balloon
- **Stepper** → Valve stays closed
- Continues until target tension reached

#### Deflate (Decrease Tension)
- **Relay OFF** → Air pump stops
- **Stepper** → Opens valve incrementally to release air
- Continues until target tension reached

### Example Sequence

```
Game starts → TENSION:50 → Balloon at 50% inflation
Bad response → TENSION:75 → Balloon inflates to 75%
Good response → TENSION:45 → Balloon deflates to 45%
Win game → TENSION:0 → Balloon fully deflated
Lose game → TENSION:100 → Balloon fully inflated
```

## Testing

### Test Arduino Alone

1. Upload the sketch
2. Open Serial Monitor (9600 baud)
3. Send test commands:
   ```
   TENSION:0
   TENSION:50
   TENSION:100
   ```
4. Observe motor and pump responding

### Test with Game

1. Start server with Arduino connected
2. Play a round
3. Watch balloon inflate/deflate with tension changes
4. Check console for Arduino messages:
   ```
   🎈 Sent to Arduino: TENSION:65
   🤖 Arduino: INFLATING -> Tension: 62
   🤖 Arduino: INFLATING -> Tension: 63
   ```

## Troubleshooting

### Arduino Not Connecting

**Error**: `⚠️ Arduino connection error: Error: No such file or directory`

**Solutions**:
1. Check COM port in server.js matches actual port
2. Close Arduino IDE Serial Monitor (conflicts with server)
3. Try unplugging/replugging Arduino USB cable
4. Check Arduino drivers are installed

### Game Works But No Arduino

**Message**: `⚠️ Game will continue without physical balloon display`

- This is normal! Game works without Arduino
- Arduino is optional enhancement
- Fix Arduino connection and restart server

### Pump Not Running

1. Check relay wiring
2. Verify pump power supply voltage
3. Test relay with LED to confirm it's switching
4. Check common ground connection

### Stepper Not Moving

1. Verify ULN2003 driver wiring
2. Check power supply to driver board
3. Test stepper manually with simple sketch
4. Ensure step sequence is correct (8, 10, 9, 11)

### Balloon Not Inflating/Deflating Properly

1. Check for air leaks in connections
2. Ensure valve mechanism works smoothly
3. Adjust stepper speed (rolePerMinute value)
4. Calibrate stepper steps for your valve

## Customization

### Adjust Inflation Speed

In `balloon_controller.ino`, change:
```cpp
const int rolePerMinute = 17;  // Increase for faster, decrease for slower
```

### Change Update Rate

```cpp
const int UPDATE_INTERVAL = 100;  // milliseconds between checks
```

### Adjust Step Resolution

```cpp
int steps = 10;  // Steps per deflation increment (smaller = slower)
```

## Safety Notes

⚠️ **IMPORTANT**:
- Don't over-inflate balloon - it can pop!
- Monitor first few runs to calibrate max inflation
- Use appropriately sized balloon for your pump
- Ensure good ventilation for pump
- Keep wires away from moving parts
- Use proper power supply ratings

## Physical Setup Tips

1. **Mount stepper** securely to prevent vibration
2. **Attach valve** to stepper shaft reliably
3. **Position balloon** where players can see it
4. **Test air flow** before connecting balloon
5. **Secure all wiring** to avoid disconnections during play

##  Architecture

```
┌─────────────────┐
│   Game Server   │
│   (Node.js)     │
│                 │
│ Tension: 0-100  │
└────────┬────────┘
         │ Serial (USB)
         │ "TENSION:75"
         │
┌────────▼────────┐
│    Arduino      │
│  ATmega328P     │
│                 │
│  Pin 3  → Relay │──→ [Air Pump] → (Inflate)
│  Pin 8-11 → ULN │──→ [Stepper] → (Valve)
└─────────────────┘
         │
         ▼
    [🎈 Balloon]
```

## Next Steps

- [ ] Upload Arduino sketch
- [ ] Configure server.js COM port
- [ ] Test hardware connections
- [ ] Run full game test
- [ ] Calibrate inflation levels
- [ ] Enjoy physical tension feedback!

Need help? Check the serial monitor for diagnostic messages.
