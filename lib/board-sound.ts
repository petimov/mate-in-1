let audio: AudioContext | null = null;
let enabled = true;

export function setBoardSoundEnabled(value: boolean) {
  enabled = value;
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audio) audio = new Ctor();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.07,
  delay = 0,
) {
  const ac = context();
  if (!ac) return;
  const osc = ac.createOscillator();
  const node = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ac.currentTime + delay;
  node.gain.setValueAtTime(0.0001, start);
  node.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  node.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(node);
  node.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export type BoardSoundKind = "move" | "capture" | "wrong" | "correct";

export function playBoardSound(kind: BoardSoundKind) {
  if (!enabled) return;
  if (kind === "move") {
    beep(720, 0.07, "sine", 0.06);
    return;
  }
  if (kind === "capture") {
    beep(280, 0.1, "triangle", 0.08);
    beep(160, 0.12, "sine", 0.05, 0.02);
    return;
  }
  if (kind === "wrong") {
    beep(170, 0.18, "square", 0.045);
    return;
  }
  beep(523, 0.09, "sine", 0.05);
  beep(659, 0.12, "sine", 0.04, 0.08);
}
