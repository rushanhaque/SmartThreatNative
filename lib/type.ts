import { StyleSheet } from 'react-native'
import { C } from './colors'

/* Font family keys registered in app/_layout.tsx. Mirrors the web's
   --font-sans (Instrument Sans) and --font-mono (JetBrains Mono). */
export const F = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
} as const

export const T = StyleSheet.create({
  /* @utility micro — the instrument's voice */
  micro: {
    fontFamily: F.monoMedium,
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: 1.52,
    textTransform: 'uppercase',
    color: C.ink3,
  },
  /* @utility readout — tabular mono numerals */
  readout: {
    fontFamily: F.mono,
    letterSpacing: -0.02,
    color: C.ink,
  },
  readoutSemi: {
    fontFamily: F.monoSemi,
    letterSpacing: -0.02,
    color: C.ink,
  },
  /* @utility display-3 */
  display3: {
    fontFamily: F.semibold,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1.05,
    color: C.ink,
  },
  body: {
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: -0.165,
    color: C.ink,
  },
})
