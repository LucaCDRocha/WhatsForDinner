# Multi-Microphone Setup Guide

## Hardware Setup: Focusrite Scarlett 4i4

Connect 4 microphones to your Focusrite Scarlett 4i4:
- **Mic 1** → Input 1 (assigned to Player 1)
- **Mic 2** → Input 2 (assigned to Player 2)
- **Mic 3** → Input 3 (assigned to Player 3)
- **Mic 4** → Input 4 (assigned to Player 4)

## Windows Configuration

### Step 1: Set Audio Interface to 4 Channels

1. Right-click the **Speaker icon** in the taskbar
2. Select **Sound Settings**
3. Under **Input**, select your **Focusrite Scarlett 4i4**
4. Click **Device properties**
5. Under **Advanced**, ensure:
   - **Default Format** is set to **4 channel, 48000 Hz** (or higher)
   - **Exclusive Mode** options are enabled if needed
6. Click **Apply**

### Step 2: Check Focusrite Control Software

1. Open **Focusrite Control** (if installed)
2. Verify all 4 inputs are enabled
3. Check gain levels for each microphone
4. Ensure **Direct Monitor** is OFF (you want audio to go to the computer, not just headphones)

### Step 3: Browser Permissions

1. Open **Chrome** or **Edge** (required for Web Speech API)
2. Navigate to the game: `http://localhost:3000/player.html`
3. When prompted, **Allow microphone access**
4. Make sure the browser is using the **Focusrite Scarlett 4i4** as input device

## Game Setup

### Testing Microphones

1. Open the game on **4 browser windows** (one per player)
2. Each player clicks **"🔧 Test 4 Mics"**
3. Speak into each microphone one at a time
4. Verify the correct meter shows activity:
   - Talk into Mic 1 → Meter 1 should show green bars
   - Talk into Mic 2 → Meter 2 should show green bars
   - etc.

### Assigning Microphones

1. Each player is automatically assigned based on join order:
   - **Player 1** = Mic 1 (Channel 0)
   - **Player 2** = Mic 2 (Channel 1)
   - **Player 3** = Mic 3 (Channel 2)
   - **Player 4** = Mic 4 (Channel 3)
2. Click **"✓ Assign Mic"** to confirm assignment
3. The display should show: **"Mic X (Channel Y)"** in green

### Playing the Game

1. After all players are assigned, click **"I'm Ready!"**
2. When your turn comes, click **"🎤 Record"**
3. Speak into your assigned microphone
4. Your answer will auto-submit when you stop speaking

## Troubleshooting

### Problem: Browser only sees 2 channels (stereo)

**Solution:**
- Windows is probably collapsing the audio to stereo
- Check Windows Sound Settings and set to 4 channels
- Restart the browser after changing settings

### Problem: All mics trigger Mic 1 meter

**Solution:**
- Focusrite is in mono-mix mode
- Open Focusrite Control and ensure inputs are NOT mixed
- Check that "Link" buttons are NOT enabled between inputs

### Problem: No audio detected

**Solution:**
- Check microphone gain levels on the Focusrite
- Verify phantom power (+48V) is enabled if using condenser mics
- Test mics in another application (Audacity, etc.) to verify hardware works
- Check Windows Sound Settings → Input → Test your microphone

### Problem: Web Speech API doesn't use correct mic

**Note:** The Web Speech API doesn't support selecting specific input channels directly. The multi-channel setup:
- ✅ **Shows which mic is active** (visual feedback)
- ✅ **Verifies correct player is speaking**
- ⚠️ **May capture from all channels** (browser limitation)

For true channel separation in speech recognition, you would need:
- Server-side audio processing
- Web Audio API recording → send to speech-to-text API
- This is a more advanced implementation

### Problem: Speech recognition not working

**Solution:**
- Use **Chrome** or **Edge** (required for Web Speech API)
- Firefox and Safari have limited speech recognition support
- Ensure internet connection (Web Speech API uses Google's servers)

## Advanced: ASIO Routing

If Windows continues to collapse channels to stereo, you can use ASIO routing:

1. Install **VoiceMeeter** or **VB-Audio Virtual Cable**
2. Route Focusrite ASIO outputs to separate virtual devices
3. Set browser to use each virtual device per window
4. This is complex but gives true channel separation

## Quick Check Command

Open browser console and run:
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const track = stream.getAudioTracks()[0];
    console.log(track.getSettings());
  });
```

Look for: `channelCount: 4`

If you see `channelCount: 1` or `channelCount: 2`, the browser is not seeing 4 channels.

## Summary

✅ **What Works:**
- Visual feedback showing which of 4 mics is active
- Player assignment to specific channels
- Volume meters for each microphone
- Verification that correct player is speaking

⚠️ **Browser Limitations:**
- Web Speech API uses default audio route
- May not isolate channels perfectly
- Best for physical separation (each player at their own station)

🎯 **Recommended Setup:**
- **4 separate computers/tablets** (1 per player) - BEST
- **4 browser windows** with physical mic positioning
- Players positioned so their assigned mic picks up only their voice
