/*
 * Baño Office - Indicador LED con NodeMCU ESP8266 (LoL1n v3)
 *
 * Lee GET /state del backend cada 2s y enciende LED rojo (ocupado) o verde (libre).
 *
 * Cableado:
 *   D1 (GPIO5) ──/220Ω/──[LED rojo +]── GND
 *   D2 (GPIO4) ──/220Ω/──[LED verde +]── GND
 *
 * Dependencias (Library Manager):
 *   - ArduinoJson (Benoit Blanchon)
 *   - ESP8266 board package ( Boards Manager -> ESP8266 by ESP8266 Community )
 *
 * Board: "NodeMCU 1.0 (ESP-12E Module)" o "Generic ESP8266 Module"
 */

#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

// ====== CONFIGURACIÓN - editá estas 3 líneas ======
static const char* WIFI_SSID = "TU_WIFI";
static const char* WIFI_PASS = "TU_PASSWORD";
// Local:  "http://192.168.1.100:8080/api/state"
// Cloud:  "https://bano.tu-empresa.com/api/state"
static const char* STATE_URL = "http://192.168.1.100:8080/api/state";
// ==================================================

static const int PIN_ROJO = D1;   // GPIO5
static const int PIN_VERDE = D2;  // GPIO4

static const unsigned long POLL_MS = 2000UL;
static const unsigned long RECONNECT_MS = 10000UL;

static unsigned long lastFetch = 0;
static bool lastConnected = false;

enum class BanoStatus { Libre, Ocupado, Desconocido };

void setLeds(BanoStatus s) {
  switch (s) {
    case BanoStatus::Ocupado:
      digitalWrite(PIN_ROJO, HIGH);
      digitalWrite(PIN_VERDE, LOW);
      break;
    case BanoStatus::Libre:
      digitalWrite(PIN_ROJO, LOW);
      digitalWrite(PIN_VERDE, HIGH);
      break;
    case BanoStatus::Desconocido:
      digitalWrite(PIN_ROJO, LOW);
      digitalWrite(PIN_VERDE, LOW);
      break;
  }
}

void blinkError() {
  // Parpadeo rojo rápido para indicar fallo de red.
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_ROJO, HIGH);
    delay(120);
    digitalWrite(PIN_ROJO, LOW);
    delay(120);
  }
}

BanoStatus fetchStatus() {
  const bool useTls = String(STATE_URL).startsWith("https://");

  std::unique_ptr<WiFiClient> client;
  HTTPClient http;
  if (useTls) {
    auto* secure = new WiFiClientSecure();
    secure->setInsecure();  // acepta cualquier certificado; suficiente para un baño
    client.reset(secure);
  } else {
    client.reset(new WiFiClient());
  }

  if (!http.begin(*client, STATE_URL)) {
    Serial.println("[http] begin failed");
    return BanoStatus::Desconocido;
  }
  http.setTimeout(4000);
  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("[http] GET failed: %d\n", code);
    http.end();
    return BanoStatus::Desconocido;
  }
  String body = http.getString();
  http.end();

  // Body: {"status":"free|occupied","source":"manual|sensor",...}
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.print(F("[json] parse failed: "));
    Serial.println(err.f_str());
    return BanoStatus::Desconocido;
  }
  const char* status = doc["status"] | "";
  if (strcmp(status, "occupied") == 0) return BanoStatus::Ocupado;
  if (strcmp(status, "free") == 0) return BanoStatus::Libre;
  return BanoStatus::Desconocido;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print(F("[wifi] reconnecting"));
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[wifi] IP: "));
    Serial.println(WiFi.localIP());
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println(F("\n[boot] Baño LED indicator"));
  pinMode(PIN_ROJO, OUTPUT);
  pinMode(PIN_VERDE, OUTPUT);
  setLeds(BanoStatus::Desconocido);

  WiFi.mode(WIFI_STA);
  connectWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setLeds(BanoStatus::Desconocido);
    if (millis() - lastFetch > RECONNECT_MS) {
      connectWifi();
      lastFetch = millis();
    }
    return;
  }

  if (!lastConnected) {
    Serial.print(F("[wifi] ready, IP: "));
    Serial.println(WiFi.localIP());
    lastConnected = true;
  }

  if (millis() - lastFetch >= POLL_MS) {
    lastFetch = millis();
    BanoStatus s = fetchStatus();
    if (s == BanoStatus::Desconocido) {
      blinkError();
    } else {
      setLeds(s);
      Serial.printf("[state] %s\n", s == BanoStatus::Ocupado ? "OCUPADO" : "LIBRE");
    }
  }
}
