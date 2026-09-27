// src/lib/whatsapp.ts
// Dedicated WhatsApp transport via the Twilio API.
//
// Responsibilities:
//   - Lazily instantiate a singleton Twilio client from env vars.
//   - Send a WhatsApp message with exponential-backoff retry on transient failures.
//   - Gracefully degrade (log + succeed) when Twilio credentials are absent
//     so the app works in test/dev environments.
//
// Env vars:
//   TWILIO_ACCOUNT_SID  – Twilio account SID
//   TWILIO_AUTH_TOKEN  – Twilio auth token
//   TWILIO_WHATSAPP_FROM – Twilio WhatsApp sender (e.g. "14155238886" or
//                          the full "whatsapp:141552388886")
import twilio from 'twilio';

/** Outcome of a WhatsApp send attempt. */
export interface WhatsAppResult {
  /** Whether the message was accepted by Twilio (or skipped in test mode). */
  success: boolean;
  /** Twilio message SID on success, or 'test-mode' when credentials are absent. */
  sid?: string;
  /** Human-readable error message when success is false. */
  error?: string;
}

/** Options for retrying a WhatsApp send. */
export interface SendWhatsAppOptions {
  /** Maximum number of retry attempts (default 3, i.e. 4 total tries). */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default 500). */
  baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

// --- Twilio client management ------------------------------------------------

let twilioClient: twilio.Twilio | null = null;

/** Reset the cached client — useful for tests that swap env vars. */
export function resetTwilioClient(): void {
  twilioClient = null;
}

/**
 * Lazily create (once) and return the Twilio client.
 * Returns null when required env vars are missing (test mode).
 */
function getTwilioClient(): twilio.Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null; // test mode — credentials not configured
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Resolve the configured WhatsApp sender.
 * Strips a leading "whatsapp:" prefix if the env var includes it so callers
 * can store either "141552388886" or "whatsapp:141552388886".
 */
function getWhatsAppFrom(): string | null {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) return null;
  return from.replace(/^whatsapp:/, '');
}

// --- Phone number helpers ----------------------------------------------------

/**
 * Normalise a phone number to E.164 format (+ccxxxxxxxxx).
 * - Strips whitespace, dashes, parentheses, and other non-digit characters.
 * - Preserves a leading + if present.
 * - Without a + the number is assumed to be missing its country code and
 *   gets one prepended.
 */
export function normalizePhone(phone: string): string {
  let formatted = phone.trim().replace(/[^\d+]/g, '');
  if (!formatted.startsWith('+')) {
    formatted = `+${formatted}`;
  }
  return formatted;
}

/** Build the full twilio:. recipient string from a raw phone number. */
export function toWhatsAppAddress(phone: string): string {
  return `whatsapp:${normalizePhone(phone)}`;
}

// --- Retry helpers -----------------------------------------------------------

/**
 * Determine whether a Twilio error is transient and worth retrying.
 *
 * Retries on:
 *   - HTTP 429 (Too Many Requests)
 *   - HTTP 5xx (server errors)
 *   - Network-level errors (timeout, DNS, connection reset)
 *   - Twilio error codes known to be transient (30001-30005, 81010)
 */
function isRetryableError(error: unknown): boolean {
  const err = error as Record<string, unknown>;

  // HTTP status / Twilio status code
  const status =
    (err.status as number) ??
    (err.statusCode as number) ??
    (err.code as number);

  if (!status) {
    // No numeric code → could be a network error (ECONNRESET, ENOTFOUND, timeout)
    const message = (err.message as string) || '';
    return (
      message.includes('timeout') ||
      message.includes('ECONNRESET') ||
      message.includes('ENOTFOUND') ||
      message.includes('ECONNREFUSED')
    );
  }

  // HTTP 429 or 5xx → retry
  if (status === 429 || (status >= 500 && status < 600)) return true;

  // Known transient Twilio error codes
  const TWILIO_TRANSIENT_CODES = new Set([
    30001, // Queue overflow / too many requests
    30002, // Account temporarily blocked
    30003, // Internal Twilio error
    30004, // Temporary fetch failure
    30005, // Message delivery failure (transient)
    81010, // REST API error (transient)
  ]);

  return TWILIO_TRANSIENT_CODES.has(status);
}

/** Sleep for `ms` milliseconds (async-friendly backoff). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Public API --------------------------------------------------------------

/**
 * Send a WhatsApp message via Twilio with exponential-backoff retry.
 *
 * - In test mode (no TWILIO_* env vars), logs the intended message and
 *   returns a successful result so the app keeps working without config.
 * - Retries up to `maxRetries` times on transient failures.
 * - Never throws; returns a structured {@link WhatsAppResult}.
 *
 * @param to  Recipient phone number (with or without country code / +).
 * @param body  Message text (max 4096 chars for a single WhatsApp message).
 * @param options  Retry configuration.
 */
export async function sendWhatsApp(
  to: string,
  body: string,
  options?: SendWhatsAppOptions,
): Promise<WhatsAppResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  const recipient = normalizePhone(to);
  const from = getWhatsAppFrom();
  const client = getTwilioClient();

  // --- Test mode: credentials not configured ---
  if (!client || !from) {
    console.log(
      `[whatsapp] (test mode) would send to ${recipient}: ${body}`,
    );
    return { success: true, sid: 'test-mode' };
  }

  // --- Retry loop with exponential backoff ---
  const totalAttempts = maxRetries + 1;
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const message = await client.messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${recipient}`,
        body,
      });

      console.log(
        `[whatsapp] sent to ${recipient} (sid: ${message.sid})`,
      );
      return { success: true, sid: message.sid };
    } catch (error: unknown) {
      const isLastAttempt = attempt === totalAttempts;
      const err = error as Record<string, unknown>;

      if (isLastAttempt || !isRetryableError(error)) {
        // Non-retryable or out of retries — give up
        const errMsg =
          (err.message as string) ||
          (err.details as string) ||
          'Unknown Twilio error';
        console.error(
          `[whatsapp] failed to send to ${recipient} after ${attempt} attempt(s): ${errMsg}`,
        );
        return { success: false, error: errMsg };
      }

      // Transient failure — back off and retry
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[whatsapp] attempt ${attempt}/${totalAttempts} failed for ${recipient} — retrying in ${delay}ms:`,
        err.message,
      );
      await sleep(delay);
    }
  }

  // Unreachable — the loop always returns, but guard for TypeScript exhaustiveness.
  return { success: false, error: 'Max retries exhausted' };
}

/**
 * Fire-and-forget wrapper around {@link sendWhatsApp}.
 *
 * Catches any unexpected exception, logs it, and returns a result — it never
 * throws. Use this when a notification failure should not break the request.
 */
export async function sendWhatsAppSafe(
  to: string,
  body: string,
  options?: SendWhatsAppOptions,
): Promise<WhatsAppResult> {
  try {
    return await sendWhatsApp(to, body, options);
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const errMsg = (err.message as string) || 'Unexpected error';
    console.error('[whatsapp] Unexpected error:', errMsg);
    return { success: false, error: errMsg };
  }
}
