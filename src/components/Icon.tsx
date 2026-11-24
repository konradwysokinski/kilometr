import type { SVGProps } from 'react';

/** Thin-stroke icons, 16×16 grid, as in the designs. */
const PATHS = {
  overview: (
    <>
      <rect x="2" y="2" width="5" height="5" rx="1.5" />
      <rect x="9" y="2" width="5" height="5" rx="1.5" />
      <rect x="2" y="9" width="5" height="5" rx="1.5" />
      <rect x="9" y="9" width="5" height="5" rx="1.5" />
    </>
  ),
  // Running shoe on its toes: heel up, sole band on the left, laces on the instep.
  shoe: (
    <g transform="scale(.92) translate(.7 .5)">
      <path d="M1.2 5.4C1 4.4 1.4 3.7 2.2 3.4l1.4-.6 2.3-1.8c.3-.2.7-.1.8.2l.6 2.6 1.5-1.5c.2-.2.5-.3.8-.3h.9c.3 0 .6.2.7.5l1.4 5C12.3 9.6 13.2 10.8 14.6 11.6c.9.5 1 1.8.1 2.4-.5.4-1.2.6-2 .6H9.8C7.4 14.6 5.6 13 4.8 11L3.4 8.3C2.6 7.4 1.6 6.6 1.2 5.4z" />
      <path d="M4.1 2.9C4.9 5.6 6 9.4 7.6 11.2 9 12.8 11.5 13.2 15 13.2" />
      <path d="M8.9 5.8h2.3M9.5 7.9h2.3" />
    </g>
  ),
  bike: (
    <>
      <circle cx="4" cy="11" r="2.75" />
      <circle cx="12" cy="11" r="2.75" />
      <path d="M4 11l2.5-5.5h3.5L12 11M6.5 5.5L8.5 11" />
    </>
  ),
  activity: <path d="M1.5 8h3l1.5-4 3 8 1.5-4h4" />,
  archive: (
    <>
      <rect x="2" y="3" width="12" height="3" rx="1" />
      <path d="M3 6v7h10V6M6.5 9h3" />
    </>
  ),
  moon: <path d="M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1z" />,
  settings: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </>
  ),
  upload: <path d="M8 10.3V2.9M5.1 5.7 8 2.9l2.9 2.8M2.9 10.3v2.3h10.2v-2.3" />,
  camera: (
    <>
      <path d="M2 5.6c0-.8.5-1.3 1.3-1.3h1.8L6.1 3h3.8l1 1.3h1.8c.8 0 1.3.5 1.3 1.3V12c0 .8-.5 1.3-1.3 1.3H3.3c-.8 0-1.3-.5-1.3-1.3z" />
      <circle cx="8" cy="8.7" r="2.3" />
    </>
  ),
  globe: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.7 1.8 2.5 3.8 2.5 6S9.7 12.2 8 14M8 2C6.3 3.8 5.5 5.8 5.5 8s.8 4.2 2.5 6" />
    </>
  ),
  bell: (
    <>
      <path d="M4 11.5V7.2a4 4 0 0 1 8 0v4.3l1 1H3z" />
      <path d="M6.6 13.8a1.5 1.5 0 0 0 2.8 0" />
    </>
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  refresh: <path d="M13 3.5v3h-3M3 12.5v-3h3M12.6 6.5A5 5 0 0 0 3.8 5M3.4 9.5a5 5 0 0 0 8.8 1.5" />,
  chevronLeft: <path d="M10 3.5 5.5 8l4.5 4.5" />,
  chevronRight: <path d="M6 3.5 10.5 8 6 12.5" />,
  chevronUpDown: <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />,
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 17, strokeWidth = 1.3, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
