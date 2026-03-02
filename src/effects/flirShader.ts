import { PostProcessStage, type Viewer } from 'cesium'

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

const ANIME_GLSL = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
void main() {
  vec2 uv = v_textureCoordinates;
  vec2 texel = vec2(1.0 / czm_viewport.z, 1.0 / czm_viewport.w);
  vec3 tl = texture(colorTexture, uv + vec2(-texel.x, -texel.y)).rgb;
  vec3 t  = texture(colorTexture, uv + vec2(0.0,      -texel.y)).rgb;
  vec3 tr = texture(colorTexture, uv + vec2( texel.x, -texel.y)).rgb;
  vec3 l  = texture(colorTexture, uv + vec2(-texel.x,  0.0    )).rgb;
  vec3 r  = texture(colorTexture, uv + vec2( texel.x,  0.0    )).rgb;
  vec3 bl = texture(colorTexture, uv + vec2(-texel.x,  texel.y)).rgb;
  vec3 b  = texture(colorTexture, uv + vec2(0.0,       texel.y)).rgb;
  vec3 br = texture(colorTexture, uv + vec2( texel.x,  texel.y)).rgb;
  vec3 gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  vec3 gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = length(vec2(length(gx), length(gy)));
  vec4 c = texture(colorTexture, uv);
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 saturated = mix(vec3(lum), c.rgb, 1.8);
  vec3 result = saturated * (1.0 - clamp(edge * 3.0, 0.0, 0.85));
  out_FragColor = vec4(result, c.a);
}
`

const NOIR_GLSL = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
void main() {
  vec4 c = texture(colorTexture, v_textureCoordinates);
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float contrast = clamp((lum - 0.5) * 2.5 + 0.5, 0.0, 1.0);
  out_FragColor = vec4(vec3(contrast), c.a);
}
`

const AI_EDIT_GLSL = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
void main() {
  vec2 uv = v_textureCoordinates;
  vec2 res = vec2(czm_viewport.z, czm_viewport.w);
  float pixelSize = 3.0;
  vec2 pixelated = floor(uv * res / pixelSize) * pixelSize / res;
  vec4 c = texture(colorTexture, pixelated);
  vec2 grid = fract(uv * res / 8.0);
  float gridLine = step(0.92, grid.x) + step(0.92, grid.y);
  vec3 col = c.rgb + gridLine * vec3(0.0, 0.06, 0.08);
  out_FragColor = vec4(col, c.a);
}
`

let flirStage:   PostProcessStage | null = null
let nvgStage:    PostProcessStage | null = null
let animeStage:  PostProcessStage | null = null
let noirStage:   PostProcessStage | null = null
let aiEditStage: PostProcessStage | null = null
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

  animeStage = new PostProcessStage({ fragmentShader: ANIME_GLSL })
  animeStage.enabled = false
  viewer.scene.postProcessStages.add(animeStage)

  noirStage = new PostProcessStage({ fragmentShader: NOIR_GLSL })
  noirStage.enabled = false
  viewer.scene.postProcessStages.add(noirStage)

  aiEditStage = new PostProcessStage({ fragmentShader: AI_EDIT_GLSL })
  aiEditStage.enabled = false
  viewer.scene.postProcessStages.add(aiEditStage)
}

function disableAll(): void {
  if (flirStage)   flirStage.enabled   = false
  if (nvgStage)    nvgStage.enabled    = false
  if (animeStage)  animeStage.enabled  = false
  if (noirStage)   noirStage.enabled   = false
  if (aiEditStage) aiEditStage.enabled = false
}

export function cleanupShaderStages(viewer: Viewer): void {
  if (!initialized) return
  if (!viewer.isDestroyed()) {
    if (flirStage)   viewer.scene.postProcessStages.remove(flirStage)
    if (nvgStage)    viewer.scene.postProcessStages.remove(nvgStage)
    if (animeStage)  viewer.scene.postProcessStages.remove(animeStage)
    if (noirStage)   viewer.scene.postProcessStages.remove(noirStage)
    if (aiEditStage) viewer.scene.postProcessStages.remove(aiEditStage)
  }
  flirStage = nvgStage = animeStage = noirStage = aiEditStage = null
  initialized = false
}

export function enableFLIR():      void { disableAll(); if (flirStage)   flirStage.enabled   = true }
export function enableNightVision(): void { disableAll(); if (nvgStage)    nvgStage.enabled    = true }
export function enableNormalEO():  void { disableAll() }
export function enableAnime():     void { disableAll(); if (animeStage)  animeStage.enabled  = true }
export function enableNoir():      void { disableAll(); if (noirStage)   noirStage.enabled   = true }
export function enableAiEdit():    void { disableAll(); if (aiEditStage) aiEditStage.enabled = true }
