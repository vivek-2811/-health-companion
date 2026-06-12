# Integration Guide — Aurora Self-Healing System

This guide outlines how to use the error-handling and recovery components built for the Aurora app.

## 1. safe-query.ts (Supabase Wrapper)
Wrap Supabase queries to prevent crashes, implement circuit breaking, and retry transient network failures.

**Example Usage**:
```typescript
import { safeQuery } from '@/lib/supabase/safe-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

async function fetchMeals() {
  const { data, error } = await safeQuery(
    () => supabase.from('meals').select('*').order('created_at', { ascending: false }),
    'meals', // Circuit breaker scope key
    [] // Fallback value on failure
  );
  
  if (error) {
    console.error(`Logged ${error.type} error:`, error.message);
  }
  
  return data; // Always an array, never undefined/null
}
```

## 2. ErrorBoundary.tsx (React Widget Crashes)
Wrap each dashboard bento widget individually. If one fails, the rest of the app continues working.

**Example Usage**:
```jsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import HydrationCard from './HydrationCard';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary name="Hydration Widget">
        <HydrationCard />
      </ErrorBoundary>
      
      <ErrorBoundary name="Habits Widget">
        <HabitsCard />
      </ErrorBoundary>
    </div>
  );
}
```

## 3. ai-action-handler.ts (Gemini Timout & Regex Failover)
Wraps remote server actions to handle timeouts (8s) or API limits by parsing voice/text commands using local rules.

**Example Usage**:
```typescript
import { safeGetGeminiResponse } from '@/lib/ai-action-handler';
import { getGeminiResponse } from '@/app/actions/chat';

async function handleMessageSubmit(text: string, currentData: HealthData) {
  const response = await safeGetGeminiResponse(
    text,
    currentData,
    getGeminiResponse // Gemini Server Action
  );
  
  // response.text -> Response speech/text
  // response.updatedData -> Structured metrics updates (e.g. { water: 500 })
  // response.actions -> Array of operations to execute
}
```

## 4. DevErrorOverlay.tsx (Floating Error Toasts)
Provides a developer dashboard Console in bottom-right corner for uncaught rejections or errors. Automatically disabled in production.

**Wiring in `app/layout.tsx`**:
```tsx
import { DevErrorOverlay } from "@/components/DevErrorOverlay";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <DevErrorOverlay />
      </body>
    </html>
  );
}
```
