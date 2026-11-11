// CODE AI board firmware (GPL-3.0, part of BlockML Studio).
// Lets the Arduino blocks in BlockML Studio drive an Arduino Uno live over USB.
// Studio installs it with "Prepare board"; it can also be uploaded from the Arduino IDE.
//
// Protocol: 115200 baud, one line per command, one line per answer.
//   request  "<id> <cmd> <args...>\n"     answer "<id> <value>\n"
//   V                  -> "CODEAI 2"            (which firmware is this?)
//   P pin mode         -> "ok"   pinMode: 0 INPUT, 1 OUTPUT, 2 INPUT_PULLUP
//   D pin value        -> "ok"   digitalWrite (0 or 1)
//   W pin value        -> "ok"   analogWrite (0-255, PWM pins 3 5 6 9 10 11)
//   S pin angle        -> "ok"   servo to 0-180 degrees (attached on first use)
//   R pin              -> "0"/"1" digitalRead
//   A pin              -> 0-1023 analogRead (pin 14-19 = A0-A5)
//   U trig echo        -> cm     HC-SR04 distance, one decimal; 0 = no echo
//   T pin hz           -> "ok"   tone() on a buzzer (31-20000 Hz); 0 = noTone() (one pin at a time)
//   Z                  -> "ok"   all outputs LOW (the project stopped)
// Pins 0 and 1 carry the USB serial, so they are refused ("err pin").
// When it starts, the board says "CODEAI 2 ready".
#include <Servo.h>

const int SERVO_SLOTS = 4;
Servo servos[SERVO_SLOTS];
int servoPin[SERVO_SLOTS] = {-1, -1, -1, -1};
bool isOutput[20];

char line[40];
int len = 0;

int servoFor(int pin) {
  for (int i = 0; i < SERVO_SLOTS; i++) if (servoPin[i] == pin) return i;
  for (int i = 0; i < SERVO_SLOTS; i++) {
    if (servoPin[i] < 0) {
      servoPin[i] = pin;
      servos[i].attach(pin);
      return i;
    }
  }
  return -1;
}

// The Servo library takes over Timer1, which also makes PWM on pins 9 and 10. When the
// last servo is gone, give Timer1 back its Arduino settings so analogWrite(9/10) works again.
void stopServo(int pin) {
  bool stopped = false;
  for (int i = 0; i < SERVO_SLOTS; i++) {
    if (servoPin[i] == pin) { servos[i].detach(); servoPin[i] = -1; stopped = true; }
  }
  if (!stopped) return;
  for (int i = 0; i < SERVO_SLOTS; i++) if (servoPin[i] >= 0) return;
  TIMSK1 &= ~_BV(OCIE1A);           // the Servo library leaves its interrupt on after detach()
  TCCR1A = _BV(WGM10);              // 8-bit phase-correct PWM, as init() sets it
  TCCR1B = _BV(CS11) | _BV(CS10);   // prescaler 64 (490 Hz)
  TCNT1 = 0;                        // the servo left it above 255: it would count to 65535 first
}

void makeOutput(int pin) {
  if (!isOutput[pin]) { stopServo(pin); pinMode(pin, OUTPUT); isOutput[pin] = true; }
}

float distanceCm(int trig, int echo) {
  pinMode(trig, OUTPUT);
  isOutput[trig] = true;
  pinMode(echo, INPUT);
  isOutput[echo] = false;
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long t = pulseIn(echo, HIGH, 30000);
  return t * 0.034 / 2;
}

bool validPin(long p) { return p >= 2 && p <= 19; }

void handle(char *s) {
  char *rest;
  long id = strtol(s, &rest, 10);
  while (*rest == ' ') rest++;
  char cmd = *rest;
  if (cmd) rest++;
  long a = strtol(rest, &rest, 10);
  long b = strtol(rest, &rest, 10);
  Serial.print(id);
  Serial.print(' ');
  switch (cmd) {
    case 'V':
      Serial.println(F("CODEAI 2"));
      return;
    case 'Z':
      for (int p = 2; p < 20; p++) if (isOutput[p]) { noTone(p); digitalWrite(p, LOW); }
      Serial.println(F("ok"));
      return;
  }
  if (!validPin(a)) { Serial.println(F("err pin")); return; }
  int pin = (int)a;
  switch (cmd) {
    case 'P':
      stopServo(pin);
      pinMode(pin, b == 1 ? OUTPUT : b == 2 ? INPUT_PULLUP : INPUT);
      isOutput[pin] = (b == 1);
      Serial.println(F("ok"));
      break;
    case 'D':
      makeOutput(pin);
      digitalWrite(pin, b ? HIGH : LOW);
      Serial.println(F("ok"));
      break;
    case 'W':
      makeOutput(pin);
      analogWrite(pin, constrain(b, 0, 255));
      Serial.println(F("ok"));
      break;
    case 'S': {
      int i = servoFor(pin);
      if (i < 0) { Serial.println(F("err servos")); break; }
      isOutput[pin] = false;
      servos[i].write(constrain(b, 0, 180));
      Serial.println(F("ok"));
      break;
    }
    case 'R':
      if (isOutput[pin]) { pinMode(pin, INPUT); isOutput[pin] = false; }
      Serial.println(digitalRead(pin));
      break;
    case 'A':
      if (pin < 14) { Serial.println(F("err pin")); break; }
      Serial.println(analogRead(pin - 14));
      break;
    case 'T':
      makeOutput(pin);
      if (b <= 0) noTone(pin);
      else tone(pin, (unsigned int)constrain(b, 31, 20000));
      Serial.println(F("ok"));
      break;
    case 'U':
      if (!validPin(b)) { Serial.println(F("err pin")); break; }
      Serial.println(distanceCm(pin, (int)b), 1);
      break;
    default:
      Serial.println(F("err command"));
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println(F("CODEAI 2 ready"));
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (len > 0) { line[len] = 0; handle(line); len = 0; }
    } else if (len < (int)sizeof(line) - 1) {
      line[len++] = c;
    }
  }
}
