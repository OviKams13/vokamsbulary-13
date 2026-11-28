import "server-only";

import { env } from "@/lib/env";
import { joinMp3, type Mp3Part, partMs, readMp3 } from "@/lib/reels/mp3";
import type { ReelLanguage, ScriptLine } from "@/lib/reels/script";

/**
 * Reel voices (16.1): Google Cloud Text-to-Speech, REST v1 `text:synthesize`.
 * One request per line, MP3 at 44.1 kHz. The key comes from the server env and
 * is sent in the `X-Goog-Api-Key` header, so it never appears in a URL, a log
 * or an error message.
 *
 * The same voice speaks both languages (Charon). If Chirp 3 HD fails on any
 * line, the whole reel is made again with Neural2-D: one voice family per reel,
 * so every line has the same MP3 format and the lines can be joined.
 */

const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const LANGUAGE_CODES: Record<ReelLanguage, string> = { en: "en-US", fr: "fr-FR" };

export const VOICES = {
  chirp: { en: "en-US-Chirp3-HD-Charon", fr: "fr-FR-Chirp3-HD-Charon" },
  neural2: { en: "en-US-Neural2-D", fr: "fr-FR-Neural2-D" },
} as const satisfies Record<string, Record<ReelLanguage, string>>;

export type VoiceFamily = keyof typeof VOICES;

/** Lines synthesized at the same time. */
const CONCURRENCY = 4;
/** One line: far more than a few seconds of speech needs. */
const LINE_TIMEOUT_MS = 30_000;

export class TtsError extends Error {
  override name = "TtsError";
}

export type VoicedLine = ScriptLine & { audioStartMs: number; audioMs: number };

export type ReelVoice = {
  family: VoiceFamily;
  voices: Record<ReelLanguage, string>;
  file: Uint8Array;
  lines: VoicedLine[];
};

/**
 * Every line of a reel, voiced and joined into one MP3. `onCharacters` gets the
 * characters of each line Google synthesized (billed), failed ones excluded,
 * also when the reel fails later.
 */
export async function voiceReel(
  lines: readonly ScriptLine[],
  onCharacters: (characters: number) => void,
): Promise<ReelVoice> {
  let chirpError: unknown;
  for (const family of ["chirp", "neural2"] as const) {
    try {
      const parts = await mapLimited(lines, CONCURRENCY, async (line) => {
        const part = await synthesize(line.spoken, VOICES[family][line.language], line.language);
        onCharacters(Array.from(line.spoken).length);
        return part;
      });
      const { file, startsMs } = joinMp3(parts);
      return {
        family,
        voices: VOICES[family],
        file,
        lines: lines.map((line, index) => ({
          ...line,
          audioStartMs: startsMs[index]!,
          audioMs: partMs(parts[index]!),
        })),
      };
    } catch (error) {
      if (family === "neural2") {
        const first = chirpError instanceof Error ? ` (Chirp 3 HD: ${chirpError.message})` : "";
        throw new TtsError(`${describe(error)}${first}`);
      }
      chirpError = error;
      console.warn("Chirp 3 HD failed, the reel switches to Neural2-D:", describe(error));
    }
  }
  throw new TtsError("Unreachable.");
}

async function synthesize(text: string, voice: string, language: ReelLanguage): Promise<Mp3Part> {
  let lastError: unknown;
  // One retry for a busy or flaky service; other errors fail at once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_TTS_API_KEY },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: LANGUAGE_CODES[language], name: voice },
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 44_100 },
      }),
      signal: AbortSignal.timeout(LINE_TIMEOUT_MS),
      cache: "no-store",
    }).catch((error: unknown) => error as Error);

    if (response instanceof Error) {
      lastError = new TtsError(`Text-to-Speech didn't answer: ${response.message}`);
      continue;
    }
    const body = (await response.json().catch(() => null)) as {
      audioContent?: string;
      error?: { message?: string };
    } | null;
    if (response.ok && body?.audioContent) {
      return readMp3(Buffer.from(body.audioContent, "base64"));
    }
    const message = body?.error?.message ?? "no audio in the answer";
    lastError = new TtsError(`Text-to-Speech error ${response.status} (${voice}): ${message}`);
    if (response.status !== 429 && response.status < 500) break;
  }
  throw lastError;
}

/** `fn` over every item, at most `limit` at a time, results in order. Stops at the first error. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index]!);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
