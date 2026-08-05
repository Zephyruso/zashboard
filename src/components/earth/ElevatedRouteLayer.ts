import type { RouteCoordinate, RouteLegKind } from '@/components/earth/connectionRoutes'
import type {
  CustomLayerInterface,
  CustomLayerProjectionData,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl'

const EARTH_RADIUS_METERS = 6_371_008.8
const MIN_ARC_HEIGHT_METERS = 120_000
const MAX_ARC_HEIGHT_METERS = 1_500_000
const SURFACE_CLEARANCE_METERS = 8_000
const FLOATS_PER_VERTEX = 14

type Rgb = readonly [number, number, number]
type ElevatedPosition = readonly [number, number, number]

export interface ElevatedRouteLine {
  id: string
  leg: RouteLegKind
  coordinates: RouteCoordinate[]
  color: Rgb
  opacity: number
  progress: number
}

interface ProgramBundle {
  program: WebGLProgram
  projectionMatrix: WebGLUniformLocation | null
  tileMercatorCoords: WebGLUniformLocation | null
  clippingPlane: WebGLUniformLocation | null
  projectionTransition: WebGLUniformLocation | null
  fallbackMatrix: WebGLUniformLocation | null
  viewport: WebGLUniformLocation | null
  halfWidth: WebGLUniformLocation | null
  opacity: WebGLUniformLocation | null
  softness: WebGLUniformLocation | null
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const mercatorCoordinates = ([longitude, rawLatitude]: RouteCoordinate): RouteCoordinate => {
  const latitude = clamp(rawLatitude, -85.051129, 85.051129)
  const latitudeRadians = (latitude * Math.PI) / 180

  return [
    (longitude + 180) / 360,
    (1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2,
  ]
}

const greatCircleDistance = (from: RouteCoordinate, to: RouteCoordinate) => {
  const fromLatitude = (from[1] * Math.PI) / 180
  const toLatitude = (to[1] * Math.PI) / 180
  const longitudeDelta = ((to[0] - from[0]) * Math.PI) / 180
  const cosine =
    Math.sin(fromLatitude) * Math.sin(toLatitude) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta)

  return Math.acos(clamp(cosine, -1, 1)) * EARTH_RADIUS_METERS
}

const elevatedCoordinates = (
  coordinates: RouteCoordinate[],
  rawProgress: number,
): ElevatedPosition[] => {
  if (coordinates.length < 2) return []

  const progress = clamp(rawProgress, 0, 1)
  if (progress <= 0) return []

  const distance = greatCircleDistance(coordinates[0], coordinates.at(-1)!)
  const peakHeight = clamp(distance * 0.16, MIN_ARC_HEIGHT_METERS, MAX_ARC_HEIGHT_METERS)
  const lastIndex = coordinates.length - 1
  const position = progress * lastIndex
  const endIndex = Math.floor(position)
  const result: ElevatedPosition[] = []

  const append = (coordinate: RouteCoordinate, routeProgress: number) => {
    const [x, y] = mercatorCoordinates(coordinate)
    const arch = Math.sin(routeProgress * Math.PI) ** 0.82
    result.push([x, y, SURFACE_CLEARANCE_METERS + peakHeight * arch])
  }

  for (let index = 0; index <= endIndex; index += 1) {
    append(coordinates[index], index / lastIndex)
  }

  const segmentProgress = position - endIndex
  if (segmentProgress > 0 && endIndex < lastIndex) {
    const from = coordinates[endIndex]
    const to = coordinates[endIndex + 1]

    append(
      [
        from[0] + (to[0] - from[0]) * segmentProgress,
        from[1] + (to[1] - from[1]) * segmentProgress,
      ],
      progress,
    )
  }

  return result
}

const pushVertex = (
  target: number[],
  position: ElevatedPosition,
  previous: ElevatedPosition,
  next: ElevatedPosition,
  side: -1 | 1,
  color: Rgb,
  opacity: number,
) => {
  target.push(
    ...position,
    ...previous,
    ...next,
    side,
    color[0] / 255,
    color[1] / 255,
    color[2] / 255,
    clamp(opacity, 0, 1),
  )
}

const buildRouteVertices = (routes: ElevatedRouteLine[]) => {
  const vertices: number[] = []

  for (const route of routes) {
    const positions = elevatedCoordinates(route.coordinates, route.progress)

    for (let index = 0; index < positions.length - 1; index += 1) {
      const from = positions[index]
      const to = positions[index + 1]
      const fromPrevious = positions[Math.max(0, index - 1)]
      const toNext = positions[Math.min(positions.length - 1, index + 2)]

      pushVertex(vertices, from, fromPrevious, to, -1, route.color, route.opacity)
      pushVertex(vertices, from, fromPrevious, to, 1, route.color, route.opacity)
      pushVertex(vertices, to, from, toNext, -1, route.color, route.opacity)
      pushVertex(vertices, from, fromPrevious, to, 1, route.color, route.opacity)
      pushVertex(vertices, to, from, toNext, 1, route.color, route.opacity)
      pushVertex(vertices, to, from, toNext, -1, route.color, route.opacity)
    }
  }

  return new Float32Array(vertices)
}

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create elevated route shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader error'
    gl.deleteShader(shader)
    throw new Error(`Elevated route shader compilation failed: ${message}`)
  }

  return shader
}

