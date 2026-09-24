export type BoardSoundKind = "move" | "capture" | "check" | "wrong" | "correct";
export type BoardSoundPack = "lichess" | "wood" | "click" | "beep";

export const BOARD_SOUND_KEY = "mate-board-sound-pack";
export const DEFAULT_SOUND_PACK: BoardSoundPack = "lichess";

export const BOARD_SOUND_PACKS: { id: BoardSoundPack; name: string }[] = [
  { id: "lichess", name: "Lichess" },
  { id: "wood", name: "Dřevo" },
  { id: "click", name: "Klik" },
  { id: "beep", name: "Pípnutí" },
];

export function isBoardSoundPack(value: string): value is BoardSoundPack {
  return BOARD_SOUND_PACKS.some((pack) => pack.id === value);
}

let audio: AudioContext | null = null;
let enabled = true;
let unlocking = false;
let noise: AudioBuffer | null = null;
let pack: BoardSoundPack = DEFAULT_SOUND_PACK;

export function setBoardSoundEnabled(value: boolean) {
  enabled = value;
}

export function setBoardSoundPack(value: BoardSoundPack) {
  pack = value;
}

export function getBoardSoundPack() {
  return pack;
}

function Ctor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

function getContext(): AudioContext | null {
  const Make = Ctor();
  if (!Make) return null;
  if (!audio) audio = new Make();
  return audio;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const length = Math.floor(ac.sampleRate * 0.08);
  const buf = ac.createBuffer(1, length, ac.sampleRate);
  const data = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    brown = (brown + white * 0.02) / 1.02;
    data[i] = brown * 3.2;
  }
  noise = buf;
  return buf;
}

async function runningContext(): Promise<AudioContext | null> {
  const ac = getContext();
  if (!ac) return null;
  if (ac.state === "suspended") {
    try {
      await ac.resume();
    } catch {
      return null;
    }
  }
  return ac.state === "running" ? ac : null;
}

export function unlockBoardSound() {
  if (unlocking || typeof window === "undefined") return;
  unlocking = true;
  const kick = () => {
    void runningContext();
  };
  window.addEventListener("pointerdown", kick, { once: true, capture: true });
  window.addEventListener("keydown", kick, { once: true, capture: true });
}

if (typeof window !== "undefined") unlockBoardSound();

function osc(
  ac: AudioContext,
  dest: AudioNode,
  time: number,
  {
    type = "sine",
    freq,
    endFreq,
    gain,
    dur,
  }: {
    type?: OscillatorType;
    freq: number;
    endFreq?: number;
    gain: number;
    dur: number;
  },
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, time);
  if (endFreq) {
    o.frequency.exponentialRampToValueAtTime(endFreq, time + dur);
  }
  g.gain.setValueAtTime(Math.max(0.0001, gain), time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g);
  g.connect(dest);
  o.start(time);
  o.stop(time + dur + 0.02);
}

function noiseClick(
  ac: AudioContext,
  dest: AudioNode,
  time: number,
  freq: number,
  gain: number,
  q: number,
  dur = 0.045,
) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 350;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(time);
}

function paintLichess(ac: AudioContext, dest: AudioNode, kind: BoardSoundKind, t: number) {
  if (kind === "wrong") {
    osc(ac, dest, t, { freq: 140, endFreq: 70, gain: 0.16, dur: 0.12 });
    return;
  }
  if (kind === "correct") {
    osc(ac, dest, t, { freq: 520, gain: 0.08, dur: 0.06 });
    osc(ac, dest, t + 0.06, { freq: 690, gain: 0.07, dur: 0.08 });
    return;
  }
  const capture = kind === "capture";
  osc(ac, dest, t, {
    freq: capture ? 210 : 280,
    endFreq: capture ? 90 : 140,
    gain: capture ? 0.22 : 0.14,
    dur: capture ? 0.07 : 0.045,
  });
  osc(ac, dest, t, {
    type: "triangle",
    freq: capture ? 900 : 1400,
    endFreq: 400,
    gain: capture ? 0.07 : 0.05,
    dur: 0.03,
  });
  if (kind === "check") {
    osc(ac, dest, t + 0.05, { type: "triangle", freq: 880, gain: 0.07, dur: 0.1 });
  }
}

