/* Port of src/components/Icon.tsx — same 24×24 geometry, same paths. */

import Svg, { Path } from 'react-native-svg'
import { C } from '@/lib/colors'

export type IconName =
  | 'shield' | 'aperture' | 'waves' | 'clock' | 'sliders'
  | 'chevron-right' | 'chevron-down' | 'arrow-left' | 'arrow-up-right' | 'close'
  | 'camera' | 'tag' | 'wifi' | 'bluetooth' | 'radio' | 'bolt' | 'moon' | 'sun'
  | 'search' | 'check' | 'alert' | 'battery' | 'cpu' | 'eye' | 'eye-off'
  | 'share' | 'download' | 'trash' | 'lock' | 'pin' | 'play' | 'pause'
  | 'bell' | 'info' | 'target' | 'scan' | 'glasses' | 'plus' | 'minus'
  | 'refresh' | 'link' | 'thermometer' | 'flag'

const P: Record<IconName, string> = {
  shield: 'M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z',
  aperture: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3v7M20.2 16.5 13.5 13M3.8 16.5l6.7-3.5M4 7l7 4M20 7l-7 4M8 21l3.5-6.8',
  waves: 'M3 8c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3 2.5-3 3-3M3 16c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3 2.5-3 3-3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 6v0M10 12v0M18 18v0',
  'chevron-right': 'm9 5 7 7-7 7',
  'chevron-down': 'm5 9 7 7 7-7',
  'arrow-left': 'M20 12H4m0 0 6-6m-6 6 6 6',
  'arrow-up-right': 'M7 17 17 7m0 0H8m9 0v9',
  close: 'M6 6l12 12M18 6 6 18',
  camera: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.8 3.7h4.4a1 1 0 0 1 .83.45l.94 1.4A1 1 0 0 0 16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8ZM12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  tag: 'M3.5 11.3V4.8a1.3 1.3 0 0 1 1.3-1.3h6.5a1.3 1.3 0 0 1 .92.38l8 8a1.3 1.3 0 0 1 0 1.84l-6.5 6.5a1.3 1.3 0 0 1-1.84 0l-8-8a1.3 1.3 0 0 1-.38-.92ZM7.8 7.8v0',
  wifi: 'M2.5 9a15 15 0 0 1 19 0M6 12.7a10 10 0 0 1 12 0M9.4 16.4a5 5 0 0 1 5.2 0M12 20v0',
  bluetooth: 'm7 7 10 10-5 4V3l5 4L7 17',
  radio: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2',
  bolt: 'M13 2 4.5 13.2a.6.6 0 0 0 .48.96H11l-1 7.84 8.5-11.2a.6.6 0 0 0-.48-.96H12l1-7.84Z',
  moon: 'M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2 12h2M20 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l5 5',
  check: 'm4.5 12.5 5 5 10-11',
  alert: 'M12 8.5v5M12 17v0M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.73-3L13.7 3.9a2 2 0 0 0-3.46 0Z',
  battery: 'M2 8.5A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5v-7ZM21 10.5v3',
  cpu: 'M7 7h10v10H7zM4.5 9.5V9M4.5 14.5v.5M19.5 9.5V9M19.5 14.5v.5M9.5 4.5H9M14.5 4.5h.5M9.5 19.5H9M14.5 19.5h.5M4 9h3M4 15h3M17 9h3M17 15h3M9 4v3M15 4v3M9 17v3M15 17v3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M4 4l16 16M9.9 5.9A9.6 9.6 0 0 1 12 5.7c6 0 9.5 6.3 9.5 6.3a17 17 0 0 1-3.3 4M6.3 8A17 17 0 0 0 2.5 12s3.5 6.3 9.5 6.3a9.7 9.7 0 0 0 3.5-.65M9.9 9.9a3 3 0 0 0 4.2 4.2',
  share: 'M12 15V3m0 0L8 7m4-4 4 4M4 14v4.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15',
  trash: 'M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.8 12.1A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.9L17.5 7M10 11v6M14 11v6',
  lock: 'M6 10.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 10.5V7.5a4 4 0 1 1 8 0v3',
  pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  play: 'M7 4.8v14.4a.6.6 0 0 0 .92.5l11.3-7.2a.6.6 0 0 0 0-1L7.92 4.3a.6.6 0 0 0-.92.5Z',
  pause: 'M8 4.5h2.5v15H8zM13.5 4.5H16v15h-2.5z',
  bell: 'M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5ZM9.5 19a2.5 2.5 0 0 0 5 0',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.6v0',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 13.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  scan: 'M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5M3.5 12h17',
  glasses: 'M2.5 9.5h6a1.5 1.5 0 0 1 1.5 1.5v2a3 3 0 0 1-6 0v-2M15.5 9.5h6v3.5a3 3 0 0 1-6 0v-2a1.5 1.5 0 0 1 1.5-1.5M10 12.5h4M2.5 9.5 4 6.5M21.5 9.5 20 6.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  refresh: 'M20 11.5A8 8 0 1 0 18.4 17M20 5.5V12h-6.5',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4',
  thermometer: 'M14 14.8V5.5a2 2 0 1 0-4 0v9.3a4 4 0 1 0 4 0ZM12 18v0',
  flag: 'M5 21V4M5 5h11l-2 3.5L16 12H5',
}

export function Icon({
  name,
  size = 20,
  color = C.ink,
  strokeWidth = 1.6,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={P[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
