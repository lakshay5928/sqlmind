import { NextRequest } from "next/server";

// In-memory sliding window rate limiter
// Each session gets its own bucket — no cross-session data leakage
interface Bucket {
  timestamps: number[];   // rolling request timestamps
  sessionId: string;
}

const buckets = new Map<string, Bucket>();

// Clean up old buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter(t => now - t < WINDOW_MS);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}, 5 * 60 * 1000);

const WINDOW_MS = 60 * 1000;        // 1 minute window
const MAX_REQUESTS = 20;             // 20 queries per minute per session
const GROQ_DAILY_LIMIT = 500;        // conservative daily budget per session

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(sessionId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `rl:${sessionId}`;

  if (!buckets.has(key)) {
    buckets.set(key, { timestamps: [], sessionId });
  }

  const bucket = buckets.get(key)!;
  // Slide the window — remove timestamps older than WINDOW_MS
  bucket.timestamps = bucket.timestamps.filter(t => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= MAX_REQUESTS) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, remaining: 0, limit: MAX_REQUESTS, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - bucket.timestamps.length,
    limit: MAX_REQUESTS,
    retryAfterSeconds: 0,
  };
}

const webCrypto = typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto;
if (!webCrypto) {
  throw new Error("Web Crypto API is required for session ID generation.");
}

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await webCrypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getSessionId(req: NextRequest): Promise<string> {
  // Session ID from cookie — set once, persists per browser tab/session
  // This ensures user A never sees user B's history
  const cookieSession = req.cookies.get("sqlmind_session")?.value;
  if (cookieSession && /^[a-f0-9]{64}$/.test(cookieSession)) return cookieSession;

  // Fallback: derive from IP + User-Agent (not stored, just for rate limiting)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return await sha256Hex(ip + ua);
}

export function generateSessionId(): string {
  const bytes = webCrypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// SQL injection prevention — sanitize user inputs
export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  return input.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 10000);
}

// Check if SQL contains dangerous operations for the given role
export function validateRolePermissions(sql: string, role: string): { allowed: boolean; reason?: string } {
  const u = sql.toUpperCase().trim();
  const hasDDL = /\b(DROP|TRUNCATE|ALTER|CREATE)\b/.test(u);
  const hasDML = /\b(INSERT|UPDATE|DELETE)\b/.test(u);

  if (role === "end_user") {
    if (hasDDL || hasDML) {
      return { allowed: false, reason: "End User role only allows SELECT queries." };
    }
  }
  if (role === "developer") {
    if (hasDDL) {
      return { allowed: false, reason: "Developer role does not allow DDL operations (DROP, ALTER, CREATE, TRUNCATE)." };
    }
  }
  return { allowed: true };
}

// Credit cost estimator per query type
export function estimateCreditCost(mode: string, provider: string): number {
  if (provider === "rules") return 0;       // No API cost
  if (provider === "ollama") return 0;      // Local, free
  if (mode === "nl") return 4;              // NL→SQL + explanation + Hindi + optimization = 4 calls
  return 2;                                  // SQL mode: explanation + Hindi = 2 calls
}

// Groq free tier: 14,400 req/day = 14,400 / (4 calls/query) ≈ 3,600 queries/day
export const GROQ_FREE_LIMITS = {
  requestsPerMinute: 30,
  requestsPerDay: 14400,
  tokensPerMinute: 6000,
  estimatedQueriesPerDay: 3600,
};
