# Quick Start: Arduino Balloon Controller

## 🚀 Quick Setup (5 minutes)

### 1. Upload Arduino Code
1. Open Arduino IDE
2. Open: `arduino/balloon_controller.ino`
3. Select your board and port
4. Click Upload ⬆️

### 2. Find Your COM Port
**Windows**: 
- Device Manager → Ports (COM & LPT)
- Look for "Arduino" or "USB Serial Port"
- Note the COM number (e.g., **COM3**)

**Mac/Linux**:
```bash
ls /dev/tty.*        # Mac
ls /dev/ttyUSB*      # Linux
```

### 3. Configure Server
Edit `server.js` **line 18**:
```javascript
const ARDUINO_PORT = "COM3";  // Change to YOUR port!
```

### 4. Run
```bash
npm start
```

Look for: `🤖 Arduino connected on COM3`

## 🔌 Wiring Quick Reference

```
Arduino Pin 8, 10, 9, 11  → Stepper Motor (via ULN2003)
Arduino Pin 3             → Relay → Air Pump
Common Ground!            → All components
```

## 🎈 How It Works

- **Tension ↑** = Pump ON → Balloon inflates
- **Tension ↓** = Stepper rotates → Valve opens → Air escapes

Full details: See [ARDUINO_SETUP.md](ARDUINO_SETUP.md)
