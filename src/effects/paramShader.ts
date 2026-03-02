import { PostProcessStage, type Viewer } from 'cesium'

const PARAM_GLSL = `
uniform sampler2D colorTexture;
uniform float u_pixelation;
uniform float u_distortion;
uniform float u_instability;
uniform float u_time;
in vec2 v_textureCoordinates;

void main() {
  vec2 uv = v_textureCoordinates;
  vec2 res = vec2(czm_viewport.z, czm_viewport.w);

  // Barrel distortion
  if (u_distortion > 0.001) {
    vec2 centered = uv * 2.0 - 1.0;
    float r2 = dot(centered, centered);
    centered *= 1.0 + u_distortion * 0.25 * r2;
    uv = (centered + 1.0) * 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      out_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // Frame instability — horizontal jitter per scanline
  if (u_instability > 0.001) {
    float scanline = floor(uv.y * res.y);
    float noise = fract(sin(scanline * 127.1 + u_time * 31.7) * 43758.5);
    uv.x += (noise - 0.5) * u_instability * 0.012;
  }

  // Pixelation
  if (u_pixelation > 0.001) {
    float pxSize = 2.0 + u_pixelation * 20.0;
    uv = floor(uv * res / pxSize) * pxSize / res;
  }

  vec4 c = texture(colorTexture, clamp(uv, 0.0, 1.0));

  // Instability grain overlay
  if (u_instability > 0.001) {
    float grain = fract(sin(dot(v_textureCoordinates + u_time * 0.6, vec2(127.1, 311.7))) * 43758.5);
    c.rgb += (grain - 0.5) * u_instability * 0.10;
  }

  out_FragColor = c;
}
`

let paramStage: PostProcessStage | null = null

export interface ParamUniforms {
  pixelation: number
  distortion: number
  instability: number
}

export function initParamStage(viewer: Viewer): void {
  if (paramStage) return
  paramStage = new PostProcessStage({
    fragmentShader: PARAM_GLSL,
    uniforms: {
      u_pixelation:  0.0,
      u_distortion:  0.0,
      u_instability: 0.0,
      u_time:        () => (performance.now() / 1000) % 1000,
    },
  })
  paramStage.enabled = true
  viewer.scene.postProcessStages.add(paramStage)
}

export function cleanupParamStage(viewer: Viewer): void {
  if (!paramStage) return
  if (!viewer.isDestroyed()) {
    viewer.scene.postProcessStages.remove(paramStage)
  }
  paramStage = null
}

export function setParamUniforms({ pixelation, distortion, instability }: ParamUniforms): void {
  if (!paramStage) return
  const u = paramStage.uniforms as Record<string, number | (() => number)>
  u['u_pixelation']  = pixelation
  u['u_distortion']  = distortion
  u['u_instability'] = instability
}
