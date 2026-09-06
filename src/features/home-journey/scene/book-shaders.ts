/**
 * Materials owned by the bound-book scene.
 *
 * The shared paper shader is intentionally kept for article/document surfaces.
 * These variants add the small amount of physical detail a hero prop needs:
 * a directional cloth weave on the cover and an ink-safe texture pass for
 * vertical page typography.  All noise is analytic and deterministic.
 */

export const BOOK_SURFACE_VERTEX_SHADER = /* glsl */ `
  uniform float uCloth;

  varying vec2 vUv;
  varying vec3 vNormalView;

  void main() {
    // RoundedBox is an extruded rounded shape; its generated cap UVs are
    // world-sized, not normalized. Project the cloth explicitly onto the cover.
    vec2 clothUv = vec2(position.x / 4.78 + 0.5, 0.5 - position.z / 3.28);
    vUv = mix(uv, clothUv, uCloth);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const BOOK_SEAM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const BOOK_SEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    float across = pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 3.0);
    float ends = smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.12, 1.0 - vUv.y);
    float alpha = across * ends * uOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * 0.65, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const BOOK_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uCloth;
  uniform float uOpacity;
  uniform float uInkDensity;
  uniform vec3 uPaper;
  uniform vec3 uPaperEdge;
  uniform vec3 uInk;
  uniform vec3 uGold;

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
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.075, edgeDistance);
    float grain = valueNoise(vUv * vec2(86.0, 36.0));
    float weaveA = sin(vUv.x * 420.0 + sin(vUv.y * 8.0) * 1.6) * 0.5 + 0.5;
    float weaveB = sin(vUv.y * 320.0 + cos(vUv.x * 7.0) * 1.2) * 0.5 + 0.5;
    float weave = (weaveA * 0.58 + weaveB * 0.42) * uCloth;
    float lineBand = 1.0 - smoothstep(0.035, 0.068, abs(fract(vUv.y * 8.0) - 0.5));
    float lineBreak = step(0.24, hash21(floor(vUv * vec2(26.0, 9.0))));
    float inkLine = lineBand * lineBreak * uInkDensity * (1.0 - uCloth);
    float facing = abs(vNormalView.z);
    float grazing = 0.82 + facing * 0.18;

    vec3 base = mix(uPaper, uPaperEdge, edge * 0.54 + (grain - 0.5) * 0.07);
    base = mix(base, base * (0.86 + weave * 0.14), uCloth);
    vec4 mapped = texture2D(uMap, vUv);
    vec3 color = mix(base, mapped.rgb, mapped.a * uHasMap);
    color = mix(color, uInk, inkLine * 0.24);
    color *= grazing;
    // Cloth has a soft directional sheen, rather than reading as a black hole.
    float sheen = pow(1.0 - facing, 2.0) * 0.11 + weave * 0.016;
    color = mix(color, uPaperEdge, sheen * uCloth);
    color = mix(color, uGold, edge * uCloth * 0.12);

    float alpha = max(mapped.a * uHasMap, 1.0 - uHasMap) * uOpacity;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const BOOK_PAGE_VERTEX_SHADER = /* glsl */ `
  uniform float uTurn;
  uniform float uWidth;

  varying vec2 vUv;
  varying float vShade;
  varying float vFold;

  void main() {
    vUv = uv;
    float t = clamp(position.x / max(0.001, uWidth), 0.0, 1.0);
    float turn = clamp(uTurn, 0.0, 1.0);
    float angle = turn * 3.14159265;
    float bend = sin(angle) * 0.82;
    float rootAngle = angle - bend * 0.5;
    float tangentAngle = rootAngle + bend * t;
    vec3 pagePosition = position;
    // Integrate the unit tangent of an arc. The sheet keeps its arc length,
    // turns in x/y about the z-axis spine, and never slides along its depth.
    // Both endpoint poses are exactly flat: +x at 0, -x at 1.
    if (bend > 0.0001) {
      pagePosition.x = uWidth * (sin(tangentAngle) - sin(rootAngle)) / bend;
      pagePosition.y = uWidth * (cos(rootAngle) - cos(tangentAngle)) / bend;
    } else {
      pagePosition.x = position.x * cos(angle);
      pagePosition.y = position.x * sin(angle);
    }
    vec3 normal = vec3(-sin(tangentAngle), cos(tangentAngle), 0.0);
    vec3 lightDirection = normalize(vec3(0.25, 0.88, 0.41));
    vShade = 0.76 + 0.24 * abs(dot(normal, lightDirection));
    vFold = sin(t * 3.14159265) * sin(angle);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pagePosition, 1.0);
  }
`

export const BOOK_PAGE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec3 uPaperEdge;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vShade;
  varying float vFold;

  void main() {
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec4 page = texture2D(uTexture, uv);
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.06, edgeDistance);
    vec3 color = page.rgb * (vShade - vFold * 0.08);
    color = mix(color, uPaperEdge, edge * 0.2);
    float alpha = page.a * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
