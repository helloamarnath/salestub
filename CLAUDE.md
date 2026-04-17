# CLAUDE.md — salestub (Mobile App)

## Overview

React Native **mobile app** for **SalesTub CRM** — iOS & Android app for sales teams to manage leads, deals, contacts, activities, invoices, products, and quotes on the go.

Part of a monorepo with: `crm-backend` (API), `crm-admin` (admin portal), `crm-user` (user portal).

**Backend API:** `http://localhost:3000/api/v1` (development)

**CRITICAL: All screens MUST support both iOS and Android platforms.**

## Tech Stack

- **Framework:** React Native 0.81 with Expo SDK 54
- **Router:** Expo Router (file-based routing)
- **UI:** Gluestack UI + NativeWind 4 (Tailwind CSS)
- **Styling:** class-variance-authority (CVA) for component variants
- **State:** React Context API (auth, notifications, theme)
- **Auth:** expo-secure-store for token storage (Bearer tokens)
- **Payments:** react-native-razorpay
- **Push:** Firebase Cloud Messaging (FCM)
- **Icons:** Lucide React Native

## Commands

```bash
npm install

# Development
npx expo start                 # Start dev server
npx expo start --ios           # iOS simulator
npx expo start --android       # Android emulator
npx expo start -c              # Clear cache and start

# Build (EAS)
eas build --platform ios
eas build --platform android
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Local builds
npx expo run:ios
npx expo run:android

# Lint
npm run lint
```

## App Structure

```
app/
├── _layout.tsx                # Root layout (AuthProvider, ThemeProvider, NotificationProvider)
├── index.tsx                  # Entry redirect
│
├── (auth)/                    # Auth group (unauthenticated users)
│   ├── _layout.tsx            # Stack navigator
│   └── login.tsx              # Login screen
│
├── (tabs)/                    # Tab group (authenticated users)
│   ├── _layout.tsx            # Tab navigator (5 tabs)
│   ├── index.tsx              # Home/Dashboard tab
│   ├── contacts/              # Contacts tab
│   │   ├── index.tsx          # Contact list
│   │   ├── customer/create.tsx    # Create customer
│   │   └── organization/create.tsx # Create organization
│   ├── leads/                 # Leads tab
│   │   ├── index.tsx          # Lead list
│   │   └── create.tsx         # Create lead
│   ├── quotes/                # Quotes tab
│   │   ├── index.tsx          # Quote list
│   │   └── create.tsx         # Create quote
│   └── more.tsx               # More menu
│
│  # --- Detail/CRUD Screens (stack) ---
├── leads/
│   ├── _layout.tsx
│   └── [id].tsx               # Lead detail
├── deals/
│   ├── _layout.tsx
│   ├── index.tsx              # Deal list
│   ├── [id].tsx               # Deal detail
│   └── create.tsx             # Create deal
├── contacts/
│   ├── _layout.tsx
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
│   └── create.tsx             # Create product
├── quotes-detail/
│   ├── _layout.tsx
│   └── [id].tsx               # Quote detail
│
│  # --- Other Screens ---
├── profile/                   # User profile
├── subscription/              # Plans & subscription management
├── notifications.tsx          # Notifications
├── notification-settings.tsx  # Notification preferences
├── export-import.tsx          # Data export/import
└── modal.tsx                  # Modal screen
```

## Project Structure

```
salestub/
├── app/                       # Screens (see above)
├── components/
│   ├── ui/                    # Gluestack UI (Button, Text, Input, etc.)
│   ├── dashboard/             # Dashboard widgets
│   ├── leads/                 # Lead components
│   ├── quotes/                # Quote components
│   ├── filters/               # Filter components
│   ├── export/                # Export components
│   └── visits/                # Visit components
├── contexts/
│   ├── auth-context.tsx       # Auth state, session refresh
│   ├── notification-context.tsx # Push notification management
│   └── theme-context.tsx      # Theme management
├── lib/
│   ├── api/                   # API clients (15 service files)
│   │   ├── client.ts          # Base client with Bearer auth
│   │   ├── leads.ts
│   │   ├── contacts.ts
│   │   ├── deals.ts
│   │   ├── activities.ts
│   │   ├── invoices.ts
│   │   ├── products.ts
│   │   ├── quotes.ts
│   │   ├── dashboard.ts
│   │   ├── companies.ts
│   │   ├── pipelines.ts
│   │   ├── organization.ts
│   │   ├── profile.ts
│   │   ├── subscription.ts
│   │   └── visits.ts
│   ├── firebase/              # Firebase configuration
│   ├── notification-service.ts
│   ├── storage.ts
│   └── utils.ts
├── hooks/
│   ├── use-razorpay.ts        # Payment hook
│   ├── use-rbac.ts            # Permission checking
│   └── use-theme-color.ts     # Theme hook
└── constants/                 # Theme colors, config
```

## Key Patterns

### Authentication (Bearer tokens, NOT cookies)

```typescript
// lib/api/client.ts
import * as SecureStore from 'expo-secure-store';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = await SecureStore.getItemAsync('access_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}
```

### Route Protection

```typescript
// app/_layout.tsx
const { isAuthenticated, loading } = useAuth();
useEffect(() => {
  if (loading) return;
  const inAuthGroup = segments[0] === '(auth)';
  if (!isAuthenticated && !inAuthGroup) router.replace('/(auth)/login');
  else if (isAuthenticated && inAuthGroup) router.replace('/(tabs)');
}, [isAuthenticated, loading]);
```

### Cross-Platform UI

```typescript
import { Platform, KeyboardAvoidingView } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
>
```

### Component Variants (CVA)

```typescript
const buttonVariants = cva('items-center justify-center rounded-lg', {
  variants: {
    variant: { solid: 'bg-primary-500', outline: 'border border-primary-500' },
    size: { sm: 'h-9 px-3', md: 'h-11 px-4', lg: 'h-12 px-6' },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});
```

## Platform-Specific Rules

- `KeyboardAvoidingView`: `behavior="padding"` (iOS), `behavior="height"` (Android)
- `ScrollView`: Always use `keyboardShouldPersistTaps="handled"` for forms
- `SafeAreaView`: Use from `react-native-safe-area-context` (NOT `react-native`)
- Android back button: Handle with `BackHandler` when needed
- Platform values: Use `Platform.select()` for platform-specific values

## Key Files

- **`app/_layout.tsx`** — Root layout with all providers
- **`app/(tabs)/_layout.tsx`** — Tab navigator (5 tabs)
- **`contexts/auth-context.tsx`** — Auth state management
- **`contexts/notification-context.tsx`** — Push notifications
- **`lib/api/client.ts`** — Base API client
- **`app.json`** — Expo config (bundle IDs, icons, splash)
- **`eas.json`** — EAS Build profiles
- **`tailwind.config.js`** — NativeWind config
- **`metro.config.js`** — Metro bundler with CSS

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
