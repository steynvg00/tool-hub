// Astronomical seasons — the exact instants of the equinoxes and solstices.
//
// NOTE: This is a stand-in implementation (Meeus, *Astronomical Algorithms*,
// ch. 27) so the app builds and the Seasons tool works. If a canonical
// seasons.ts is dropped in later, it only needs to keep this same public API:
//   seasonsForYear(year) -> Season[]  with each `date` a UTC Date.
//
// Results are in Terrestrial/Dynamical Time; ΔT (~1 minute this century) is not
// applied, so treat the instants as astronomical approximations, not UTC to the
// second.

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter'

export interface Season {
  name: SeasonName
  /** Dutch display label, e.g. "Lente (equinox maart)". */
  label: string
  /** The astronomical instant as a UTC Date. */
  date: Date
}

// Mean-time (JDE0) polynomials in Y = (year - 2000) / 1000, valid 1000–3000.
const MEAN = {
  spring: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  summer: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
  autumn: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  winter: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
} as const

// Periodic terms (Table 27.C): [A, B°, C°]. S = Σ A·cos(B + C·T).
const TERMS: [number, number, number][] = [
  [485, 324.96, 1934.136],
  [203, 337.23, 32964.467],
  [199, 342.08, 20.186],
  [182, 27.85, 445267.112],
  [156, 73.14, 45036.886],
  [136, 171.52, 22518.443],
  [77, 222.54, 65928.934],
  [74, 296.72, 3034.906],
  [70, 243.58, 9037.513],
  [58, 119.81, 33718.147],
  [52, 297.17, 150.678],
  [50, 21.02, 2281.226],
  [45, 247.54, 29929.562],
  [44, 325.15, 31555.956],
  [29, 60.93, 4443.417],
  [18, 155.12, 67555.328],
  [17, 288.79, 4562.452],
  [16, 198.04, 62894.029],
  [14, 199.76, 31436.921],
  [12, 95.39, 14577.848],
  [12, 287.11, 31931.756],
  [12, 320.81, 34777.259],
  [9, 227.73, 1222.114],
  [8, 15.45, 16859.074]
]

const RAD = Math.PI / 180

/** Julian Ephemeris Day → UTC Date (JD 2440587.5 = 1970-01-01T00:00:00Z). */
function jdeToDate(jde: number): Date {
  return new Date((jde - 2440587.5) * 86400000)
}

function meanJDE(coeffs: readonly number[], y: number): number {
  return coeffs[0] + coeffs[1] * y + coeffs[2] * y ** 2 + coeffs[3] * y ** 3 + coeffs[4] * y ** 4
}

function correct(jde0: number): number {
  const t = (jde0 - 2451545.0) / 36525
  const w = 35999.373 * t - 2.47
  const dLambda = 1 + 0.0334 * Math.cos(w * RAD) + 0.0007 * Math.cos(2 * w * RAD)
  let s = 0
  for (const [a, b, c] of TERMS) s += a * Math.cos((b + c * t) * RAD)
  return jde0 + (0.00001 * s) / dLambda
}

const LABELS: Record<SeasonName, string> = {
  spring: 'Lente (equinox maart)',
  summer: 'Zomer (zonnewende juni)',
  autumn: 'Herfst (equinox september)',
  winter: 'Winter (zonnewende december)'
}

/**
 * The four season-start instants for a given year, in calendar order:
 * March equinox, June solstice, September equinox, December solstice.
 */
export function seasonsForYear(year: number): Season[] {
  const y = (year - 2000) / 1000
  return (Object.keys(MEAN) as SeasonName[]).map((name) => ({
    name,
    label: LABELS[name],
    date: jdeToDate(correct(meanJDE(MEAN[name], y)))
  }))
}
