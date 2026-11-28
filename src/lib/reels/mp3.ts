/**
 * MP3 frames (16.1). Google Text-to-Speech returns one MP3 per line (MPEG-1
 * Layer III, constant bitrate, 44.1 kHz, no tag). A reel keeps all its lines
 * in one file: the frames of each line are put one after the other, and the
 * player jumps to the time where a line starts. With one voice family per reel
 * every frame has the same bitrate, so a time maps exactly to a byte and the
 * browser seeks to the right frame.
 *
 * Only what is needed is read: the frame headers. An ID3 tag or a Xing / Info
 * / VBRI header frame (which would give the joined file a wrong length) is
 * dropped.
 */

const BITRATES_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const SAMPLE_RATES = [44_100, 48_000, 32_000, 0];
export const SAMPLES_PER_FRAME = 1152;

export type Mp3Part = {
  /** The audio frames only, ready to be joined. */
  frames: Uint8Array;
  frameCount: number;
  sampleRate: number;
  bitrate: number;
};

/** Reads one MP3 file. Throws if it isn't a plain MPEG-1 Layer III stream. */
export function readMp3(file: Uint8Array): Mp3Part {
  let offset = 0;
  // ID3v2 tag: "ID3", version, flags, then a 4-byte "synchsafe" size.
  if (file[0] === 0x49 && file[1] === 0x44 && file[2] === 0x33 && file.length >= 10) {
    offset = 10 + ((file[6]! << 21) | (file[7]! << 14) | (file[8]! << 7) | file[9]!);
  }

  const chunks: Uint8Array[] = [];
  let frameCount = 0;
  let sampleRate = 0;
  let bitrate = 0;
  let size = 0;

  while (offset + 4 <= file.length) {
    const header = readHeader(file, offset);
    if (!header) {
      // An ID3v1 tag ("TAG", 128 bytes) at the very end is the only other thing allowed.
      if (file.length - offset === 128 && file[offset] === 0x54) break;
      throw new Error("Unexpected data in the MP3 stream.");
    }
    if (offset + header.length > file.length) break; // a cut last frame is dropped
    const frame = file.subarray(offset, offset + header.length);
    offset += header.length;
    if (frameCount === 0 && chunks.length === 0 && isInfoFrame(frame)) continue;

    if (sampleRate === 0) {
      sampleRate = header.sampleRate;
      bitrate = header.bitrate;
    } else if (header.sampleRate !== sampleRate || header.bitrate !== bitrate) {
      throw new Error("The MP3 is not constant bitrate.");
    }
    chunks.push(frame);
    size += frame.length;
    frameCount++;
  }
  if (frameCount === 0) throw new Error("The MP3 has no audio frame.");

  const frames = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    frames.set(chunk, at);
    at += chunk.length;
  }
  return { frames, frameCount, sampleRate, bitrate };
}

/** Length of a part, in ms. */
export function partMs(part: Pick<Mp3Part, "frameCount" | "sampleRate">): number {
  return Math.round((part.frameCount * SAMPLES_PER_FRAME * 1000) / part.sampleRate);
}

/**
 * The parts joined into one file, and where each one starts (ms). Every part
 * must have the same sample rate and bitrate, or seeking would be off.
 */
export function joinMp3(parts: readonly Mp3Part[]): { file: Uint8Array; startsMs: number[] } {
  const first = parts[0];
  if (!first) throw new Error("Nothing to join.");
  if (parts.some((p) => p.sampleRate !== first.sampleRate || p.bitrate !== first.bitrate)) {
    throw new Error("The lines don't share one MP3 format.");
  }
  const file = new Uint8Array(parts.reduce((total, part) => total + part.frames.length, 0));
  const startsMs: number[] = [];
  let at = 0;
  let framesBefore = 0;
  for (const part of parts) {
    startsMs.push(Math.round((framesBefore * SAMPLES_PER_FRAME * 1000) / first.sampleRate));
    file.set(part.frames, at);
    at += part.frames.length;
    framesBefore += part.frameCount;
  }
  return { file, startsMs };
}

function readHeader(
  file: Uint8Array,
  offset: number,
): { length: number; sampleRate: number; bitrate: number } | null {
  const b1 = file[offset]!;
  const b2 = file[offset + 1]!;
  const b3 = file[offset + 2]!;
  if (b1 !== 0xff || (b2 & 0xe0) !== 0xe0) return null;
  const version = (b2 >> 3) & 3; // 3 = MPEG-1
  const layer = (b2 >> 1) & 3; // 1 = Layer III
  if (version !== 3 || layer !== 1) return null;
  const bitrate = BITRATES_KBPS[(b3 >> 4) & 15]! * 1000;
  const sampleRate = SAMPLE_RATES[(b3 >> 2) & 3]!;
  if (bitrate === 0 || sampleRate === 0) return null;
  const padding = (b3 >> 1) & 1;
  return { length: Math.floor((144 * bitrate) / sampleRate) + padding, sampleRate, bitrate };
}

/** A Xing / Info / VBRI header frame: metadata, no audio. */
function isInfoFrame(frame: Uint8Array): boolean {
  const text = String.fromCharCode(...frame.subarray(0, Math.min(frame.length, 64)));
  return /Xing|Info|VBRI/.test(text);
}
