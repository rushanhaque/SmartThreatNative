# Smart Threat Detection Glasses — Full Implementation Plan

Engineering reference for taking the project from a finished UI to working
hardware. Covers sensor wiring, data acquisition, firmware structure, the
BLE protocol, app integration, and the ML pipeline.

Companion to [QUICK-START.md](./QUICK-START.md), which is the ordered walkthrough.

---

## Contents

1. [System architecture](#1-system-architecture)
2. [Corrections to the proposal](#2-corrections-to-the-proposal)
3. [Hardware: wiring and power](#3-hardware-wiring-and-power)
4. [Sensor acquisition, channel by channel](#4-sensor-acquisition-channel-by-channel)
5. [Firmware structure](#5-firmware-structure)
6. [The BLE protocol](#6-the-ble-protocol)
7. [App integration](#7-app-integration)
8. [The ML pipeline](#8-the-ml-pipeline)
9. [Calibration](#9-calibration)
10. [Testing and validation](#10-testing-and-validation)
11. [Risk register](#11-risk-register)

---

## 1. System architecture

Three layers, with a hard boundary between each.

```
┌─ LAYER 1 · GLASSES ────────────────────────────────────────┐
│  ESP32-S3          Wi-Fi scan, promiscuous sniff, fusion,  │
│                    OLED, haptics, BLE peripheral           │
│  nRF52840          BLE observer → UART → ESP32             │
│  AD8318            RF power        → ADC1                  │
│  EMF coil + LM358  EM field        → ADC1                  │
│  BH1750            Lux             → I²C                   │
└────────────────────────────────────────────────────────────┘
                            │ BLE GATT, 1 Hz notify
┌─ LAYER 2 · PHONE ──────────────────────────────────────────┐
│  transport.ts   BLE ⇄ typed events                         │
│  store.ts       state, history, sessions                   │
│  fusion.ts      re-derives the breakdown for explanation   │
└────────────────────────────────────────────────────────────┘
                            │
┌─ LAYER 3 · UI ─────────────────────────────────────────────┐
│  Shield · Devices · History · Settings                     │
└────────────────────────────────────────────────────────────┘
```

**Why the glasses score, and the phone scores again.** The glasses must alert
even with the phone in a bag, so scoring has to be on-device. The phone
re-computes the same score from the same inputs so it can *show the working* —
which channel contributed what. `engine/fusion.ts` and the C++ kernel share one
set of weights; if they ever disagree, that is a bug and the firmware takes the
higher of the two (fail loud).

---

## 2. Corrections to the proposal

Address these before ordering or committing scope.

### 2.1 The ESP32-S3 has no 5 GHz radio

§1 and §3.1 promise "Wi-Fi (2.4GHz/5GHz)". The ESP32-S3 is 2.4 GHz only —
this is silicon, not firmware, so no amount of code fixes it.

**Options:**

| Option | Cost | Verdict |
| --- | --- | --- |
| Drop 5 GHz from scope | ₹0 | **Recommended.** Most cheap spy cams are 2.4 GHz. |
| Add an RTL8812AU USB dongle | ~₹1,500 | Needs a USB host and Linux-class drivers. Not viable on ESP32. |
| Let the phone scan 5 GHz | ₹0 | Partial. Android exposes scan results; iOS does not. |

Take option 1 and state it as a scope boundary. An examiner will accept a
documented limit; they will not accept a claim you cannot demonstrate.

### 2.2 ADC2 is unusable while Wi-Fi is active

On ESP32, the Wi-Fi driver owns ADC2. Analog reads on ADC2 pins return errors or
garbage the moment the radio comes up — and your project has the radio up
permanently. Both analog sensors **must** be on ADC1.

On ESP32-S3, ADC1 is **GPIO 1–10**. Use GPIO 4 and GPIO 5.

This is the single most common way this class of project fails: the sensors work
perfectly on the bench, then read zero once scanning starts.

### 2.3 Verify the Tile company ID

§7.2 lists Tile as `0x00E0`. Per the Bluetooth SIG assignments, `0x00E0` belongs
to Google; Tile's company identifier is `0x0157`, and Tile trackers are more
reliably found by their advertised service UUIDs `0xFEED` / `0xFEEC`.

Confirm against the current SIG registry before relying on it. If it is wrong,
your scanner misses every Tile silently — the worst kind of bug, because it looks
like it is working.

### 2.4 Known-good identifiers

| Tracker | Match on | Value |
| --- | --- | --- |
| Apple AirTag / FindMy | Manufacturer data company ID | `0x004C`, payload type `0x12` |
| Samsung SmartTag | Manufacturer data company ID | `0x0075` |
| Tile | Service UUID | `0xFEED` / `0xFEEC` — verify |
| Generic iTag | Device name | `"iTAG"`, `"ITAG"` |

---

## 3. Hardware: wiring and power

### 3.1 Pin map (ESP32-S3-DevKitC-1)

| Peripheral | Interface | Pin | Notes |
| --- | --- | --- | --- |
| BH1750 SDA | I²C | GPIO 8 | Shared bus, addr `0x23` |
| BH1750 SCL | I²C | GPIO 9 | |
| SSD1306 OLED | I²C | GPIO 8 / 9 | Same bus, addr `0x3C` |
| AD8318 `VOUT` | ADC1 CH3 | **GPIO 4** | 0–2.5 V analog |
| EMF amp out | ADC1 CH4 | **GPIO 5** | 0–3.3 V analog |
| nRF52840 → ESP32 | UART1 RX | GPIO 18 | 115200 8N1 |
| ESP32 → nRF52840 | UART1 TX | GPIO 17 | |
| Vibration motor | PWM | GPIO 12 | Via NPN + flyback diode |
| Buzzer | PWM | GPIO 13 | Passive buzzer, drive with `ledc` |
| Status LED | Digital | GPIO 48 | On-board RGB |
| Calibrate button | Digital in | GPIO 0 | `INPUT_PULLUP`, active low |

**Do not drive the vibration motor from a GPIO directly.** It is inductive and
draws ~80 mA. Use a 2N2222 or a MOSFET with a 1N4148 flyback diode across the
motor. Skipping the diode destroys the pin on the first switch-off.

### 3.2 The EMF sensing coil

Not a purchased part — you wind it.

- ~100 turns of 26 AWG enamelled copper on a 2 cm former
- One end to ground, the other to the LM358 non-inverting input
- Non-inverting amplifier, gain ≈ 100 (R_f = 100 kΩ, R_g = 1 kΩ)
- **Bias the input to VCC/2** with a 100 kΩ/100 kΩ divider — the coil produces an
  AC signal swinging both ways, and a single-supply op-amp cannot represent
  negatives. Without the bias you lose half the waveform.
- RC low-pass on the output (10 kΩ + 100 nF ≈ 160 Hz) before the ADC

Read at 500 Hz, take the peak-to-peak over a 500 ms window, convert to
milligauss with the constant you derive in [§9](#9-calibration).

### 3.3 Power budget

| Rail | Current | Notes |
| --- | --- | --- |
| ESP32-S3 (Wi-Fi active) | ~160 mA | Peaks ~350 mA on TX bursts |
| nRF52840 scanning | ~15 mA | |
| OLED | ~20 mA | Depends on lit pixels |
| AD8318 | ~30 mA | Constant |
| LM358 + coil | ~5 mA | |
| Idle total | **~230 mA** | |

A 1000 mAh LiPo gives ~4.3 h theoretical, **~3 h real** after regulator losses
and TX peaks.

Two things buy you more:

- **Duty-cycle the OLED.** Wake it on threat change or button press; blank it
  otherwise. Saves ~20 mA, roughly 25 extra minutes.
- **Duty-cycle the AD8318.** Power it through a MOSFET and sample in 100 ms
  bursts every 500 ms. Saves ~24 mA.

Size the LiPo's discharge rating for the 350 mA peaks. A 1 C cell is fine; do not
use a protection board rated below 500 mA or it will cut out under TX bursts.

---

## 4. Sensor acquisition, channel by channel

### 4.1 Wi-Fi — hidden cameras

Two acquisition modes, used together.

**Mode A — active scan.** `WiFi.scanNetworks()` returns access points: BSSID,
SSID, RSSI, channel. Cheap and stable. Catches cameras that create their own
hotspot (very common on no-name spy cams — SSIDs like `MV_1234`, `HD_A1B2`).

**Mode B — promiscuous sniffing.** `esp_wifi_set_promiscuous(true)` with a
callback gives raw 802.11 frames, which reveals *client* devices already joined
to a network. This is how you find a camera on the hotel's own Wi-Fi.

```c
static void snifferCb(void *buf, wifi_promiscuous_pkt_type_t type) {
  if (type != WIFI_PKT_DATA && type != WIFI_PKT_MGMT) return;
  const wifi_promiscuous_pkt_t *p = (wifi_promiscuous_pkt_t *)buf;
  const uint8_t *payload = p->payload;

  // 802.11 MAC header: addr2 (transmitter) starts at byte 10
  uint8_t mac[6];
  memcpy(mac, payload + 10, 6);

  // Locally-administered bit — randomised MAC, vendor lookup will fail
  bool randomised = (mac[0] & 0x02) != 0;

  trackDevice(mac, p->rx_ctrl.rssi, p->rx_ctrl.sig_len, randomised);
}
```

You must **channel-hop** — the radio only hears one channel at a time. Cycle
1 → 6 → 11 → 2 → 7 … dwelling ~120 ms each. A camera is only visible during its
channel's dwell, so a full sweep takes ~1.5 s.

**Turning packets into a camera verdict.** Three independent signals:

1. **Vendor OUI.** First three MAC bytes identify the manufacturer. Download the
   IEEE OUI list, keep only camera vendors (Hikvision `D8:A0:1D`, Dahua
   `FC:2F:40`, XiongMai, Wyze, IMOU, TP-Link cameras…), store as a sorted binary
   table in SPIFFS for fast lookup. ~50 entries is enough for a prototype.
   *Caveat:* randomised MACs defeat this, which is why it is only 0.6 of the
   camera score.

2. **Streaming behaviour.** Video has a distinctive shape: sustained, high, and
   with characteristic packet-length variance. Track bytes per second per MAC.
   `> 300 kbps sustained for > 20 s` is a strong indicator. This is the
   simplified version of the IEEE S&P 2021 traffic-analysis paper you cite, and
   it **works even when the traffic is encrypted** — you are measuring volume and
   timing, not content. Worth emphasising in your viva.

3. **Open RTSP port.** The phone can attempt a TCP connect to port 554/8000 on
   the device's IP. **Only do this on your own test network.** Port-scanning a
   hotel's network without permission is not something to demonstrate to an
   examiner — gate it behind the existing "Passive only" setting, which defaults
   to on.

### 4.2 Bluetooth — trackers

Run BLE scanning on the **nRF52840**, not the ESP32. Sharing the ESP32's single
2.4 GHz radio between Wi-Fi and BLE means both get worse; a dedicated chip gets
clean, continuous observation.

Parse the manufacturer-data field of each advertisement:

```c
// Apple FindMy: company 0x004C (little-endian in the payload), type 0x12
if (len >= 4 && data[0] == 0x4C && data[1] == 0x00 && data[2] == 0x12) {
  uint8_t status = data[3];   // bit 2 = separated from owner
  recordTracker(addr, rssi, TRACKER_FINDMY, status);
}
```

**Detecting that a tag is following you** is the actual problem, and it is a
time-correlation problem, not a detection problem. A tracker in a café is
harmless; the same tracker still with you three streets later is not.

For each tag keep a rolling record of `{ timestamp, rssi }` and score:

```
travelScore = 0
if (distinctSightings ≥ 5 && spanMinutes ≥ 10)  travelScore += 0.8
if (rssiVariance < 15 dB²)                      travelScore += 0.2   // fixed distance ⇒ in your bag
```

Low RSSI variance is the strongest single signal. A tag lying on a table drifts
wildly as you move; a tag *in your bag* holds a nearly constant distance. That is
already implemented in `engine/fusion.ts` as `rssiVariance()`.

**The honest limit:** Apple rotates the FindMy public key every 15 minutes, so
you cannot correlate one tag beyond that window. Track within the window, and
state the limitation.

### 4.3 RF power — bugs

The AD8318 is a logarithmic detector: it outputs a voltage **inversely**
proportional to input power, roughly −25 mV/dB.

```c
// ADC1, 12-bit, 11 dB attenuation → 0–3.1 V
int raw = analogRead(PIN_RF);              // 0–4095
float volts = raw * 3.1f / 4095.0f;
float dBm = (VREF_INTERCEPT - volts) / 0.025f;   // slope 25 mV/dB
```

`VREF_INTERCEPT` comes from calibration ([§9](#9-calibration)) — it varies
per board, so do not hardcode a datasheet value.

Sample at 100 ms into a 50-sample ring buffer, and report **both** the mean and
the max. The max catches short bursts a mean would average away.

A quiet room sits near −70 dBm. A transmitter within a few metres pushes past
−35 dBm. The score maps that span:

```
rfScore = map(clamp(dBm, -70, -30), -70, -30, 0, 1)
```

**Your own Wi-Fi is the biggest false positive.** The ESP32's own transmissions
and the room's router both raise the floor. Mitigation: a 60-second learning
phase at boot that records the ambient baseline, then score *deviation from
baseline* rather than absolute power.

### 4.4 EM field

Near-field magnetic pickup. An active transmitter a few centimetres away
produces a field far above ambient — useful for the specific case of a bug
hidden in a pillow or bedside object.

Sample the amplifier output at 500 Hz, take peak-to-peak across a 500 ms window,
average 20 windows to suppress mains hum. Background is under 1.5 mG; sustained
readings above 3 mG are notable, above 5 mG strong.

**Expect this channel to be noisy.** It carries only 0.10 weight for exactly that
reason. Mains wiring, phone chargers and laptop supplies all register. Treat it
as corroboration, never as a primary trigger.

### 4.5 Ambient light

BH1750 over I²C, continuous high-res mode, ~120 ms per conversion.

Two jobs:

1. **Risk multiplier.** Under 15 lux the room is dark, which is when night-vision
   cameras operate — so the same evidence means more. Multiplier ×1.4.
2. **Scan-rate boost.** In the dark, tighten the Wi-Fi scan interval from 2 s to
   1 s. This is the `darkBoost` setting already in the app.

---

## 5. Firmware structure

FreeRTOS, one task per concern, pinned deliberately across the two cores.

| Task | Core | Period | Priority | Stack |
| --- | --- | --- | --- | --- |
| `WiFiScanTask` | 0 | 2 s | 3 | 4096 |
| `SnifferTask` | 0 | continuous | 4 | 4096 |
| `BleUartTask` | 1 | continuous | 3 | 2048 |
| `RfSenseTask` | 1 | 100 ms | 5 | 2048 |
| `EmfSenseTask` | 1 | 500 ms | 5 | 2048 |
| `FusionTask` | 1 | 1 s | 2 | 8192 |
| `UiTask` | 1 | 200 ms | 1 | 4096 |
| `BleNotifyTask` | 1 | 1 s | 2 | 4096 |

**Core 0 handles radio, core 1 handles everything else.** The Wi-Fi driver has
hard real-time requirements; if fusion or UI work runs on core 0 you will drop
frames and see scan failures.

Sensor tasks own their sampling and publish into a shared `SensorState` guarded
by a mutex. `FusionTask` takes a snapshot, releases the mutex, then computes —
never hold a lock across the scoring maths.

Storage in SPIFFS: the OUI table (binary, sorted, ~50 entries), a ring buffer of
the last 100 threat events, and the trained model coefficients.

---

## 6. The BLE protocol

The glasses are the **peripheral**; the phone is the **central**.

### 6.1 GATT layout

```
Service  6e400001-b5a3-f393-e0a9-e50e24dcca9e
├── 6e400002-…  Telemetry   NOTIFY   20 B binary, 1 Hz
├── 6e400003-…  DeviceList  NOTIFY   chunked, on demand
├── 6e400004-…  Command     WRITE    phone → glasses
└── 6e400005-…  Info        READ     firmware, serial, battery
```

### 6.2 Telemetry frame — binary, not JSON

The proposal suggests sending JSON. **Do not.** Default BLE MTU is 23 bytes, of
which 20 are usable. The example JSON in §10 is over 200 bytes, so every update
becomes a multi-packet reassembly problem at 1 Hz, forever.

Pack it instead. Everything below fits in 20 bytes:

```c
typedef struct __attribute__((packed)) {
  uint32_t timestamp;    // 4  unix seconds
  uint8_t  score;        // 1  0-100
  uint8_t  klass;        // 1  0 safe, 1 caution, 2 threat
  uint8_t  confidence;   // 1  0-100
  uint8_t  camera;       // 1  channel contributions, 0-255
  uint8_t  tracker;      // 1
  uint8_t  rf;           // 1
  uint8_t  emf;          // 1
  uint8_t  dark;         // 1
  int8_t   rfDbm;        // 1
  uint8_t  emfMg10;      // 1  milligauss × 10
  uint16_t lux;          // 2
  uint8_t  wifiCount;    // 1
  uint8_t  bleCount;     // 1
  uint8_t  battery;      // 1
  uint8_t  flags;        // 1  bit0 scanning, bit1 charging
} TelemetryFrame;        // = 20 bytes exactly
```

That maps directly onto `SensorFrame` and `Verdict` in `engine/types.ts`.

**The device list is different** — it is variable-length and only needed when the
user opens the Devices screen. Request it via the Command characteristic, then
stream it in chunks with a 2-byte header (`chunkIndex`, `chunkTotal`).
Negotiate a larger MTU first:

```c
esp_ble_gatt_set_local_mtu(247);   // 244 usable
```

### 6.3 Commands

| Byte 0 | Command | Payload |
| --- | --- | --- |
| `0x01` | Start deep scan | duration (u8, seconds) |
| `0x02` | Request device list | — |
| `0x03` | Set sensitivity | 0 low / 1 balanced / 2 high |
| `0x04` | Set trust | 6-byte MAC + trust level |
| `0x05` | Recalibrate | — |
| `0x06` | Pause / resume | 0 or 1 |

---

## 7. App integration

### 7.1 Prerequisite: you must leave Expo Go

`react-native-ble-plx` contains native code, which Expo Go cannot load. Build a
development client once:

```bash
npx expo install react-native-ble-plx
npx expo prebuild
npx expo run:android      # or run:ios
```

From then on you install *your* dev client instead of Expo Go. Hot reload still
works exactly as before.

Permissions — Android 12+ needs runtime grants:

```json
{ "expo": { "plugins": [["react-native-ble-plx", {
  "isBackgroundEnabled": true,
  "modes": ["peripheral", "central"],
  "bluetoothAlwaysPermission": "SmartThreat uses Bluetooth to connect to your glasses."
}]] } }
```

### 7.2 The transport seam

Create `engine/transport.ts`:

```ts
import type { Device, SensorFrame, Verdict, HardwareState } from './types'

export interface Transport {
  start(): Promise<void>
  stop(): void
  onFrame(cb: (f: SensorFrame) => void): void
  onDevices(cb: (d: Device[]) => void): void
  onVerdict(cb: (v: Verdict) => void): void
  onHardware(cb: (h: HardwareState) => void): void
  send(cmd: Command): Promise<void>
}
```

Two implementations behind it:

- **`SimulatorTransport`** — wraps the existing `simulator.ts`. Keep it
  permanently: it is how you develop without hardware, how you demo if the
  glasses fail, and how the Settings scenario picker keeps working.
- **`BleTransport`** — scans for the service UUID, connects, subscribes to
  Telemetry, decodes the 20-byte frame, emits typed events.

Decoding is the mirror of the packing:

```ts
function decodeFrame(b: Uint8Array): { frame: SensorFrame; verdict: Verdict } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  return {
    frame: {
      t: dv.getUint32(0, true) * 1000,
      rfDbm: dv.getInt8(9),
      emfMg: dv.getUint8(10) / 10,
      lux: dv.getUint16(11, true),
      wifiCount: dv.getUint8(13),
      bleCount: dv.getUint8(14),
    },
    verdict: {
      score: dv.getUint8(4),
      klass: (['safe', 'caution', 'threat'] as const)[dv.getUint8(5)],
      confidence: dv.getUint8(6) / 100,
      breakdown: {
        camera:  dv.getUint8(7)  / 255,
        tracker: dv.getUint8(8)  / 255,
        rf:      dv.getUint8(9)  / 255,
        emf:     dv.getUint8(10) / 255,
        dark:    dv.getUint8(11) / 255,
      },
      reasons: [],          // re-derived on the phone by fusion.ts
      at: dv.getUint32(0, true) * 1000,
    },
  }
}
```

### 7.3 Changing `store.ts`

`startTelemetry()` becomes transport-driven. Everything downstream is untouched.

```ts
export function startTelemetry(transport: Transport = new SimulatorTransport()) {
  transport.onFrame((f) => {
    const frames = [...get().frames, f].slice(-FRAME_CAP)
    set({ frames })
  })
  transport.onDevices((devices) => set({ devices }))
  transport.onVerdict((verdict) => set({ verdict }))
  transport.onHardware((hw) => set({ hw }))
  transport.start()
  return () => transport.stop()
}
```

**Files that change: two.** `engine/store.ts` and the new `engine/transport.ts`.
Zero screens, zero components. That is the payoff for having kept `engine/`
free of React Native imports.

### 7.4 Reconnection

Do not treat a dropped link as an error state to show the user. Glasses go out of
range constantly. Reconnect with exponential backoff (1 s, 2 s, 4 s… capped at
30 s), keep the last known verdict on screen, and mark it stale after 10 seconds
— the `LiveDot` component already has a `PAUSED` state for exactly this.

---

## 8. The ML pipeline

The rule engine in `fusion.ts` works on its own. The model is an accuracy
refinement, not a replacement — and keeping the rule engine is what lets the app
explain itself.

### 8.1 Collect

Log one CSV row per 30-second window, from the prototype, in real places:

```
timestamp,location_type,num_wifi,num_camera_oui,num_unknown_ap,
avg_rf_dbm,max_rf_dbm,num_ble_trackers,tracker_travel_score,
avg_emf_mg,lux,hour_of_day,label
```

Target ~100 windows across ~10 locations. **Balance matters more than volume.**
Threat situations are rare in the wild, so you must plant them: hide an
ESP32-CAM, carry an iTag. Aim for roughly 50 safe / 30 suspicious / 20 high, and
label at collection time — you will not remember later.

### 8.2 Train

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold

# Group by location so the model is never tested on a room it trained on.
cv = GroupKFold(n_splits=5)
clf = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
```

Two decisions that matter:

- **Group by location, not random split.** Windows from one room are highly
  correlated. A random split leaks, and you will report ~99% accuracy that
  collapses in the demo. `GroupKFold` on location is the honest measure.
- **Keep the trees small.** 50 trees at depth 6 converts to a few KB of C.
  100 trees at unlimited depth will not fit comfortably alongside the Wi-Fi stack.

Prefer **recall on the `high` class** over overall accuracy. Missing a real camera
is far worse than one false alarm, so tune the threshold accordingly and say so.

### 8.3 Convert and deploy

```python
import emlearn
emlearn.convert(clf).save(file='model.h', name='threat_model')
```

`#include "model.h"` and call `threat_model_predict()` from `FusionTask`.

Where the model and the rules disagree, **take the higher score.** A detection
aid should fail loud.

---

## 9. Calibration

Three constants must be measured per unit, not copied from a datasheet.

**RF intercept.** In an RF-quiet room (no Wi-Fi, phones off), record the AD8318
output for 30 s. That mean is your baseline; solve for `VREF_INTERCEPT` against a
known reference such as a 433 MHz remote at a fixed distance.

**EMF zero and scale.** With the coil far from mains wiring, average 100 samples
— that is zero. For scale, a mains adapter at 5 cm reads roughly 5–10 mG on a
reference meter; derive counts-per-milligauss from that. If you cannot borrow a
meter, report EMF in *relative* units and say so in the report rather than
inventing a conversion.

**Ambient RF baseline.** Re-measured automatically at every boot, over 60 s. This
is what makes the RF channel usable in different buildings.

Store all three in NVS. Add a Recalibrate button (GPIO 0) and expose it as
command `0x05`.

---

## 10. Testing and validation

### 10.1 Bench

| Test | Method | Pass |
| --- | --- | --- |
| Camera OUI | ESP32-CAM streaming at 3 m | Detected < 60 s |
| Camera negative | Laptop hotspot, same room | **Not** flagged |
| Tracker travel | iTag carried 15 min | Alert by 10–12 min |
| Tracker negative | iTag stationary on a desk | No alert |
| RF spike | 433 MHz remote at 1 m | > 20 dB above baseline |
| Dark boost | Cover BH1750 | Scan interval halves |
| Battery | Full charge → cutoff | > 2.5 h |

The **negative** tests matter as much as the positives. A detector that flags
everything is not a detector, and an examiner will absolutely try to trigger a
false positive.

### 10.2 Field

Three environments, ten runs each, with a confusion matrix:

| Environment | Expected |
| --- | --- |
| College library | Safe |
| Hostel common room | Suspicious (device density) |
| Planted hotel-style room | High |

### 10.3 Targets

| Metric | Target |
| --- | --- |
| Overall accuracy | > 85% |
| Recall, `high` class | > 90% |
| False positive rate | < 15% |
| Detection latency | < 60 s |
| Battery | > 2.5 h |
| Weight | < 150 g |

---

## 11. Risk register

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| 1 | Promiscuous mode unstable | High | Fall back to AP-scan only; document the reduced mode |
| 2 | Analog sensors read zero once Wi-Fi starts | High | **Use ADC1 pins only** — see §2.2 |
| 3 | RF false positives from own radio | High | 60 s baseline at boot; score deviation, not absolute |
| 4 | MAC randomisation defeats OUI lookup | Medium | Weight behaviour (streaming) as heavily as identity |
| 5 | FindMy key rotation | Medium | Track within 15 min windows; state the limit |
| 6 | Glasses too heavy | Medium | Battery in pocket on a tether for v1 |
| 7 | BLE throughput too low for device list | Medium | Binary frames + MTU 247 + chunking (§6.2) |
| 8 | Too little training data | Medium | Rule engine is the fallback and always runs |
| 9 | Hardware dies before viva | **Critical** | **Keep `SimulatorTransport`.** Demo the full UI with no hardware attached |

Risk 9 is the one to take seriously. Hardware fails at the worst possible moment,
and a working simulator is the difference between a bad afternoon and a failed
project.

---

## Appendix A — Legal and ethical boundaries

- **Passive scanning is fine.** Listening to broadcasts is legal in India.
- **Active port scanning is not, on networks you do not own.** Keep it gated
  behind "Passive only" (default on), and only ever demonstrate it against your
  own ESP32-CAM.
- **Never plant a camera anywhere without written consent.** Your own lab, with
  your guide's permission, documented. Put that statement in the report.
- **The glasses record nothing** — no video, no audio, only radio metadata. Say
  this prominently; it is a genuine design virtue.
- **Logs stay on the device.** No cloud, no account.

## Appendix B — Suggested repository layout

```
firmware/
  src/
    main.cpp
    tasks/          wifi_scan · sniffer · ble_uart · rf · emf · fusion · ui
    fusion/         scoring.cpp · scoring.h · model.h
    ble/            gatt_server.cpp · protocol.h      ← mirrors engine/types.ts
    storage/        oui_table.cpp · event_log.cpp
  data/             oui.bin
nrf52/
  src/main.cpp      BLE observer → UART
ml/
  collect.py · train.py · convert.py
  data/samples.csv
app/                ← this repo
docs/
hardware/
  schematic/ · pcb/ · enclosure/
```

Keep `firmware/src/ble/protocol.h` and `app/engine/types.ts` in sync by hand and
review them together. They are one contract expressed in two languages, and every
integration bug you will have lives in the gap between them.
