import { Vec2, clamp, normalizeAngle } from '../math/Vec2.js';

const TAU = Math.PI * 2;
const EPSILON = 1e-7;

function polygon(context, points) {
  if (points.length < 3) return;

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.closePath();
  context.fill();
}

function projectPoint(point, lightPosition, distance) {
  const direction = Vec2.subtract(point, lightPosition);
  const length = direction.length();

  if (length <= EPSILON) return point.clone();

  direction.multiplyScalar(1 / length);
  return Vec2.add(point, Vec2.multiplyScalar(direction, distance));
}

function angleFromLight(point, lightPosition) {
  return normalizeAngle(Math.atan2(point.y - lightPosition.y, point.x - lightPosition.x));
}

function getAngularSpan(points, lightPosition) {
  const entries = points
    .map((point) => ({ point, angle: angleFromLight(point, lightPosition) }))
    .sort((a, b) => a.angle - b.angle);

  let largestGap = -Infinity;
  let gapIndex = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const current = entries[i].angle;
    const next = entries[(i + 1) % entries.length].angle + (i === entries.length - 1 ? TAU : 0);
    const gap = next - current;

    if (gap > largestGap) {
      largestGap = gap;
      gapIndex = i;
    }
  }

  const startIndex = (gapIndex + 1) % entries.length;
  const endIndex = gapIndex;
  const span = TAU - largestGap;

  if (span <= 0 || span > Math.PI * 1.3) return null;

  return {
    start: entries[startIndex],
    end: entries[endIndex],
    span
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

function sampleVisibleFromLight(sample, caster, occluders, lightPosition) {
  const sampleDistance = Vec2.distance(lightPosition, sample);

  for (const other of occluders) {
    if (other === caster) continue;

    const hitDistance = rayBoxDistance(lightPosition, sample, other);
    if (hitDistance !== null && hitDistance < sampleDistance - 0.75) {
      return false;
    }
  }

  return true;
}

function casterReceivesLight(caster, occluders, lightPosition, lightRadius) {
  const centerDistance = Vec2.distance(lightPosition, caster.position);
  if (centerDistance > lightRadius + caster.size * 1.5) return false;

  const samples = [caster.position, ...caster.corners()];
  return samples.some((sample) => sampleVisibleFromLight(sample, caster, occluders, lightPosition));
}

export class SoftShadowRenderer {
  constructor() {
    this.penumbraLayers = 12;
    this.umbraAlpha = 0.56;
    this.penumbraAlpha = 0.18;
  }

  draw(context, scene) {
    const lightPosition = scene.character.position;
    const shadowDistance = Math.hypot(scene.width, scene.height) * 1.45;

    context.save();
    context.globalCompositeOperation = 'source-over';

    for (const caster of scene.occluders) {
      if (caster.contains(lightPosition)) continue;
      if (!casterReceivesLight(caster, scene.occluders, lightPosition, scene.characterLight.radius)) continue;

      const corners = caster.corners();
      const span = getAngularSpan(corners, lightPosition);
      if (!span) continue;

      const distance = Vec2.distance(lightPosition, caster.position);
      const lightFade = clamp(1 - distance / scene.characterLight.radius, 0, 1);
      if (lightFade <= 0.02) continue;

      const startPoint = span.start.point;
      const endPoint = span.end.point;
      const startFar = projectPoint(startPoint, lightPosition, shadowDistance);
      const endFar = projectPoint(endPoint, lightPosition, shadowDistance);

      context.fillStyle = `rgba(0, 0, 0, ${this.umbraAlpha * lightFade})`;
      polygon(context, [startPoint, endPoint, endFar, startFar]);

      const spread = this.computeSpread(scene, distance, span.span);
      this.drawPenumbra(context, lightPosition, startPoint, span.start.angle, -1, shadowDistance, spread, lightFade);
      this.drawPenumbra(context, lightPosition, endPoint, span.end.angle, 1, shadowDistance, spread, lightFade);

      if (scene.debug) {
        this.drawDebug(context, lightPosition, startPoint, endPoint, startFar, endFar);
      }
    }

    context.restore();
  }

  computeSpread(scene, casterDistance, angularSpan) {
    const radiusTerm = scene.character.radius / Math.max(casterDistance, 1);
    const edgeTerm = angularSpan * 0.24;
    return clamp((radiusTerm + edgeTerm) * scene.shadowSoftness, 0.03, 0.38);
  }

  drawPenumbra(context, lightPosition, originPoint, baseAngle, sign, shadowDistance, spread, lightFade) {
    const originDistance = Vec2.distance(lightPosition, originPoint);
    const farDistance = originDistance + shadowDistance;

    for (let i = 0; i < this.penumbraLayers; i += 1) {
      const t0 = i / this.penumbraLayers;
      const t1 = (i + 1) / this.penumbraLayers;
      const angle0 = baseAngle + sign * spread * t0;
      const angle1 = baseAngle + sign * spread * t1;
      const far0 = Vec2.add(lightPosition, Vec2.fromAngle(angle0, farDistance));
      const far1 = Vec2.add(lightPosition, Vec2.fromAngle(angle1, farDistance));
      const falloff = Math.pow(1 - t0, 1.85);

      context.fillStyle = `rgba(0, 0, 0, ${this.penumbraAlpha * falloff * lightFade})`;
      polygon(context, [originPoint, far0, far1]);
    }
  }

  drawDebug(context, lightPosition, startPoint, endPoint, startFar, endFar) {
    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    context.lineWidth = 1;
    context.setLineDash([4, 5]);
    context.beginPath();
    context.moveTo(lightPosition.x, lightPosition.y);
    context.lineTo(startPoint.x, startPoint.y);
    context.moveTo(lightPosition.x, lightPosition.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();

    context.setLineDash([]);
    context.strokeStyle = 'rgba(120, 220, 255, 0.45)';
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(startFar.x, startFar.y);
    context.moveTo(endPoint.x, endPoint.y);
    context.lineTo(endFar.x, endFar.y);
    context.stroke();
    context.restore();
  }
}
