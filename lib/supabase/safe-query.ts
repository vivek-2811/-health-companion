/**
 * safe-query.ts — Supabase Client Query Wrapper with Exponential Backoff Retries,
 * Circuit Breaker Pattern, Typed Error Classification, and Graceful Fallbacks.
 */

export type QueryErrorType = 'auth' | 'network' | 'constraint' | 'notFound' | 'unknown';

export interface SafeQueryError {
  message: string;
  type: QueryErrorType;
  originalError: any;
}

// Circuit Breaker State per Table/Feature
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers: Record<string, CircuitBreakerState> = {};
const CIRCUIT_BREAKER_LIMIT = 5;
const COOLDOWN_PERIOD_MS = 30000; // 30 seconds

const getCircuitBreaker = (key: string): CircuitBreakerState => {
  if (!circuitBreakers[key]) {
    circuitBreakers[key] = { failures: 0, lastFailureTime: 0, isOpen: false };
  }
  return circuitBreakers[key];
};

const recordFailure = (key: string) => {
  const cb = getCircuitBreaker(key);
  cb.failures += 1;
  cb.lastFailureTime = Date.now();
  if (cb.failures >= CIRCUIT_BREAKER_LIMIT) {
    cb.isOpen = true;
    console.warn(`[Circuit Breaker] Tripped! Calls to '${key}' are suspended for ${COOLDOWN_PERIOD_MS / 1000}s.`);
  }
};

const recordSuccess = (key: string) => {
  const cb = getCircuitBreaker(key);
  cb.failures = 0;
  cb.isOpen = false;
};

const checkCircuitBreaker = (key: string): boolean => {
  const cb = getCircuitBreaker(key);
  if (cb.isOpen) {
    if (Date.now() - cb.lastFailureTime > COOLDOWN_PERIOD_MS) {
      // Cooldown finished, let one request try (half-open state)
      cb.isOpen = false;
      cb.failures = 0;
      return true; // Allow call
    }
    return false; // Blocks call
  }
  return true; // Allow call
};

/**
 * Classify Supabase database error codes into predictable types
 */
export const classifyError = (error: any): QueryErrorType => {
  if (!error) return 'unknown';
  if (error.code) {
    // Supabase / Postgres error codes
    const code = String(error.code);
    if (code.startsWith('23')) return 'constraint'; // Integrity constraints (unique, foreign key, check)
    if (code === 'P0001' || code.includes('jwt') || code === '42501') return 'auth'; // RLS failures, invalid tokens
    if (code.startsWith('08') || code === '42P01' || code === '00000') return 'network'; // Connection issues
  }
  
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('jwt') || msg.includes('auth') || msg.includes('permission denied')) return 'auth';
  if (msg.includes('not found') || msg.includes('does not exist')) return 'notFound';

  return 'unknown';
};

/**
 * safeQuery - Wraps database calls with retries, circuit breaker check, and structured errors
 * 
 * @param queryFn A promise-returning function (e.g. () => supabase.from('meals').select('*'))
 * @param breakerKey Unique key to manage circuit breaker rate limit (e.g. 'meals', 'habits')
 * @param fallbackValue Value returned if query fails or breaker is tripped
 * @param retries Number of retry attempts (default: 3)
 */
export async function safeQuery<T>(
  queryFn: () => PromiseLike<{ data: any; error: any }> | Promise<{ data: any; error: any }> | any,
  breakerKey: string,
  fallbackValue: T,
  retries = 3
): Promise<{ data: T; error: SafeQueryError | null }> {
  
  if (!checkCircuitBreaker(breakerKey)) {
    return {
      data: fallbackValue,
      error: {
        message: `Circuit breaker is active for '${breakerKey}'. Skipping database query.`,
        type: 'network',
        originalError: new Error('Circuit breaker open')
      }
    };
  }

  let delay = 300; // ms
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await queryFn();

      if (error) {
        throw error;
      }

      recordSuccess(breakerKey);
      return { data: (data !== null ? data : fallbackValue), error: null };
    } catch (err: any) {
      console.error(`[safeQuery] Attempt ${attempt} failed for '${breakerKey}':`, err.message || err);
      
      const errorType = classifyError(err);
      
      // Do not retry authorization errors or constraint violations, fail immediately
      if (errorType === 'auth' || errorType === 'constraint' || attempt === retries) {
        recordFailure(breakerKey);
        return {
          data: fallbackValue,
          error: {
            message: err.message || 'Database query failed.',
            type: errorType,
            originalError: err
          }
        };
      }

      // Delay with backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }

  return {
    data: fallbackValue,
    error: {
      message: 'Maximum query retries reached.',
      type: 'network',
      originalError: new Error('Retry limit exceeded')
    }
  };
}
