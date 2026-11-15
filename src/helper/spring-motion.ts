/** A sampled, analytic spring that can run as native transform/opacity keyframes. */
export type SpringState = { position: number; velocity: number }
export type SpringMotion = {
  duration: number
  target: number
  points: { offset: number; position: number }[]
  sample: (elapsed: number) => SpringState
}

const FREQUENCY = (2 * Math.PI) / 0.4
const DAMPING = 0.82
const DECAY = FREQUENCY * DAMPING
const OSCILLATION = FREQUENCY * Math.sqrt(1 - DAMPING ** 2)
const SAMPLE_MS = 1000 / 120

export const animationTime = () => Number(document.timeline.currentTime ?? performance.now())

export const createSpringMotion = (from: SpringState, target: number): SpringMotion => {
  const displacement = from.position - target
  const sine = (from.velocity + DECAY * displacement) / OSCILLATION
  const solve = (elapsed: number): SpringState => {
    const time = Math.max(0, elapsed) / 1000
    const decay = Math.exp(-DECAY * time)
    const cos = Math.cos(OSCILLATION * time)
    const sin = Math.sin(OSCILLATION * time)
    const wave = displacement * cos + sine * sin

    return {
      position: target + decay * wave,
      velocity: decay * ((sine * cos - displacement * sin) * OSCILLATION - DECAY * wave),
    }
  }

  const samples = [from.position]
  let duration = SAMPLE_MS

  for (; duration < 1500; duration += SAMPLE_MS) {
    const state = solve(duration)
    if (Math.abs(state.position - target) < 0.001 && Math.abs(state.velocity) < 0.01) break
    samples.push(state.position)
  }
  samples.push(target)

  return {
    duration,
    target,
    points: samples.map((position, index) => ({ offset: index / (samples.length - 1), position })),
    sample: (elapsed) => (elapsed >= duration ? { position: target, velocity: 0 } : solve(elapsed)),
  }
}