function paintWood(ac: AudioContext, dest: AudioNode, kind: BoardSoundKind, t: number) {
  if (kind === "wrong") {
    osc(ac, dest, t, { freq: 90, endFreq: 40, gain: 0.28, dur: 0.16 });
    noiseClick(ac, dest, t, 420, 0.22, 0.7);
    return;
  }
  if (kind === "correct") {
    noiseClick(ac, dest, t, 1500, 0.28, 1.5);
    osc(ac, dest, t, { freq: 170, endFreq: 70, gain: 0.22, dur: 0.08 });
    osc(ac, dest, t + 0.04, { type: "triangle", freq: 880, endFreq: 1320, gain: 0.12, dur: 0.16 });
    return;
  }
  const capture = kind === "capture";
  osc(ac, dest, t, {
    freq: capture ? 105 : 168,
    endFreq: capture ? 44 : 70,
    gain: capture ? 0.42 : 0.26,
    dur: capture ? 0.13 : 0.08,
  });
  noiseClick(ac, dest, t, capture ? 780 : 1650, capture ? 0.48 : 0.36, capture ? 0.85 : 1.7);
  if (capture) {
    osc(ac, dest, t + 0.02, { freq: 70, endFreq: 40, gain: 0.22, dur: 0.12 });
    noiseClick(ac, dest, t + 0.016, 520, 0.2, 0.6);
  }
  if (kind === "check") {
    osc(ac, dest, t + 0.03, { type: "triangle", freq: 880, endFreq: 1320, gain: 0.12, dur: 0.16 });
  }
}

function paintClick(ac: AudioContext, dest: AudioNode, kind: BoardSoundKind, t: number) {
  if (kind === "wrong") {
    osc(ac, dest, t, { type: "square", freq: 180, gain: 0.04, dur: 0.08 });
    return;
  }
  if (kind === "correct") {
    osc(ac, dest, t, { type: "square", freq: 620, gain: 0.035, dur: 0.03 });
    osc(ac, dest, t + 0.05, { type: "square", freq: 820, gain: 0.03, dur: 0.04 });
    return;
  }
  const capture = kind === "capture";
  osc(ac, dest, t, {
    type: "square",
    freq: capture ? 240 : 380,
    gain: capture ? 0.05 : 0.035,
    dur: 0.025,
  });
  if (kind === "check") {
    osc(ac, dest, t + 0.04, { type: "square", freq: 720, gain: 0.03, dur: 0.04 });
  }
}

function paintBeep(ac: AudioContext, dest: AudioNode, kind: BoardSoundKind, t: number) {
  if (kind === "wrong") {
    osc(ac, dest, t, { type: "square", freq: 170, gain: 0.045, dur: 0.18 });
    return;
  }
  if (kind === "correct") {
    osc(ac, dest, t, { freq: 523, gain: 0.05, dur: 0.09 });
    osc(ac, dest, t + 0.08, { freq: 659, gain: 0.04, dur: 0.12 });
    return;
  }
  if (kind === "capture") {
    osc(ac, dest, t, { type: "triangle", freq: 280, gain: 0.08, dur: 0.1 });
    osc(ac, dest, t + 0.02, { freq: 160, gain: 0.05, dur: 0.12 });
    return;
  }
  osc(ac, dest, t, { freq: 720, gain: 0.06, dur: 0.07 });
  if (kind === "check") {
    osc(ac, dest, t + 0.08, { freq: 880, gain: 0.04, dur: 0.1 });
  }
}

function paint(ac: AudioContext, kind: BoardSoundKind) {
  const master = ac.createGain();
  master.gain.value = 0.7;
  master.connect(ac.destination);
  const t = ac.currentTime + 0.004;
  if (pack === "wood") paintWood(ac, master, kind, t);
  else if (pack === "click") paintClick(ac, master, kind, t);
  else if (pack === "beep") paintBeep(ac, master, kind, t);
  else paintLichess(ac, master, kind, t);
}

export function playBoardSound(kind: BoardSoundKind) {
  if (!enabled) return;
  void runningContext().then((ac) => {
    if (!ac) return;
    paint(ac, kind);
  });
}
