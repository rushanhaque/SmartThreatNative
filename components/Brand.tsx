/* Aperture mark — one flat ink, no gradient fill. */

import Svg, { Circle, Line, G } from 'react-native-svg'
import { C } from '@/lib/colors'

/* Blade endpoints are trigonometry rather than SVG `rotation`/`origin` props:
   react-native-svg's web shim forwards those as a `transform-origin` DOM
   attribute, which React rejects. Same geometry, no console noise. */
const R = 9.4
const BLADES = [0, 60, 120, 180, 240, 300].map((deg) => {
  const a = (deg * Math.PI) / 180
  return { deg, x2: 14 + Math.sin(a) * R, y2: 14 - Math.cos(a) * R }
})

export function Logomark({ size = 28, active = false }: { size?: number; active?: boolean }) {
  const stroke = active ? C.indigo : C.ink2
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle
        cx="14"
        cy="14"
        r="11.6"
        stroke={stroke}
        strokeWidth="1.8"
        opacity={active ? 1 : 0.4}
        fill="none"
      />
      <G stroke={stroke} strokeWidth="1.9" strokeLinecap="butt">
        {BLADES.map((b) => (
          <Line
            key={b.deg}
            x1="14"
            y1="14"
            x2={b.x2}
            y2={b.y2}
            strokeDasharray={[5.4, 20]}
            strokeDashoffset={-3.4}
          />
        ))}
      </G>
      <Circle cx="14" cy="14" r="3.1" stroke={stroke} strokeWidth="1.8" opacity={0.95} fill="none" />
    </Svg>
  )
}
