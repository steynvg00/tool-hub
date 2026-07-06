// Astronomische seizoenen (equinoxen & zonnewendes) — Meeus, Astronomical Algorithms hfst. 27.
// Pure functie, draait in de browser. Nauwkeurig tot ~1 minuut voor jaren ~1000–3000.
// season index: 0 = lente-equinox, 1 = zomerzonnewende, 2 = herfst-equinox, 3 = winterzonnewende.

const JDE0_COEFFS: Record<number, number[]> = {
  0: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  1: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
  2: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  3: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
}

// 24 periodieke termen: [A, B (graden), C (graden)]
const TERMS: number[][] = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
  [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443],
  [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513],
  [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
  [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029],
  [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756],
  [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
]

const rad = (d: number) => (d * Math.PI) / 180

function seasonJDE(year: number, season: number): number {
  const Y = (year - 2000) / 1000
  const [a, b, c, d, e] = JDE0_COEFFS[season]
  const jde0 = a + b * Y + c * Y * Y + d * Y ** 3 + e * Y ** 4
  const T = (jde0 - 2451545.0) / 36525
  const W = rad(35999.373 * T - 2.47)
  const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W)
  let S = 0
  for (const [A, B, C] of TERMS) S += A * Math.cos(rad(B + C * T))
  return jde0 + (0.00001 * S) / dl
}

function jdToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)
  const dayFloat = b - d - Math.floor(30.6001 * e) + f
  const day = Math.floor(dayFloat)
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715
  const hoursFloat = (dayFloat - day) * 24
  const h = Math.floor(hoursFloat)
  const min = Math.floor((hoursFloat - h) * 60)
  const sec = Math.round(((hoursFloat - h) * 60 - min) * 60)
  return new Date(Date.UTC(year, month - 1, day, h, min, sec))
}

// Publiek: geeft de vier seizoenen van een jaar als UTC-Date-objecten.
export function seasonsForYear(year: number): { name: string; season: number; date: Date }[] {
  const names = ['Lente-equinox', 'Zomerzonnewende', 'Herfst-equinox', 'Winterzonnewende']
  return names.map((name, s) => {
    const jde = seasonJDE(year, s) - 69 / 86400 // 69s = TD→UTC (delta-T, benadering)
    return { name, season: s, date: jdToDate(jde) }
  })
}
