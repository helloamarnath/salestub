# CLAUDE.md — salestub (Mobile App)

## Overview

React Native **mobile app** for **SalesTub CRM** — iOS & Android app for sales teams to manage leads, contacts (customers/organizations), activities, invoices, products, quotes, WhatsApp conversations, field visits, and subscription/billing on the go.

Part of a monorepo with: `crm-backend` (API), `crm-admin` (admin portal), `crm-user` (user portal).

**Backend API:** `http://localhost:3000/api/v1` (development)

**CRITICAL: All screens MUST support both iOS and Android platforms.**

## Tech Stack

- **Framework:** React Native 0.81.5 with Expo SDK 54 (New Architecture enabled, React Compiler experiment on)
- **Router:** Expo Router 6 (file-based routing, typed routes)
- **UI:** NativeWind 4 + Tailwind CSS 3 (hsl CSS-variable theme tokens, dark mode via class)
- **Tabs:** iOS uses `expo-router/unstable-native-tabs` (NativeTabs / liquid glass + SF Symbols); Android uses standard `<Tabs>` from expo-router with Ionicons
- **State:** React Context API (auth, notifications, theme)
- **Auth:** expo-secure-store for token storage (Bearer tokens); token refresh + logout callbacks wired via `setAuthCallbacks`
- **Payments:** react-native-razorpay
- **Push:** Firebase Cloud Messaging via `@react-native-firebase/app` + `@react-native-firebase/auth` + expo-notifications
- **Location:** expo-location + expo-task-manager (background visit tracking)
- **Icons:** `@expo/vector-icons` (Ionicons), `expo-symbols` (SF Symbols on iOS)
- **Other:** @gorhom/bottom-sheet, expo-image-picker, expo-document-picker, expo-file-system, expo-clipboard, expo-haptics, react-native-mmkv, react-native-reanimated 4, react-native-big-calendar

## Commands

