// =============================================================
//  CRT post-processing — scanlines, aperture grille, barrel
//  distortion, phosphor bloom, vignette, mains flicker.
//
//  WebGL only. Under the Canvas renderer every entry point here
//  degrades to a no-op and the game renders undistorted.
//  Toggle at runtime with C.
// =============================================================

const CRT_ENABLED_DEFAULT = true;

const CRT_FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2  uResolution;
uniform float uTime;
uniform float uAmount;      // 0 = clean, 1 = full CRT

varying vec2 outTexCoord;

// Pincushion/barrel warp around screen centre. Kept gentle (0.030): stronger
// values push the HUD at (8,6) off the tube \u2014 measured, not guessed.
vec2 barrel(vec2 uv, float k) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + k * r2;
  return c * 0.5 + 0.5;
}

// Cheap hash for grain.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float amt = clamp(uAmount, 0.0, 1.0);
  vec2 uv = mix(outTexCoord, barrel(outTexCoord, 0.030), amt);

  // Off-tube samples read as black rather than smearing the edge pixel.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Chromatic aberration: the beam misconverges further from centre.
  vec2 fromCentre = uv - 0.5;
  float ca = 0.0016 * amt;
  vec3 col;
  col.r = texture2D(uMainSampler, uv + fromCentre * ca).r;
  col.g = texture2D(uMainSampler, uv).g;
  col.b = texture2D(uMainSampler, uv - fromCentre * ca).b;

  // Phosphor bloom: bright areas bleed into their neighbours.
  vec2 px = 1.0 / uResolution;
  vec3 blur = vec3(0.0);
  blur += texture2D(uMainSampler, uv + vec2( px.x,  0.0)).rgb;
  blur += texture2D(uMainSampler, uv + vec2(-px.x,  0.0)).rgb;
  blur += texture2D(uMainSampler, uv + vec2( 0.0,  px.y)).rgb;
  blur += texture2D(uMainSampler, uv + vec2( 0.0, -px.y)).rgb;
  blur *= 0.25;
  float lum = dot(blur, vec3(0.299, 0.587, 0.114));
  col += blur * smoothstep(0.72, 1.0, lum) * 0.30 * amt;

  // Scanlines, locked to the output surface so they stay crisp.
  float line = sin(uv.y * uResolution.y * 3.14159);
  col *= 1.0 - 0.18 * amt * line * line;

  // Aperture grille: R/G/B stripes on a three-pixel cycle.
  float stripe = mod(gl_FragCoord.x, 3.0);
  vec3 mask = vec3(1.0);
  if      (stripe < 1.0) mask = vec3(1.06, 0.94, 0.94);
  else if (stripe < 2.0) mask = vec3(0.94, 1.06, 0.94);
  else                   mask = vec3(0.94, 0.94, 1.06);
  col *= mix(vec3(1.0), mask, amt);

  // Mains hum: a slow, very slight brightness wobble.
  col *= 1.0 - 0.015 * amt * sin(uTime * 8.0);

  // Sensor grain.
  col += (hash(uv * uResolution + uTime) - 0.5) * 0.018 * amt;

  // Vignette.
  float v = 1.0 - dot(fromCentre, fromCentre) * 0.55 * amt;
  col *= v;

  // Lift blacks slightly — a real tube never reaches zero.
  col = max(col, vec3(0.012 * amt));

  gl_FragColor = vec4(col, 1.0);
}
`;

let CRTPipeline = null;

// Phaser.Renderer.WebGL is undefined under the Canvas renderer, so the class
// is only defined when there is a base class to extend.
if (typeof Phaser !== 'undefined' && Phaser.Renderer.WebGL && Phaser.Renderer.WebGL.Pipelines.PostFXPipeline) {
  CRTPipeline = class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
      super({ game, name: 'CRT', fragShader: CRT_FRAG });
      this.amount = CRT_ENABLED_DEFAULT ? 1 : 0;
      this._t = 0;
    }
    onPreRender() {
      this._t += 1 / 60;
      this.set1f('uTime', this._t);
      this.set1f('uAmount', this.amount);
      this.set2f('uResolution', this.renderer.width, this.renderer.height);
    }
  };
}

const CRT = {
  available: () => CRTPipeline !== null,
  enabled: CRT_ENABLED_DEFAULT,

  // Registers the pipeline with the renderer. No-op without WebGL.
  register(game) {
    if (!CRTPipeline || !game.renderer.pipelines) return false;
    if (!game.renderer.pipelines.getPostPipeline('CRT')) {
      game.renderer.pipelines.addPostPipeline('CRT', CRTPipeline);
    }
    return true;
  },

  // Attaches the effect to a scene's main camera and binds the C toggle.
  apply(scene) {
    if (!CRTPipeline || !scene.cameras.main.setPostPipeline) return false;
    if (!CRT.register(scene.game)) return false;

    scene.cameras.main.setPostPipeline(CRTPipeline);
    CRT._sync(scene);

    scene.input.keyboard.on('keydown-C', () => {
      CRT.enabled = !CRT.enabled;
      CRT._sync(scene);
    });
    return true;
  },

  _sync(scene) {
    const p = scene.cameras.main.getPostPipeline(CRTPipeline);
    const list = Array.isArray(p) ? p : [p];
    list.forEach(pipe => { if (pipe) pipe.amount = CRT.enabled ? 1 : 0; });
  },
};
