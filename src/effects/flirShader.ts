import { PostProcessStage, type Viewer } from 'cesium'

// ---------------------------------------------------------------------------
// GLSL fragment shaders
// Cesium post-process convention:
//   in  : uniform sampler2D colorTexture + in vec2 v_textureCoordinates
//   out : out_FragColor
// ---------------------------------------------------------------------------

const FLIR_GLSL = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

void main() {
  vec4 c = texture(colorTexture, v_textureCoordinates);
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 thermal = mix(
    vec3(0.0,  0.18, 0.02),
    vec3(0.72, 1.0,  0.28),
    lum
  );
  out_FragColor = vec4(thermal, c.a);
}
`

const NVG_GLSL = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

void main() {
  vec4 c = texture(colorTexture, v_textureCoordinates);
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float boosted = pow(max(lum, 0.0), 0.65);
  out_FragColor = vec4(0.0, boosted * 0.92, boosted * 0.08, c.a);
}
`

// ---------------------------------------------------------------------------
// Stage state — module-level, idempotent per viewer lifecycle
// ---------------------------------------------------------------------------

let flirStage: PostProcessStage | null = null
let nvgStage: PostProcessStage | null = null
let initialized = false

export function initFlirShaderStages(viewer: Viewer): void {
  if (initialized) return
  initialized = true

  flirStage = new PostProcessStage({ fragmentShader: FLIR_GLSL })
  flirStage.enabled = false
  viewer.scene.postProcessStages.add(flirStage)

  nvgStage = new PostProcessStage({ fragmentShader: NVG_GLSL })
  nvgStage.enabled = false
  viewer.scene.postProcessStages.add(nvgStage)
}

export function cleanupShaderStages(viewer: Viewer): void {
  if (!initialized) return
  if (!viewer.isDestroyed()) {
    if (flirStage) viewer.scene.postProcessStages.remove(flirStage)
    if (nvgStage) viewer.scene.postProcessStages.remove(nvgStage)
  }
  flirStage = null
  nvgStage = null
  initialized = false
}

export function enableFLIR(): void {
  if (flirStage) flirStage.enabled = true
  if (nvgStage) nvgStage.enabled = false
}

export function enableNightVision(): void {
  if (flirStage) flirStage.enabled = false
  if (nvgStage) nvgStage.enabled = true
}

export function enableNormalEO(): void {
  if (flirStage) flirStage.enabled = false
  if (nvgStage) nvgStage.enabled = false
}
