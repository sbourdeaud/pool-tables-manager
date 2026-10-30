// Audio cues ported from the classic app. All cues respect the "Audio Cues"
// device preference (localStorage 'audio_cues').

export function audioEnabled(): boolean {
  return localStorage.getItem('audio_cues') !== 'false'
}

let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (!audioEnabled()) return null
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    try {
      audioContext = new Ctx()
    } catch {
      return null
    }
  }
  return audioContext
}

/** Crisp mechanical click: a short high square blip plus a low thump. */
export function playClickSound() {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  const duration = 0.03

  const osc1 = ctx.createOscillator()
  osc1.type = 'square'
  osc1.frequency.setValueAtTime(1200, now)
  const gain1 = ctx.createGain()
  gain1.gain.setValueAtTime(0.08, now)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + duration)

  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(80, now)
  const gain2 = ctx.createGain()
  gain2.gain.setValueAtTime(0.1, now)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now)
  osc2.stop(now + duration * 0.5)
}

/** Pool ball knock — used for the logo and when a session starts. */
export function playPoolBallSound() {
  if (!audioEnabled()) return
  const audio = new Audio('/sounds/pool-ball.mp3')
  audio.volume = 0.5
  void audio.play().catch(() => {
    /* autoplay may be blocked before the first user gesture */
  })
}

function ringBell({ freq, duration, overtones, gain }: { freq: number; duration: number; overtones: number[]; gain: number }) {
  const ctx = getContext()
  if (!ctx) return
  const t0 = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t0)
  master.gain.linearRampToValueAtTime(gain, t0 + 0.005)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  master.connect(ctx.destination)

  const partialGains = [1, 0.5, 0.3, 0.18]
  ;[freq, ...overtones.map((o) => freq * o)].forEach((partial, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = partial
    const g = ctx.createGain()
    g.gain.value = partialGains[i] || 0.1
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.1)
  })
}

/** Bright notification chime for new drink orders on the dashboard. */
export function playNewOrderChime() {
  if (!audioEnabled()) return
  ringBell({ freq: 2200, duration: 1.6, overtones: [2.4, 3.1, 4.2], gain: 0.25 })
}

const CLICK_SELECTOR = 'button, select, input[type="checkbox"], input[type="radio"], [role="button"], [role="switch"], [role="tab"], [role="option"]'

/**
 * Global click cue for interactive controls (mirrors the classic app's global
 * listener). Plain navigation links are intentionally excluded — the logo plays
 * its own pool-ball sound instead.
 */
export function installClickSounds(): () => void {
  const handler = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest(CLICK_SELECTOR)) playClickSound()
  }
  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
}
