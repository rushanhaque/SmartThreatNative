# Smart Threat Detection Glasses — Quick Start Guide

**The short version: what to build, in what order, and how you know each step worked.**

Read this first. The companion document, [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md),
has the wiring diagrams, protocol specs and code for everything summarised here.

---

## 1. What this project actually is

A pair of ordinary-looking glasses that continuously listens to the radio
environment around you and tells you whether you are being watched.

It watches five channels at once:

| Channel | Sensor | What it catches |
| --- | --- | --- |
| Wi-Fi | ESP32-S3 radio | Hidden cameras (vendor + streaming behaviour) |
| Bluetooth | nRF52840 | AirTags and trackers following you |
| RF power | AD8318 | Transmitting bugs across 1 MHz – 6.5 GHz |
| EM field | Coil + LM358 | Active transmitters very close by |
| Ambient light | BH1750 | Dark rooms, where night-vision cameras work best |

**The core idea — and the thing to say in your viva:** any one of these signals
alone is noise. A Wi-Fi device is not a camera. A dark room is not a threat. The
value is in *fusing* them: a camera is a Wi-Fi device, with a camera vendor
prefix, that streams continuously, in a dark corner. That combination is rare
and specific. Fusing is what makes the false-positive rate tolerable.

## 2. What you have right now

You have the **companion app**, finished and working — but it is fed by a
simulator, not by real hardware.

```
engine/simulator.ts   ← invents fake devices and sensor readings
engine/fusion.ts      ← the real scoring maths (already correct)
engine/store.ts       ← holds state, runs a 1 Hz loop
app/                  ← all four screens (real, finished)
```

The good news: `engine/` is plain TypeScript with no React Native imports, and
`fusion.ts` is already a faithful port of the C++ scoring kernel that will run on
the glasses. **You are not rewriting the app. You are replacing one file's worth
of data source.** That swap point is `startTelemetry()` in `engine/store.ts`.

## 3. The eight stages

Each stage has a **goal**, an **action**, and a **proof** — do not move on until
you have the proof.

### Stage 1 — Get one sensor talking (Week 3)

- **Goal:** ESP32-S3 lists Wi-Fi networks over USB serial.
- **Action:** Install Arduino IDE + ESP32 board package. Run the stock `WiFiScan`
  example.
- **Proof:** Your hostel Wi-Fi appears in the Serial Monitor with a MAC and RSSI.

### Stage 2 — Detect a fake hidden camera (Week 4)

- **Goal:** Prove the camera heuristic works.
- **Action:** Flash an ESP32-CAM as a streaming webserver and hide it in a box.
  Add a hardcoded list of ~50 camera vendor prefixes (OUIs) to your scanner.
- **Proof:** Your scanner prints `CAMERA SUSPECTED` when the ESP32-CAM is on, and
  stops when you unplug it.

### Stage 3 — Detect a tracker (Weeks 5–6)

- **Goal:** Spot a BLE tracker that is following you.
- **Action:** Scan BLE, filter for Apple manufacturer data `0x004C`. Log each
  sighting with a timestamp. Alert if the same tag is seen repeatedly for
  10+ minutes.
- **Proof:** Give an iTag to a friend, walk across campus for 15 minutes, and the
  alert fires.

### Stage 4 — Add the analog sensors (Weeks 7–10)

- **Goal:** RF power and EM field readings that mean something.
- **Action:** Wire the AD8318 and the EMF coil. **Use ADC1 pins only** (GPIO 1–10)
  — ADC2 stops working the moment Wi-Fi turns on. Calibrate by recording a
  baseline in a quiet room.
- **Proof:** Keying a 433 MHz remote or a walkie-talkie makes the RF number jump
  well above your baseline, and it returns when you stop.

### Stage 5 — Score it (Weeks 11–14)

- **Goal:** One number, 0–100, and a colour.
- **Action:** Port the scoring formula to C++ on the ESP32. It is already written
  in TypeScript in `engine/fusion.ts` — copy the weights and thresholds exactly
  so the app and the glasses always agree.

  ```
  score = (0.35·camera + 0.30·tracker + 0.20·rf + 0.10·emf) × darkMultiplier × 100
  Safe 0–35   ·   Suspicious 36–70   ·   High 71–100
  ```

- **Proof:** Walking from a quiet corridor into your planted room moves the number
  from green to red.

### Stage 6 — Send it to the phone (Weeks 15–18)

**This is the stage that connects your app to reality.** See §4 below.

- **Goal:** The glasses broadcast their readings over Bluetooth; the app receives
  them.
- **Action:** Add a BLE GATT service to the ESP32. Add `react-native-ble-plx` to
  the app and write `engine/transport.ts`.