```bash
npm install

# Development (scripts from package.json)
npm run start                  # expo start
npm run ios                    # expo run:ios (local build + iOS simulator)
npm run android                # expo run:android (local build + Android emulator)
npm run web                    # expo start --web
npm run lint                   # expo lint

# Raw expo (all valid)
npx expo start                 # Start dev server
npx expo start --ios           # iOS simulator
npx expo start --android       # Android emulator
npx expo start -c              # Clear Metro cache and start

# Build (EAS — profiles: development, preview, production — see eas.json)
eas build --profile development --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## App Structure

```
app/
├── _layout.tsx                # Root layout (SafeAreaProvider > AuthProvider > ThemeProvider > NotificationProvider > Stack)
├── index.tsx                  # Entry / home dashboard screen
│
├── (auth)/                    # Auth group (unauthenticated)
│   ├── _layout.tsx            # Stack navigator
│   └── login.tsx              # Login screen
│
├── (tabs)/                    # Tab group (authenticated) — 5 tabs
│   ├── _layout.tsx            # NativeTabs on iOS, Tabs+Ionicons on Android
│   ├── index.tsx              # Home / Dashboard tab
│   ├── whatsapp/              # WhatsApp tab
│   │   ├── _layout.tsx
│   │   └── index.tsx          # Conversations list
│   ├── leads/                 # Leads tab
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Lead list
│   │   └── create.tsx         # Create lead
│   ├── contacts/              # Contacts tab
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Contact list
│   │   ├── customer/create.tsx       # Create customer
│   │   └── organization/create.tsx   # Create organization
│   └── more.tsx               # More menu
│
│  # --- Detail / CRUD stack screens ---
├── leads/
│   ├── _layout.tsx
│   ├── [id].tsx               # Lead detail
│   └── analytics.tsx          # Lead analytics
├── contacts/
│   ├── _layout.tsx
│   ├── analytics.tsx          # Customer analytics
│   ├── organization-analytics.tsx    # Organization analytics
│   ├── customer/[id].tsx      # Customer detail
│   └── organization/[id].tsx  # Organization detail
├── activities/
│   ├── _layout.tsx
│   ├── index.tsx              # Activity list
│   ├── [id].tsx               # Activity detail
│   └── create.tsx             # Create activity
├── invoices/
│   ├── _layout.tsx
│   ├── index.tsx              # Invoice list
│   ├── [id].tsx               # Invoice detail
│   └── create.tsx             # Create invoice
├── products/
│   ├── _layout.tsx
│   ├── index.tsx              # Product list
│   ├── [id].tsx               # Product detail
│   ├── create.tsx             # Create product
│   ├── categories.tsx         # Product categories
│   └── import.tsx             # Bulk product import
├── quotes/                    # Quote list & create (stack, not a tab)
│   ├── _layout.tsx
│   ├── index.tsx              # Quote list
│   └── create.tsx             # Create quote
├── quotes-detail/
│   ├── _layout.tsx
│   └── [id].tsx               # Quote detail
├── whatsapp/                  # WhatsApp stack screens (outside the tab)
│   ├── _layout.tsx
│   ├── [id].tsx               # Conversation view
│   ├── details/[id].tsx       # Contact/conversation details
│   ├── settings.tsx           # WhatsApp settings
│   └── templates.tsx          # Message templates
├── profile/
│   ├── _layout.tsx
│   └── index.tsx              # User profile
├── subscription/
│   ├── _layout.tsx
│   └── billing.tsx            # Plans, billing, manage subscription
│
│  # --- Standalone screens ---
├── gallery.tsx                # Org-wide file gallery (uses OrgFile API)
├── notifications.tsx          # In-app notifications
├── notification-settings.tsx  # Notification preferences
├── export-import.tsx          # Data export/import
└── modal.tsx                  # Modal screen
```

> No `deals/` route exists on mobile — deal CRUD lives in the web portals only.

## Project Structure

```
salestub/
├── app/                       # Screens (see above)
├── components/
│   ├── ui/                    # Local UI primitives — ScreenLoader, collapsible,
│   │                          #   icon-symbol (iOS SF + Android fallback),
│   │                          #   keyboard-screen. (Folders button/, text/, input/,
│   │                          #   gluestack-ui-provider/ exist but are currently empty —
│   │                          #   no Gluestack dependency is installed.)
│   ├── dashboard/             # ActivityFeed, InvoicingTile, LifecycleCard, OverdueBanner,
│   │                          #   PerformanceTile, PipelineProgress, QuickActions,
│   │                          #   RevenueChart, StatCard, TodaysAgenda
│   ├── leads/                 # LeadCard, LeadStatusBadge
│   ├── quotes/                # QuoteItemEditor
│   ├── filters/               # ContactFilterModal, LeadFilterModal
│   ├── export/                # ExportFilterModal
│   ├── visits/                # ActiveVisitBanner, StartVisitSheet, VisitCard,
│   │                          #   VisitPhotoCapture, VisitStatusBadge
│   ├── whatsapp/              # Composer, ConversationCard, MessageBubble
│   ├── AccessDenied.tsx       # RBAC fallback
│   ├── UpgradeCard.tsx        # Subscription upsell card
│   └── (themed-text, themed-view, haptic-tab, parallax-scroll-view, external-link, hello-wave)
├── contexts/
│   ├── auth-context.tsx       # Auth state, token storage, refresh, AppState rehydrate
│   ├── notification-context.tsx # FCM + expo-notifications wiring
│   └── theme-context.tsx      # Theme (system/light/dark)
├── lib/
│   ├── api/                   # API clients — Bearer auth via lib/api/client.ts
│   │   ├── client.ts          # apiRequest + api.{get,post,put,patch,delete} + uploadFile
│   │   ├── activities.ts
│   │   ├── companies.ts
│   │   ├── contacts.ts
│   │   ├── dashboard.ts
│   │   ├── gallery.ts         # OrgFile gallery
│   │   ├── google-auth.ts     # Google sign-in helper
│   │   ├── invoices.ts
│   │   ├── leads.ts
│   │   ├── organization.ts
│   │   ├── pipelines.ts
│   │   ├── products.ts
│   │   ├── profile.ts
│   │   ├── quotes.ts
│   │   ├── subscription.ts
│   │   ├── visits.ts
│   │   └── whatsapp.ts
│   ├── firebase/              # background-task.ts, location-tracker.ts (visit tracking)
│   ├── notification-service.ts # Push registration + handlers
│   ├── storage.ts             # MMKV/secure-store helpers
│   └── utils.ts               # cn() etc.
├── hooks/
│   ├── use-plan-features.ts   # Plan-gated feature flags
│   ├── use-razorpay.ts        # Payment hook
│   ├── use-rbac.ts            # Permission checking
│   └── use-theme-color.ts     # Theme color hook
├── constants/
│   └── theme.ts               # Color tokens (light/dark)
├── types/                     # Shared TypeScript types
└── android/                   # Native Android project (Gradle)
```

> No `lib/api/deals.ts` — there is no deals module on mobile.

## Key Patterns

### Authentication (Bearer tokens, NOT cookies)

`lib/api/client.ts` exposes `apiRequest(endpoint, accessToken, opts)` and the
`api.{get,post,put,patch,delete}` helpers. The access token is passed in as an
argument (read from secure storage in the calling layer, typically via
`useAuth()`), not pulled from SecureStore inside `client.ts`.

```typescript
// On 401 the client auto-calls a refresh callback registered by AuthProvider
// via setAuthCallbacks(refreshFn, logoutFn). If refresh fails, it logs out.
import { api, setAuthCallbacks, uploadFile } from '@/lib/api/client';

