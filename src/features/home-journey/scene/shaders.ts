export const POINT_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;

  uniform float uPixelRatio;
  uniform float uScale;

  varying float vAlpha;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = 9.0 / max(1.0, -viewPosition.z);

    vAlpha = aAlpha;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * uPixelRatio * uScale * perspective, 0.7, 5.2);
  }
`

export const POINT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.04, 0.5, radius);
    float halo = 1.0 - smoothstep(0.15, 0.5, radius);
    float alpha = (core * 0.72 + halo * 0.28) * vAlpha * uOpacity;

    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const PAPER_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;

  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const PAPER_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uPaper;
  uniform vec3 uPaperEdge;
  uniform vec3 uInk;
  uniform float uOpacity;
  uniform float uInkDensity;

  varying vec2 vUv;
  varying vec3 vNormalView;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 345.45));
    point += dot(point, point + 34.345);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), local.x),
      local.y
    );
  }

  void main() {
    float longFiber = valueNoise(vec2(vUv.x * 46.0, vUv.y * 7.0));
    float shortFiber = valueNoise(vec2(vUv.x * 210.0, vUv.y * 54.0));
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.085, edgeDistance);
    float grazing = 0.72 + abs(vNormalView.z) * 0.28;
    float grain = (longFiber - 0.5) * 0.09 + (shortFiber - 0.5) * 0.035;

    float lineBand = 1.0 - smoothstep(0.035, 0.065, abs(fract(vUv.y * 8.0) - 0.5));
    float lineBreak = step(0.23, hash21(floor(vUv * vec2(24.0, 8.0))));
    float inkLine = lineBand * lineBreak * uInkDensity;

    vec3 paper = mix(uPaper, uPaperEdge, edge * 0.58 + grain);
    vec3 color = mix(paper, uInk, inkLine * 0.28) * grazing;

    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const TURNING_PAGE_VERTEX_SHADER = /* glsl */ `
  uniform float uTurn;

  varying vec2 vUv;
  varying float vLift;

  void main() {
    float angle = uTurn * 3.14159265359;
    float bend = sin(uv.x * 3.14159265359) * sin(angle) * 0.28;
    float ripple = sin((uv.x * 2.4 + uv.y) * 3.14159265359) * sin(angle) * 0.035;
    vec3 pagePosition = position;

    pagePosition.x = position.x * cos(angle);
    pagePosition.y = position.x * sin(angle) + bend + ripple;
    vUv = uv;
    vLift = clamp((pagePosition.y + 0.18) / 4.8, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pagePosition, 1.0);
  }
`

export const TURNING_PAGE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uPaper;
  uniform vec3 uPaperEdge;
  uniform vec3 uInk;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vLift;

  float hash21(vec2 point) {
    point = fract(point * vec2(113.1, 311.7));
    point += dot(point, point + 19.19);
    return fract(point.x * point.y);
  }

  void main() {
    float fibers = hash21(floor(vUv * vec2(180.0, 72.0)));
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.04, edgeDistance);
    float row = 1.0 - smoothstep(0.025, 0.052, abs(fract(vUv.y * 10.0) - 0.5));
    float segment = step(0.27, hash21(floor(vUv * vec2(29.0, 10.0))));
    float textMask = row * segment * smoothstep(0.12, 0.2, vUv.x) *
      (1.0 - smoothstep(0.82, 0.9, vUv.x));

    vec3 paper = mix(uPaper, uPaperEdge, edge * 0.62 + (fibers - 0.5) * 0.045);
    vec3 color = mix(paper, uInk, textMask * 0.34);
    color *= 0.82 + vLift * 0.18;

    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const RADIAL_LIGHT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const RADIAL_LIGHT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform float uOpacity;
  uniform float uInnerRadius;

  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.0, uInnerRadius, radius);
    float halo = 1.0 - smoothstep(uInnerRadius * 0.45, 0.72, radius);
    float alpha = max(core, halo * 0.52) * uOpacity;

    if (alpha < 0.003) discard;

    gl_FragColor = vec4(mix(uEdge, uCore, core), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
