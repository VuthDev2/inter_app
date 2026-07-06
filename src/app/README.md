# src/app — Mobile App (Future)

This directory is reserved for **mobile-specific** code (e.g., Capacitor, React Native, or Expo).

## When to add code here

- Native mobile screens that don't exist on web
- Mobile-specific navigation (tab bar, stack navigator)
- Native device integrations (camera, GPS, push notifications)
- Platform-specific UI components

## Shared code

All business logic, API calls, and UI components shared between web and mobile live in:

```
src/shared/
├── components/   ← UI components (shadcn/ui)
├── hooks/        ← React hooks
├── integrations/ ← Supabase, third-party APIs
└── lib/          ← Utilities, helpers
```

Import shared code using the `@/` alias:
```ts
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
```