const { data, error, success } = await api.get<Lead[]>('/api/v1/leads', accessToken);
```

`API_URL` falls back to `https://api.salestub.com` if `EXPO_PUBLIC_API_URL` is
unset — set it in `.env` for local dev.

### Route Protection

Each protected group does its own auth check rather than a single global
redirect. `app/(tabs)/_layout.tsx` uses `useAuth()` and `router.replace('/')`
when unauthenticated, showing `<ScreenLoader />` while resolving. The (auth)
group is shown by Expo Router when no session exists.

### Tab Bar (platform split)

```typescript
// app/(tabs)/_layout.tsx — iOS uses NativeTabs (liquid glass + SF Symbols),
// Android uses standard <Tabs> with Ionicons. Tabs: index, whatsapp, leads,
// contacts, more.
if (Platform.OS === 'ios') {
  return <NativeTabs>{/* NativeTabs.Trigger w/ SF symbols */}</NativeTabs>;
}
return <Tabs>{/* Tabs.Screen w/ Ionicons */}</Tabs>;
```

### Cross-Platform UI

```typescript
import { Platform, KeyboardAvoidingView } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
>
```

### Styling (NativeWind + Tailwind v3)

Tokens come from `global.css` CSS variables (`--background`, `--foreground`,
`--primary`, etc.) consumed via `tailwind.config.js` (`hsl(var(--token))`).
Dark mode is class-based and driven by `ThemeProvider`. Use `cn()` from
`lib/utils.ts` to merge classes. No Gluestack UI / CVA dependency is installed;
prefer plain Tailwind classes on RN primitives or build local components in
`components/ui/`.

## Platform-Specific Rules

- `KeyboardAvoidingView`: `behavior="padding"` (iOS), `behavior="height"` (Android)
- `ScrollView`: Always use `keyboardShouldPersistTaps="handled"` for forms
- `SafeAreaView`: Use from `react-native-safe-area-context` (NOT `react-native`)
- Android back button: Handle with `BackHandler` when needed
- Platform values: Use `Platform.select()` for platform-specific values

## Key Files

- **`app/_layout.tsx`** — Root layout (SafeAreaProvider → AuthProvider → ThemeProvider → NotificationProvider → Stack), imports `global.css` and `lib/firebase/background-task`
- **`app/(tabs)/_layout.tsx`** — Tab navigator (5 tabs); iOS NativeTabs, Android Tabs+Ionicons
- **`contexts/auth-context.tsx`** — Auth state, secure-store tokens, refresh, AppState rehydration, registers callbacks with `setAuthCallbacks`
- **`contexts/notification-context.tsx`** — FCM + expo-notifications
- **`contexts/theme-context.tsx`** — system/light/dark
- **`lib/api/client.ts`** — Base API client (Bearer, refresh-on-401, `uploadFile` for multipart)
- **`lib/firebase/background-task.ts`** — Background task registration (imported in root layout)
- **`lib/firebase/location-tracker.ts`** — expo-location/expo-task-manager visit tracking
- **`global.css`** — Tailwind base + CSS-variable theme tokens
- **`app.json`** — Expo config: bundle id `com.salestub.crm`, package `com.salestub.crm`, plugins (expo-router, expo-splash-screen, expo-secure-store, expo-notifications, expo-location with background location, @react-native-firebase/app+auth, expo-font, datetimepicker), `newArchEnabled: true`, `experiments.reactCompiler: true`, `experiments.typedRoutes: true`
- **`eas.json`** — Profiles: `development` (dev client, dev-api.salestub.com), `preview` (dev-api), `production` (api.salestub.com, autoIncrement)
- **`tailwind.config.js`** — NativeWind v4 preset, Tailwind v3, class-based dark mode, hsl-var tokens
- **`metro.config.js`** — Metro + `withNativeWind` (input `./global.css`)
- **`babel.config.js`** — `babel-preset-expo` with `jsxImportSource: 'nativewind'` + `nativewind/babel`

## Environment

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000      # Dev (use machine IP for device)
# EXPO_PUBLIC_API_URL=https://api.salestub.com # Production
```

## Common Gotchas

- **"localhost" not working on device** → Use machine IP (e.g., `192.168.1.100:3000`)
- **Secure store not working on web** → expo-secure-store is iOS/Android only
- **NativeWind styles not applying** → Ensure `global.css` imported in root layout + metro.config CSS support
- **Android keyboard covers inputs** → `KeyboardAvoidingView` with `behavior="height"` + `ScrollView` with `keyboardShouldPersistTaps`
- **iOS safe area** → Use `react-native-safe-area-context` (not deprecated `react-native` version)
- **EAS Build fails** → Ensure `ios.bundleIdentifier` and `android.package` set in `app.json`

## Deployment

- **Build:** EAS Build (Expo Application Services)
- **iOS:** App Store via `eas submit --platform ios`
- **Android:** Play Store via `eas submit --platform android`
