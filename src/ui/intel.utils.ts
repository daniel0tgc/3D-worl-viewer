import type { SelectedEntity } from '../store/useWorldStore'

export interface MetaRow {
  label: string
  value: string
}

export function getRows(s: SelectedEntity): MetaRow[] {
  const m = s.metadata
  if (s.type === 'aircraft') {
    const onGround = m.on_ground as boolean
    return [
      { label: 'CALLSIGN', value: String(m.callsign).toUpperCase() },
      { label: 'ALTITUDE', value: onGround ? 'ON GROUND' : `${(m.altitude_ft as number).toLocaleString()} FT` },
      { label: 'SPEED',    value: onGround ? '— KTS' : `${m.speed_kts} KTS` },
      { label: 'HEADING',  value: m.heading != null ? `${m.heading}°` : '—' },
      { label: 'COUNTRY',  value: String(m.origin_country).toUpperCase() },
      { label: 'ICAO24',   value: s.id.toUpperCase() },
    ]
  }
  if (s.type === 'satellite') {
    return [
      { label: 'NAME',         value: String(m.name) },
      { label: 'PERIOD',       value: `${m.period_min} MIN` },
      { label: 'INCLINATION',  value: `${m.inclination_deg}°` },
      { label: 'ECCENTRICITY', value: String(m.eccentricity) },
    ]
  }
  if (s.type === 'seismic') {
    const mag = m.mag as number
    const tier = mag < 2 ? 'MINOR' : mag < 4 ? 'LIGHT' : mag < 6 ? 'MODERATE' : mag < 7 ? 'STRONG' : 'MAJOR'
    return [
      { label: 'MAGNITUDE', value: `M${mag.toFixed(1)} ${tier}` },
      { label: 'DEPTH',     value: `${(m.depth_km as number).toFixed(1)} KM` },
      { label: 'LOCATION',  value: String(m.place).toUpperCase() },
      { label: 'TIME',      value: new Date(m.time_ms as number).toUTCString().replace('GMT', 'UTC') },
    ]
  }
  // camera
  return [
    { label: 'NAME',    value: String(m.name).toUpperCase() },
    { label: 'LAT/LON', value: `${(m.lat as number).toFixed(4)}, ${(m.lon as number).toFixed(4)}` },
  ]
}

/** Build a fresh metadata record from a live AircraftState-shaped object */
export function aircraftMetaToRecord(
  icao24: string,
  data: {
    callsign: string
    altitudeM: number
    velocityMs: number
    trueTrack: number
    originCountry: string
    onGround: boolean
  },
): SelectedEntity['metadata'] {
  return {
    callsign: data.callsign,
    altitude_ft: Math.round(data.altitudeM * 3.28084),
    speed_kts: Math.round(data.velocityMs * 1.944),
    heading: Math.round(data.trueTrack),
    origin_country: data.originCountry,
    on_ground: data.onGround,
    icao24,
  }
}