const createProgram = (gl: WebGL2RenderingContext, input: CustomRenderMethodInput) => {
  const vertexSource = `#version 300 es
precision highp float;
${input.shaderData.define}
${input.shaderData.vertexShaderPrelude}

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_previous;
layout(location = 2) in vec3 a_next;
layout(location = 3) in float a_side;
layout(location = 4) in vec4 a_color;

uniform vec2 u_viewport;
uniform float u_half_width;

out vec4 v_color;
out float v_edge;

void main() {
  vec4 current = projectTileFor3D(a_position.xy, a_position.z);
  vec4 previous = projectTileFor3D(a_previous.xy, a_previous.z);
  vec4 next = projectTileFor3D(a_next.xy, a_next.z);

  if (current.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_color = vec4(0.0);
    v_edge = 1.0;
    return;
  }

  vec2 currentNdc = current.xy / current.w;
  vec2 previousNdc = previous.w > 0.0 ? previous.xy / previous.w : currentNdc;
  vec2 nextNdc = next.w > 0.0 ? next.xy / next.w : currentNdc;
  vec2 incomingPixels = (currentNdc - previousNdc) * u_viewport;
  vec2 outgoingPixels = (nextNdc - currentNdc) * u_viewport;
  float incomingLength = length(incomingPixels);
  float outgoingLength = length(outgoingPixels);
  vec2 incoming = incomingLength > 0.001
    ? incomingPixels / incomingLength
    : (outgoingLength > 0.001 ? outgoingPixels / outgoingLength : vec2(1.0, 0.0));
  vec2 outgoing = outgoingLength > 0.001 ? outgoingPixels / outgoingLength : incoming;
  vec2 tangentSum = incoming + outgoing;
  vec2 tangent = length(tangentSum) > 0.001 ? normalize(tangentSum) : outgoing;
  vec2 miter = vec2(-tangent.y, tangent.x);
  vec2 incomingNormal = vec2(-incoming.y, incoming.x);
  float miterScale = min(1.0 / max(abs(dot(miter, incomingNormal)), 0.35), 2.0);
  vec2 pixelOffset = miter * a_side * u_half_width * miterScale;

  gl_Position = current;
  gl_Position.xy += pixelOffset * 2.0 / u_viewport * current.w;
  v_color = a_color;
  v_edge = a_side;
}`

  const fragmentSource = `#version 300 es
precision highp float;

uniform float u_opacity;
uniform float u_softness;

in vec4 v_color;
in float v_edge;
out vec4 fragColor;

void main() {
  float edgeAlpha = 1.0 - smoothstep(
    max(0.0, 1.0 - u_softness),
    1.0,
    abs(v_edge)
  );
  float alpha = v_color.a * u_opacity * edgeAlpha;
  if (alpha < 0.001) discard;
  fragColor = vec4(v_color.rgb * alpha, alpha);
}`

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()

  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('Unable to create elevated route program')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown program error'
    gl.deleteProgram(program)
    throw new Error(`Elevated route program linking failed: ${message}`)
  }

  return {
    program,
    projectionMatrix: gl.getUniformLocation(program, 'u_projection_matrix'),
    tileMercatorCoords: gl.getUniformLocation(program, 'u_projection_tile_mercator_coords'),
    clippingPlane: gl.getUniformLocation(program, 'u_projection_clipping_plane'),
    projectionTransition: gl.getUniformLocation(program, 'u_projection_transition'),
    fallbackMatrix: gl.getUniformLocation(program, 'u_projection_fallback_matrix'),
    viewport: gl.getUniformLocation(program, 'u_viewport'),
    halfWidth: gl.getUniformLocation(program, 'u_half_width'),
    opacity: gl.getUniformLocation(program, 'u_opacity'),
    softness: gl.getUniformLocation(program, 'u_softness'),
  } satisfies ProgramBundle
}

