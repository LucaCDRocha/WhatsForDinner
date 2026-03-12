/*
 * Balloon Tension Controller
 * 
 * This Arduino sketch controls a balloon to visualize tension levels (0-100)
 * - Stepper motor controls a valve to release air
 * - Relay controls air pump to inflate balloon
 * 
 * Hardware:
 * - Stepper Motor connected to pins 8, 10, 9, 11
 * - Relay controlling air pump connected to pin 3
 * 
 * Serial Protocol:
 * Receives commands: TENSION:<0-100>
 * Example: "TENSION:75" sets tension to 75%
 */

#include <Stepper.h>

// Stepper configuration
const int stepsPerRevolution = 512;
const int rolePerMinute = 17;  // Increased speed for quicker response
Stepper myStepper(stepsPerRevolution, 8, 10, 9, 11);

// Relay configuration
const int pinRelay = 3;

// Tension tracking
int currentTension = 50;  // Start at middle position
int targetTension = 50;
const int MAX_TENSION = 100;
const int MIN_TENSION = 0;

// Valve position tracking
const int VALVE_CLOSED = 0;    // 0 degrees - valve closed
const int VALVE_OPEN = 90;     // 90 degrees - valve open
int currentValveAngle = VALVE_CLOSED;  // Start with valve closed
const int STEPS_FOR_90_DEGREES = stepsPerRevolution / 4;  // 512/4 = 128 steps for 90°

// State tracking
enum BalloonState {
  IDLE,
  INFLATING,
  DEFLATING
};
BalloonState currentState = IDLE;

// Timing
const int UPDATE_INTERVAL = 100;  // Check for updates every 100ms
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(9600);
  
  // Initialize stepper
  myStepper.setSpeed(rolePerMinute);
  
  // Initialize relay (pump)
  pinMode(pinRelay, OUTPUT);
  digitalWrite(pinRelay, HIGH);  // Pump OFF initially (active LOW relay)
  
  // Ensure valve is at closed position (0°)
  currentValveAngle = VALVE_CLOSED;
  
  Serial.println("Balloon Controller Ready!");
  Serial.println("Send: TENSION:<0-100>");
  Serial.println("Valve at 0° (CLOSED), Pump OFF");
}

void loop() {
  // Check for serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("TENSION:")) {
      int newTension = command.substring(8).toInt();
      
      // Validate tension range
      if (newTension >= MIN_TENSION && newTension <= MAX_TENSION) {
        targetTension = newTension;
        Serial.print("Target tension set to: ");
        Serial.println(targetTension);
      } else {
        Serial.println("ERROR: Tension must be 0-100");
      }
    }
  }
  
  // Update balloon state periodically
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = millis();
    updateBalloon();
  }
}

/**
 * Update balloon inflation/deflation based on current vs target tension
 */
void updateBalloon() {
  if (currentTension == targetTension) {
    // Target reached - go to IDLE state
    if (currentState != IDLE) {
      // Transition to IDLE
      digitalWrite(pinRelay, HIGH);  // Turn pump OFF (active LOW relay)
      closeValve();  // Ensure valve is closed at 0°
      currentState = IDLE;
      Serial.println("IDLE - Target reached");
    }
    return;
  }
  
  int tensionDiff = targetTension - currentTension;
  
  if (tensionDiff > 0) {
    // Need to INFLATE
    if (currentState != INFLATING) {
      // Transition to INFLATING
      closeValve();  // Make sure valve is closed
      digitalWrite(pinRelay, LOW);  // Turn pump ON (active LOW relay)
      currentState = INFLATING;
      Serial.println("STATE: INFLATING - Pump ON, Valve CLOSED");
    }
    inflateStep();
    
  } else {
    // Need to DEFLATE
    if (currentState != DEFLATING) {
      // Transition to DEFLATING
      digitalWrite(pinRelay, HIGH);  // Turn pump OFF (active LOW relay)
      openValve();  // Open valve to 90°
      currentState = DEFLATING;
      Serial.println("STATE: DEFLATING - Pump OFF, Valve OPEN");
    }
    deflateStep();
  }
}

/**
 * Open valve to 90 degrees for deflation
 */
void openValve() {
  if (currentValveAngle != VALVE_OPEN) {
    int stepsToMove = STEPS_FOR_90_DEGREES;
    myStepper.step(stepsToMove);
    currentValveAngle = VALVE_OPEN;
    Serial.println("Valve OPENED to 90°");
  }
}

/**
 * Close valve to 0 degrees to block deflation
 */
void closeValve() {
  if (currentValveAngle != VALVE_CLOSED) {
    int stepsToMove = -STEPS_FOR_90_DEGREES;
    myStepper.step(stepsToMove);
    currentValveAngle = VALVE_CLOSED;
    Serial.println("Valve CLOSED to 0°");
  }
}

/**
 * Inflate balloon (increase tension)
 */
void inflateStep() {
  // Pump is ON, valve is closed
  // Just increment tension gradually
  currentTension++;
  
  delay(50);
  
  Serial.print("INFLATING -> Tension: ");
  Serial.println(currentTension);
}

/**
 * Deflate balloon (decrease tension)
 */
void deflateStep() {
  // Pump is OFF, valve is open at 90°
  // Air escapes naturally, just decrement tension
  currentTension--;
  
  delay(50);
  
  Serial.print("DEFLATING -> Tension: ");
  Serial.println(currentTension);
}
