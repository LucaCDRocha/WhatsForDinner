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

// Timing
const int UPDATE_INTERVAL = 100;  // Check for updates every 100ms
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(9600);
  
  // Initialize stepper
  myStepper.setSpeed(rolePerMinute);
  
  // Initialize relay (pump)
  pinMode(pinRelay, OUTPUT);
  digitalWrite(pinRelay, LOW);  // Pump OFF initially
  
  Serial.println("Balloon Controller Ready!");
  Serial.println("Send: TENSION:<0-100>");
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
    // At target - turn off pump and keep valve closed
    digitalWrite(pinRelay, LOW);
    return;
  }
  
  int tensionDiff = targetTension - currentTension;
  
  if (tensionDiff > 0) {
    // INFLATE: Need to increase tension
    digitalWrite(pinRelay, HIGH);  // Turn pump ON
    inflateStep();
  } else {
    // DEFLATE: Need to decrease tension
    digitalWrite(pinRelay, LOW);  // Turn pump OFF
    deflateStep();
  }
}

/**
 * Inflate balloon (increase tension)
 */
void inflateStep() {
  // Pump is controlled in updateBalloon()
  // Keep valve closed (stepper at position)
  // No stepper movement needed
  
  // Increment tension gradually
  currentTension++;
  
  // Small delay for inflation
  delay(50);
  
  Serial.print("INFLATING -> Tension: ");
  Serial.println(currentTension);
  
  // Check if target reached
  if (currentTension >= targetTension) {
    Serial.println("TARGET REACHED - Pump will turn OFF");
  }
}

/**
 * Deflate balloon (decrease tension)
 */
void deflateStep() {
  // Pump is controlled in updateBalloon()
  
  // Open valve using stepper motor
  // Rotate to release air
  int steps = 10;  // Small incremental release
  myStepper.step(steps);
  
  // Decrement tension gradually
  currentTension--;
  
  delay(50);
  
  Serial.print("DEFLATING -> Tension: ");
  Serial.println(currentTension);
  
  // Close valve if target reached
  if (currentTension <= targetTension) {
    // Return stepper to closed position (reverse steps)
    myStepper.step(-steps);
    Serial.println("TARGET REACHED - Valve CLOSED");
  }
}