- **Proof:** The app's Shield screen shows a number that changes when you cover
  the light sensor with your thumb.

### Stage 7 — Put it on your face (Weeks 15–18, parallel)

- **Goal:** Wearable, under 150 g.
- **Action:** Safety-glasses frame + 3D printed temple housings. **Keep the
  battery in your pocket on a wire for the prototype** — this is what Oculus did
  early on, and it saves you the entire weight problem.
- **Proof:** Someone wears it for 10 minutes without complaining.

### Stage 8 — Train the model (Weeks 11–14, parallel)

- **Goal:** Replace hand-tuned weights with a trained classifier.
- **Action:** Log 100 CSV samples across ~10 real locations. Train a
  RandomForest in Python. Convert to C with `emlearn`.
- **Proof:** Confusion matrix above 85% on locations you did not train on.

## 4. How the app connects to the glasses

This is the one part worth understanding properly, because it is where most
student projects get stuck.

**Today** the app's data loop looks like this:

```
simulator.ts  →  store.ts (tick every 1s)  →  fusion.ts  →  screens
```

**In the real product** it looks like this:

```
glasses sensors → ESP32 fusion → BLE notify → transport.ts → store.ts → screens
```

Notice that `store.ts` and everything to its right is **unchanged**. The screens
never learn where the data came from.

To make the swap you write one new file, `engine/transport.ts`, that defines a
data source and provides two implementations:

```ts
export interface Transport {
  start(): Promise<void>
  stop(): void
  onFrame(cb: (f: SensorFrame) => void): void      // 2 Hz sensor readings
  onDevices(cb: (d: Device[]) => void): void       // Wi-Fi + BLE census
  onVerdict(cb: (v: Verdict) => void): void        // the glasses' own score
}
```

- `SimulatorTransport` — wraps what `simulator.ts` already does. Keep it. It is
  how you demo without hardware, and how you develop on a laptop.
- `BleTransport` — talks to the glasses.

A switch in Settings flips between them. **Keep the simulator forever** — if the
glasses break the night before your viva, you can still demo.

> ⚠️ **BLE does not work in Expo Go.** `react-native-ble-plx` needs native code,
> so you must build a development client (`npx expo prebuild` then
> `npx expo run:android`). Budget a day for this the first time.

## 5. Wiring cheat sheet

| Part | Connects by | ESP32-S3 pins |
| --- | --- | --- |
| BH1750 light | I²C | SDA 8, SCL 9 |
| OLED display | I²C (same bus) | SDA 8, SCL 9 |
| AD8318 RF | Analog | **GPIO 4 (ADC1)** |
| EMF coil amp | Analog | **GPIO 5 (ADC1)** |
| nRF52840 | UART | TX 17, RX 18 |
| Vibration motor | Digital + transistor | GPIO 12 |
| Buzzer | Digital | GPIO 13 |

Everything runs at 3.3 V. The vibration motor needs a transistor and a flyback
diode — do not drive it from a GPIO pin directly, you will kill the pin.

## 6. Two corrections to the proposal

Worth fixing now rather than discovering in week 20.

**1. The ESP32-S3 cannot scan 5 GHz Wi-Fi.** It is a 2.4 GHz-only radio. Your
objectives say "Wi-Fi (2.4GHz/5GHz)". Either drop 5 GHz from the scope, or add a
second radio module for it. Most cheap hidden cameras are 2.4 GHz, so **dropping
it is the honest and defensible choice** — say so explicitly in your report and
your examiner will respect it.

**2. Check the Tile identifier.** The proposal lists Tile as company ID `0x00E0`.
`0x00E0` is Google's assigned ID; Tile's is `0x0157`, and Tile tags are usually
found by their service UUID `0xFEED`/`0xFEEC` rather than manufacturer data. Verify
against the Bluetooth SIG registry before you rely on it, or your scanner will
silently miss every Tile.

## 7. What to buy first

Order these in week 1 and you can start Stage 1 immediately (~₹4,000):

- ESP32-S3-DevKitC-1 N16R8
- XIAO nRF52840
- 2 × ESP32-CAM (your fake hidden cameras — you cannot test without these)
- 1 × iTag BLE tracker

Everything else can wait until you have the first stage working.

## 8. Honest limits to state up front

Put these in your report. Naming your limits reads as competence, not weakness.

- **Cannot detect an offline camera** that records to an SD card and never
  transmits. Nothing radio-based can. The IR lens-reflection trick is your only
  answer, and it is manual.
- **Cannot detect wired cameras.** No radio emission, no detection.
- **AirTag identifiers rotate every 15 minutes**, so you can only correlate a tag
  across a short window. Say so.
- **This is an aid, not a guarantee.** The app must say so, and you must say so.
