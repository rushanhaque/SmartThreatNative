# SmartThreat — Companion App

React Native companion for **PG-1**, a wearable that watches the radio spectrum for
surveillance devices — hidden cameras, BLE trackers, and RF bugs — and tells you
*why* it reached its conclusion.

Built with Expo SDK 54, Expo Router 6, and React Native Reanimated 4.

---

## Design

**Spot Ink** — a flat, high-contrast light theme built like a risograph print.

There are no gradients in this app. A stone-paper ground, pure-white cards, and
a handful of saturated spot inks that are never blended into one another. Depth
comes from hairlines, flat tint blocks and one honest shadow — the way print
does it. Colour carries meaning, so if two things look different, they are.

| Role | Colour |
| --- | --- |
| Ground | `#ECECE4` stone paper |
| Card | `#FFFFFF` |
| Ink | `#14140E` near-black, green cast |
| Safe | `#0B7A5A` deep jade |
| Caution | `#C67100` burnt amber (takes dark text, not white) |
| Threat | `#D62F1C` vermillion |
| Brand | `#1F23C9` Klein blue |

Threat state is carried by a React context (`<Tone>`) rather than a CSS cascade —
wrapping a subtree re-themes every accent inside it. Each tone resolves to a
single ink plus the text colour that belongs on it, which is why amber pairs
with dark text where jade and vermillion pair with white.

## Motion

GSAP is a DOM library and cannot animate native views. Every animation here is a
**Reanimated worklet running on the UI thread**, so the telemetry loop can re-fuse
240 frames of sensor data in JS without dropping a frame.

`components/motion.tsx` provides the vocabulary:

- `Reveal` / `Stagger` — entrance sequences
- `ScrollReveal` — true scroll-trigger, mirroring ScrollTrigger's `top 88%`
- `Parallax` — depth, fade and shrink bound to scroll offset
- `Pressable3D` — spring scale + depth on touch
- `Counter` — odometer for numeric readouts
- `Shimmer`, `Float`, `Pulse` — ambient life

## Screens

| Route | Purpose |
| --- | --- |
| `(tabs)/index` | Aperture score, evidence chain, fusion breakdown, live sensors |
| `(tabs)/devices` | Radio census — list and proximity field, search, filters |
| `(tabs)/history` | 24 h threat ribbon, saved scans, incidents |
| `(tabs)/settings` | Paired hardware, alert channels, sensitivity, scenarios |
| `device/[id]` | Per-device RSSI history, evidence, trust controls |
| `sensors` | Gauges, modelled band occupancy, full sensor traces |

## Architecture

```
app/            expo-router file tree
components/     Glass, motion, viz, ApertureRing, TabBar, Icon, Brand, ui
engine/         types · fusion · simulator · store   (pure TS, no RN imports)
lib/            colors · type · format · device
```

The `engine/` layer is portable TypeScript with no React Native dependencies —
it is shared verbatim with the web build. `fusion.ts` implements the weighted
multi-channel scoring; `simulator.ts` drives demo telemetry at 500 ms cadence.

### Honesty in the visualisation

- The proximity field derives **radius** from RSSI but the **bearing is hashed
  from the MAC** — a single antenna cannot resolve direction. The rings are
  labelled in metres; the angle deliberately is not.
- Band occupancy on the sensors screen is **modelled from the radio census**, not
  measured — the hardware has no per-band receiver. It is labelled as such.

## Running

```bash
npm install
npx expo start
```

Scan the QR with Expo Go, or press `w` for the browser.

> Pinned to **Expo SDK 54**. Run `npx expo install --check` after adding packages.

## Disclaimer

PG-1 is a detection aid built as a final-year engineering project. It does not
guarantee that a space is free of surveillance.
