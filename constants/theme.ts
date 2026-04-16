import { Platform } from 'react-native';

// Theme from next-app/globals.css — OKLCH neutral/monochrome (b2fA preset)
// Converted from oklch(L 0 0) to hex

export const Colors = {
  light: {
    background: '#ffffff',         // oklch(1 0 0)
    foreground: '#252525',         // oklch(0.145 0 0)
    card: '#ffffff',               // oklch(1 0 0)
    cardForeground: '#252525',     // oklch(0.145 0 0)
    popover: '#ffffff',
    popoverForeground: '#252525',
    primary: '#343434',            // oklch(0.205 0 0)
    primaryForeground: '#fbfbfb',  // oklch(0.985 0 0)
    secondary: '#f7f7f7',          // oklch(0.97 0 0)
    secondaryForeground: '#343434',// oklch(0.205 0 0)
    muted: '#f7f7f7',             // oklch(0.97 0 0)
    mutedForeground: '#8e8e8e',   // oklch(0.556 0 0)
    accent: '#f7f7f7',            // oklch(0.97 0 0)
    accentForeground: '#343434',  // oklch(0.205 0 0)
    destructive: '#e5484d',        // oklch(0.577 0.245 27.325) ≈ red
    destructiveForeground: '#fbfbfb',
    border: '#ebebeb',            // oklch(0.922 0 0)
    input: '#ebebeb',             // oklch(0.922 0 0)
    ring: '#b5b5b5',              // oklch(0.708 0 0)
    // Charts
    chart1: '#dedede',
    chart2: '#8e8e8e',
    chart3: '#707070',
    chart4: '#5f5f5f',
    chart5: '#454545',
    // Legacy
    text: '#252525',
    tint: '#343434',
    icon: '#8e8e8e',
    tabIconDefault: '#b5b5b5',
    tabIconSelected: '#252525',
  },
  dark: {
    background: '#252525',         // oklch(0.145 0 0)
    foreground: '#fbfbfb',         // oklch(0.985 0 0)
    card: '#343434',               // oklch(0.205 0 0)
    cardForeground: '#fbfbfb',     // oklch(0.985 0 0)
    popover: '#343434',
    popoverForeground: '#fbfbfb',
    primary: '#ebebeb',            // oklch(0.922 0 0)
    primaryForeground: '#343434',  // oklch(0.205 0 0)
    secondary: '#454545',          // oklch(0.269 0 0)
    secondaryForeground: '#fbfbfb',// oklch(0.985 0 0)
    muted: '#454545',             // oklch(0.269 0 0)
    mutedForeground: '#b5b5b5',   // oklch(0.708 0 0)
    accent: '#454545',            // oklch(0.269 0 0)
    accentForeground: '#fbfbfb',  // oklch(0.985 0 0)
    destructive: '#c4504a',        // oklch(0.704 0.191 22.216) ≈ muted red
    destructiveForeground: '#fbfbfb',
    border: '#2e2e2e',            // oklch(1 0 0 / 10%) on dark
    input: '#383838',             // oklch(1 0 0 / 15%) on dark
    ring: '#8e8e8e',              // oklch(0.556 0 0)
    // Charts
    chart1: '#dedede',
    chart2: '#8e8e8e',
    chart3: '#707070',
    chart4: '#5f5f5f',
    chart5: '#454545',
    // Legacy
    text: '#fbfbfb',
    tint: '#ebebeb',
    icon: '#b5b5b5',
    tabIconDefault: '#8e8e8e',
    tabIconSelected: '#fbfbfb',
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
    sans: "Geist, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "Geist Mono, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