const bindProjectionUniforms = (
  gl: WebGL2RenderingContext,
  bundle: ProgramBundle,
  projection: CustomLayerProjectionData,
) => {
  if (bundle.projectionMatrix) {
    gl.uniformMatrix4fv(bundle.projectionMatrix, false, projection.mainMatrix)
  }
  if (bundle.tileMercatorCoords) {
    gl.uniform4fv(bundle.tileMercatorCoords, projection.tileMercatorCoords)
  }
  if (bundle.clippingPlane) {
    gl.uniform4fv(bundle.clippingPlane, projection.clippingPlane)
  }
  if (bundle.projectionTransition) {
    gl.uniform1f(bundle.projectionTransition, projection.projectionTransition)
  }
  if (bundle.fallbackMatrix) {
    gl.uniformMatrix4fv(bundle.fallbackMatrix, false, projection.fallbackMatrix)
  }
}

export class ElevatedRouteLayer implements CustomLayerInterface {
  readonly id = 'connection-routes-elevated'
  readonly type = 'custom' as const
  readonly renderingMode = '3d' as const

  private map: MapLibreMap | null = null
  private buffer: WebGLBuffer | null = null
  private programs = new Map<string, ProgramBundle>()
  private vertexData = new Float32Array()
  private vertexCount = 0
  private bufferDirty = true

  setData(routes: ElevatedRouteLine[]) {
    this.vertexData = buildRouteVertices(routes)
    this.vertexCount = this.vertexData.length / FLOATS_PER_VERTEX
    this.bufferDirty = true
    this.map?.triggerRepaint()
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext) {
    this.map = map
    this.buffer = gl.createBuffer()
    if (!this.buffer) throw new Error('Unable to create elevated route buffer')
  }

  render(gl: WebGL2RenderingContext, input: CustomRenderMethodInput) {
    if (!this.buffer) return

    if (this.bufferDirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW)
      this.bufferDirty = false
    }
    if (this.vertexCount === 0) return

    let bundle = this.programs.get(input.shaderData.variantName)
    if (!bundle) {
      bundle = createProgram(gl, input)
      this.programs.set(input.shaderData.variantName, bundle)
    }

    gl.useProgram(bundle.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)

    const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * 4)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 9 * 4)
    gl.enableVertexAttribArray(4)
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 10 * 4)

    bindProjectionUniforms(gl, bundle, input.defaultProjectionData)
    gl.uniform2f(bundle.viewport, gl.drawingBufferWidth, gl.drawingBufferHeight)

    const zoomScale = 0.88 + Math.min(this.map?.getZoom() ?? 0, 6) * 0.08
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.CULL_FACE)
    gl.depthMask(false)

    gl.uniform1f(bundle.halfWidth, 3.2 * zoomScale)
    gl.uniform1f(bundle.opacity, 0.2)
    gl.uniform1f(bundle.softness, 1)
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount)

    gl.uniform1f(bundle.halfWidth, 0.78 * zoomScale)
    gl.uniform1f(bundle.opacity, 0.94)
    gl.uniform1f(bundle.softness, 0.34)
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount)
  }

  onRemove(_map: MapLibreMap, gl: WebGL2RenderingContext) {
    if (this.buffer) gl.deleteBuffer(this.buffer)
    for (const bundle of this.programs.values()) gl.deleteProgram(bundle.program)
    this.programs.clear()
    this.buffer = null
    this.map = null
  }
}
