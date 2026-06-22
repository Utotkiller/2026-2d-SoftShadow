import { Vec2, clamp } from '../math/Vec2.js';
import { rgba } from '../math/color.js';

const TAU = Math.PI * 2;
const EPSILON = 1e-7;
const CORNER_EPSILON = 0.0008;
const BASE_RAY_COUNT = 160;

function addSegment(segments, a, b, owner = null) {
  segments.push({ a, b, owner });
}

function createSegments(scene) {
  const segments = [];
  const inset = 0.5;
  const topLeft = new Vec2(inset, inset);
  const topRight = new Vec2(scene.width - inset, inset);
  const bottomRight = new Vec2(scene.width - inset, scene.height - inset);
  const bottomLeft = new Vec2(inset, scene.height - inset);

  addSegment(segments, topLeft, topRight);
  addSegment(segments, topRight, bottomRight);
  addSegment(segments, bottomRight, bottomLeft);
  addSegment(segments, bottomLeft, topLeft);

  for (const box of scene.occluders) {
    const corners = box.corners();
    addSegment(segments, corners[0], corners[1], box);
    addSegment(segments, corners[1], corners[2], box);
    addSegment(segments, corners[2], corners[3], box);
    addSegment(segments, corners[3], corners[0], box);
  }

  return segments;
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function raySegmentDistance(origin, angle, segment, maxDistance) {
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  const segX = segment.b.x - segment.a.x;
  const segY = segment.b.y - segment.a.y;
  const denominator = cross(rayX, rayY, segX, segY);

  if (Math.abs(denominator) <= EPSILON) return null;

  const originToSegmentX = segment.a.x - origin.x;
  const originToSegmentY = segment.a.y - origin.y;
  const rayDistance = cross(originToSegmentX, originToSegmentY, segX, segY) / denominator;
  const segmentRatio = cross(originToSegmentX, originToSegmentY, rayX, rayY) / denominator;

  if (rayDistance < 0 || rayDistance > maxDistance || segmentRatio < 0 || segmentRatio > 1) return null;

  return rayDistance;
}

function castRay(origin, angle, segments, maxDistance) {
  let nearestDistance = maxDistance;
  let hitOwner = null;

  for (const segment of segments) {
    const distance = raySegmentDistance(origin, angle, segment, maxDistance);
    if (distance === null || distance >= nearestDistance) continue;

    nearestDistance = distance;
    hitOwner = segment.owner;
  }

  return {
    angle,
    point: Vec2.add(origin, Vec2.fromAngle(angle, nearestDistance)),
    distance: nearestDistance,
    owner: hitOwner
  };
}

function rayBoxDistance(origin, target, box) {
  const toTarget = Vec2.subtract(target, origin);
  const maxDistance = toTarget.length();
  if (maxDistance <= EPSILON) return null;

  const dirX = toTarget.x / maxDistance;
  const dirY = toTarget.y / maxDistance;
  let tMin = 0;
  let tMax = maxDistance;

  if (Math.abs(dirX) < EPSILON) {
    if (origin.x < box.left || origin.x > box.right) return null;
  } else {
    let tx1 = (box.left - origin.x) / dirX;
    let tx2 = (box.right - origin.x) / dirX;
    if (tx1 > tx2) [tx1, tx2] = [tx2, tx1];
    tMin = Math.max(tMin, tx1);
    tMax = Math.min(tMax, tx2);
    if (tMin > tMax) return null;
  }

  if (Math.abs(dirY) < EPSILON) {
    if (origin.y < box.top || origin.y > box.bottom) return null;
  } else {
    let ty1 = (box.top - origin.y) / dirY;
    let ty2 = (box.bottom - origin.y) / dirY;
    if (ty1 > ty2) [ty1, ty2] = [ty2, ty1];
    tMin = Math.max(tMin, ty1);
    tMax = Math.min(tMax, ty2);
    if (tMin > tMax) return null;
  }

  if (tMax < 0) return null;
  return Math.max(0, tMin);
}

function drawPolygonPath(context, points) {
  if (points.length < 3) return;

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.closePath();
}

export class SoftShadowRenderer {
  constructor() {
    this.lightCanvas = document.createElement('canvas');
    this.lightContext = this.lightCanvas.getContext('2d', { alpha: true });
    this.visibilityPolygon = [];
    this.rays = [];
  }

  drawLight(context, scene) {
    const polygon = this.buildVisibilityPolygon(scene);
    if (polygon.length < 3) return;

    this.ensureLightCanvas(scene.width, scene.height);
    const lightContext = this.lightContext;
    lightContext.setTransform(1, 0, 0, 1, 0, 0);
    lightContext.clearRect(0, 0, scene.width, scene.height);

    const light = scene.character.position;
    const radius = scene.characterLight.radius;
    const gradient = lightContext.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
    gradient.addColorStop(0, rgba(255, 246, 218, 0.90 * scene.characterLight.intensity));
    gradient.addColorStop(0.22, rgba(255, 244, 220, 0.42 * scene.characterLight.intensity));
    gradient.addColorStop(0.64, rgba(255, 244, 220, 0.10 * scene.characterLight.intensity));
    gradient.addColorStop(1, rgba(255, 255, 255, 0));

    lightContext.save();
    drawPolygonPath(lightContext, polygon);
    lightContext.clip();
    lightContext.fillStyle = gradient;
    lightContext.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
    lightContext.restore();

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.filter = 'blur(3px)';
    context.drawImage(this.lightCanvas, 0, 0, scene.width, scene.height);
    context.filter = 'none';
    context.drawImage(this.lightCanvas, 0, 0, scene.width, scene.height);
    context.restore();
  }

  drawRays(context, scene) {
    if (!scene.showRays || this.rays.length === 0) return;

    const light = scene.character.position;
    context.save();
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = 'rgba(255, 235, 170, 0.32)';
    context.lineWidth = 1;

    const stride = Math.max(1, Math.floor(this.rays.length / 80));
    for (let i = 0; i < this.rays.length; i += stride) {
      const ray = this.rays[i];
      context.beginPath();
      context.moveTo(light.x, light.y);
      context.lineTo(ray.point.x, ray.point.y);
      context.stroke();
    }

    context.restore();
  }

  getBoxLightAmount(scene, box) {
    const light = scene.character.position;
    const samples = [box.position, ...box.corners()];
    let visible = 0;

    for (const sample of samples) {
      if (this.isPointVisible(light, sample, scene.occluders, box)) {
        visible += 1;
      }
    }

    const visibility = visible / samples.length;
    const distance = Vec2.distance(light, box.position);
    const distanceFade = clamp(1 - distance / scene.characterLight.radius, 0, 1);
    return visibility * distanceFade;
  }

  buildVisibilityPolygon(scene) {
    const light = scene.character.position;
    const radius = scene.characterLight.radius;
    const segments = createSegments(scene);
    const angles = [];

    for (let i = 0; i < BASE_RAY_COUNT; i += 1) {
      angles.push((i / BASE_RAY_COUNT) * TAU);
    }

    for (const segment of segments) {
      const points = [segment.a, segment.b];
      for (const point of points) {
        const angle = Math.atan2(point.y - light.y, point.x - light.x);
        angles.push(angle - CORNER_EPSILON, angle, angle + CORNER_EPSILON);
      }
    }

    const rays = angles.map((angle) => castRay(light, angle, segments, radius));
    rays.sort((a, b) => a.angle - b.angle);

    this.rays = rays;
    this.visibilityPolygon = rays.map((ray) => ray.point);
    return this.visibilityPolygon;
  }

  isPointVisible(light, point, boxes, ignoredBox = null) {
    const pointDistance = Vec2.distance(light, point);

    for (const box of boxes) {
      if (box === ignoredBox) continue;

      const hitDistance = rayBoxDistance(light, point, box);
      if (hitDistance !== null && hitDistance < pointDistance - 0.75) {
        return false;
      }
    }

    return true;
  }

  ensureLightCanvas(width, height) {
    if (this.lightCanvas.width === width && this.lightCanvas.height === height) return;

    this.lightCanvas.width = width;
    this.lightCanvas.height = height;
  }
}
