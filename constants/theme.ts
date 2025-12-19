import { Platform } from 'react-native';

// HSL to Hex conversion helper
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Theme colors matching global.css CSS variables
export const Colors = {
  light: {
    background: hslToHex(0, 0, 100), // #ffffff
    foreground: hslToHex(222.2, 84, 4.9), // #020817
    card: hslToHex(0, 0, 100),
    cardForeground: hslToHex(222.2, 84, 4.9),
    popover: hslToHex(0, 0, 100),
    popoverForeground: hslToHex(222.2, 84, 4.9),
    primary: hslToHex(221.2, 83.2, 53.3), // #3b82f6
    primaryForeground: hslToHex(210, 40, 98),
    secondary: hslToHex(210, 40, 96.1),
    secondaryForeground: hslToHex(222.2, 47.4, 11.2),
    muted: hslToHex(210, 40, 96.1),
    mutedForeground: hslToHex(215.4, 16.3, 46.9),
    accent: hslToHex(210, 40, 96.1),
    accentForeground: hslToHex(222.2, 47.4, 11.2),
    destructive: hslToHex(0, 84.2, 60.2),
    destructiveForeground: hslToHex(210, 40, 98),
    border: hslToHex(214.3, 31.8, 91.4),
    input: hslToHex(214.3, 31.8, 91.4),
    ring: hslToHex(221.2, 83.2, 53.3),
    // Legacy support
    text: hslToHex(222.2, 84, 4.9),
    tint: hslToHex(221.2, 83.2, 53.3),
    icon: hslToHex(215.4, 16.3, 46.9),
    tabIconDefault: hslToHex(215.4, 16.3, 46.9),
    tabIconSelected: hslToHex(221.2, 83.2, 53.3),
  },
  dark: {
    background: hslToHex(222.2, 84, 4.9), // #020817
    foreground: hslToHex(210, 40, 98), // #f8fafc
    card: hslToHex(222.2, 84, 4.9),
    cardForeground: hslToHex(210, 40, 98),
    popover: hslToHex(222.2, 84, 4.9),
    popoverForeground: hslToHex(210, 40, 98),
    primary: hslToHex(217.2, 91.2, 59.8), // #60a5fa
    primaryForeground: hslToHex(222.2, 47.4, 11.2),
    secondary: hslToHex(217.2, 32.6, 17.5),
    secondaryForeground: hslToHex(210, 40, 98),
    muted: hslToHex(217.2, 32.6, 17.5),
    mutedForeground: hslToHex(215, 20.2, 65.1),
    accent: hslToHex(217.2, 32.6, 17.5),
    accentForeground: hslToHex(210, 40, 98),
    destructive: hslToHex(0, 62.8, 30.6),
    destructiveForeground: hslToHex(210, 40, 98),
    border: hslToHex(217.2, 32.6, 17.5),
    input: hslToHex(217.2, 32.6, 17.5),
    ring: hslToHex(224.3, 76.3, 48),
    // Legacy support
    text: hslToHex(210, 40, 98),
    tint: hslToHex(217.2, 91.2, 59.8),
    icon: hslToHex(215, 20.2, 65.1),
    tabIconDefault: hslToHex(215, 20.2, 65.1),
    tabIconSelected: hslToHex(217.2, 91.2, 59.8),
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
