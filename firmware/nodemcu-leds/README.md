# Firmware NodeMCU - Indicador LED del baño

Lee `GET /state` del backend cada 2 segundos y prende el LED rojo (ocupado) o verde (libre).

## Materiales

| Cantidad | Componente                | Notas                                  |
|----------|---------------------------|----------------------------------------|
| 1        | NodeMCU v3 (LoL1n / ESP8266) | Cualquier clon con ESP-12E sirve      |
| 1        | LED rojo 5mm o 3mm        | Difuso o transparente                  |
| 1        | LED verde 5mm o 3mm       | Idem                                   |
| 2        | Resistor 220Ω (o 330Ω)    | 1/4W                                   |
| 1        | Protoboard + jumpers      | Para pruebas                           |

## Cableado

```
NodeMCU D1  ──/220Ω/──[LED rojo +]─── GND
NodeMCU D2  ──/220Ω/──[LED verde +]── GND
NodeMCU 3V3 ── (no se usa)
NodeMCU GND ── (a los cátodos de los LEDs)
```

> Convención LED: la pata larga es el ánodo (+), va al resistor/pin. La corta es el cátodo (-), va a GND.

## Setup del Arduino IDE (1 vez)

1. **Instalar drivers CH340** para el USB-UART del LoL1n:
   - Descargar desde https://sparks.gogo.co.nz/assets/_site_/downloads/CH34xSerSetup.exe
2. **Abrir Arduino IDE** → File → Preferences → "Additional Boards Manager URLs":
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. **Tools → Board → Boards Manager** → buscar "esp8266" → instalar **"esp8266 by ESP8266 Community"**.
4. **Tools → Board** → seleccionar **"NodeMCU 1.0 (ESP-12E Module)"**.
5. **Tools → Port** → seleccionar el COM que apareció (ej: `COM3`).
6. **Sketch → Include Library → Manage Libraries** → instalar **"ArduinoJson" by Benoit Blanchon** (v6+).

## Configuración del firmware

Editá estas líneas al principio de `nodemcu-leds.ino`:

```cpp
static const char* WIFI_SSID = "TU_WIFI";
static const char* WIFI_PASS = "TU_PASSWORD";
static const char* STATE_URL = "http://192.168.1.100:8080/api/state";
```

Para `STATE_URL`:
- **Pruebas locales**: la IP de tu PC en la red WiFi + el puerto del front local (default 8080). Para saber la IP: en PowerShell `ipconfig | findstr IPv4`.
- **Producción**: la URL pública del front (ej: `https://bano.tu-empresa.com/api/state`). El firmware soporta HTTPS con `setInsecure()` (no valida certificado, suficiente para un baño).

## Cargar el firmware

1. Conectá el NodeMCU por USB.
2. Abrí `nodemcu-leds.ino` en Arduino IDE.
3. **Sketch → Upload** (botón →).
4. Abrí **Tools → Serial Monitor** a **115200 baud** para ver logs.

## Flujo de prueba

```
PC (back local)  ←── GET /state cada 2s ── NodeMCU + LEDs
```

1. Levantar el back local:
   ```powershell
   cd C:\Users\jdsan\Documents\2.- Proyectos\Baño
   docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
   ```
2. Cambiar estado manualmente:
   ```powershell
   $HW = "TU_HARDWARE_TOKEN"
   Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/sensor `
     -ContentType 'application/json' `
     -Headers @{Authorization="Bearer $HW"} `
     -Body '{"occupied":true}'
   ```
3. El LED rojo del NodeMCU se prende. Con `{"occupied":false}` se prende el verde.

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| No aparece COM en Tools → Port | Falta driver CH340, o probá otro cable USB (algunos son solo carga). |
| `error: ESP8266WiFi.h: No such file` | No instalaste el board package ESP8266. |
| `ArduinoJson.h: No such file` | Instalá ArduinoJson desde Library Manager. |
| Compila pero LEDs no prenden | Verificá que la IP de `STATE_URL` sea alcanzable desde el NodeMCU (misma red WiFi). |
| Parpadeo rojo rápido | El NodeMCU no puede reached el backend. Revisá URL y conectividad. |
| Ambos LEDs apagados | Estado `Desconocido` (sin red, o back caído). |
