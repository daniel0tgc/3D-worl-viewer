import { create } from 'zustand'
import type { Viewer } from 'cesium'

export type VisualMode = 'NORMAL' | 'CRT' | 'NVG' | 'FLIR' | 'ANIME' | 'NOIR' | 'SNOW' | 'AI_EDIT'
export type HudLayout = 'TACTICAL' | 'MINIMAL' | 'FULL'

export interface CameraInfo {
  id: string
  name: string
  lat: number
  lon: number
  snapshotUrl: string
}

export interface LayerState {
  aircraft: boolean
  satellites: boolean
  starlink: boolean
  cameras: boolean
  seismic: boolean
  grid: boolean
}

export interface SelectedEntity {
  id: string
  type: 'aircraft' | 'satellite' | 'camera' | 'seismic'
  metadata: Record<string, string | number | boolean>
}

interface WorldStore {
  viewer: Viewer | null
  setViewer: (viewer: Viewer) => void
  layers: LayerState
  toggleLayer: (layer: keyof LayerState) => void
  selectedEntity: SelectedEntity | null
  setSelectedEntity: (entity: SelectedEntity | null) => void
  visualMode: VisualMode
  setVisualMode: (mode: VisualMode) => void
  satelliteCount: number
  setSatelliteCount: (n: number) => void
  aircraftCount: number
  setAircraftCount: (n: number) => void
  seismicCount: number
  setSeismicCount: (n: number) => void
  consoleEvents: string[]
  addConsoleEvent: (msg: string) => void
  openCameraIds: string[]
  openCamera: (id: string) => void
  closeCamera: (id: string) => void
  cameraRegistry: Record<string, CameraInfo>
  setCameraRegistry: (r: Record<string, CameraInfo>) => void
  hudLayout: HudLayout
  setHudLayout: (l: HudLayout) => void
  hudVisible: boolean
  setHudVisible: (v: boolean) => void
  panopticEnabled: boolean
  togglePanoptic: () => void
  panopticDensity: number
  setPanopticDensity: (n: number) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  viewer: null,
  setViewer: (viewer) => set({ viewer }),

  layers: {
    aircraft: true,
    satellites: false,
    starlink: false,
    cameras: false,
    seismic: false,
    grid: false,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  selectedEntity: null,
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),

  visualMode: 'NORMAL',
  setVisualMode: (mode) => set({ visualMode: mode }),

  satelliteCount: 0,
  setSatelliteCount: (n) => set({ satelliteCount: n }),

  aircraftCount: 0,
  setAircraftCount: (n) => set({ aircraftCount: n }),

  seismicCount: 0,
  setSeismicCount: (n) => set({ seismicCount: n }),

  consoleEvents: [],
  addConsoleEvent: (msg) =>
    set((state) => ({
      consoleEvents: [msg, ...state.consoleEvents].slice(0, 8),
    })),

  openCameraIds: [],
  openCamera: (id) =>
    set((state) => {
      if (state.openCameraIds.includes(id) || state.openCameraIds.length >= 4) return state
      return { openCameraIds: [...state.openCameraIds, id] }
    }),
  closeCamera: (id) =>
    set((state) => ({ openCameraIds: state.openCameraIds.filter((c) => c !== id) })),
  cameraRegistry: {},
  setCameraRegistry: (r) => set({ cameraRegistry: r }),

  hudLayout: 'TACTICAL',
  setHudLayout: (l) => set({ hudLayout: l }),

  hudVisible: true,
  setHudVisible: (v) => set({ hudVisible: v }),

  panopticEnabled: false,
  togglePanoptic: () => set((s) => ({ panopticEnabled: !s.panopticEnabled })),

  panopticDensity: 50,
  setPanopticDensity: (n) => set({ panopticDensity: n }),
}))
