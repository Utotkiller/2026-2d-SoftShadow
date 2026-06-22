import { Vec2, clamp, normalizeAngle } from '../math/Vec2.js';

const TAU = Math.PI * 2;

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

  if (length <= 1e-7) {
    return point.clone();
  }

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
  const start = entries[startIndex];
  const end = entries[endIndex];
  const span = TAU - largestGap;

  if (span <= 0 || span > Math.PI * 1.3) {
    return null;
  }

  return { start, end, span };
}

export class SoftShadowRenderer {
  constructor() {
    this.penumbraLayers = 10;
    this.umbraAlpha = 0.38;
    this.penumbraAlpha = 0.11;
  }

  draw(context, scene) {
    const lightPosition = scene.character.position;
    const maxSceneSize = Math.hypot(scene.width, scene.height);
    const shadowDistance = maxSceneSize * 1.45;

    context.save();
    context.globalCompositeOperation = 'source-over';

    for (const occluder of scene.occluders) {
      if (occluder.contains(lightPosition)) continue;

      const corners = occluder.corners();
      const span = getAngularSpan(corners, lightPosition);
      if (!span) continue;

      const startPoint = span.start.point;
      const endPoint = span.end.point;
      const startFar = projectPoint(startPoint, lightPosition, shadowDistance);
      const endFar = projectPoint(endPoint, lightPosition, shadowDistance);
      const blockerDistance = Vec2.distance(lightPosition, occluder.position);
      const distanceFade = clamp(1 - blockerDistance / (scene.characterLight.radius * 1.25), 0.2, 1);

      context.fillStyle = `rgba(0, 0, 0, ${this.umbraAlpha * distanceFade})`;
      polygon(context, [startPoint, endPoint, endFar, startFar]);

      const spread = this.computeSpread(scene, blockerDistance, span.span);
      this.drawPenumbra(context, lightPosition, startPoint, span.start.angle, -1, shadowDistance, spread, distanceFade);
      this.drawPenumbra(context, lightPosition, endPoint, span.end.angle, 1, shadowDistance, spread, distanceFade);

      if (scene.debug) {
        this.drawDebug(context, lightPosition, startPoint, endPoint, startFar, endFar);
      }
    }

    context.restore();
  }

  computeSpread(scene, blockerDistance, angularSpan) {
    const base = scene.character.radius / Math.max(blockerDistance, 1);
    const sizeTerm = angularSpan * 0.28;
    return clamp((base + sizeTerm) * scene.shadowSoftness, 0.035, 0.42);
  }

  drawPenumbra(context, lightPosition, originPoint, baseAngle, sign, shadowDistance, spread, distanceFade) {
    const originDistance = Vec2.distance(lightPosition, originPoint);
    const farDistance = originDistance + shadowDistance;

    for (let i = 0; i < this.penumbraLayers; i += 1) {
      const t0 = i / this.penumbraLayers;
      const t1 = (i + 1) / this.penumbraLayers;
      const angle0 = baseAngle + sign * spread * t0;
      const angle1 = baseAngle + sign * spread * t1;
      const far0 = Vec2.add(lightPosition, Vec2.fromAngle(angle0, farDistance));
      const far1 = Vec2.add(lightPosition, Vec2.fromAngle(angle1, farDistance));
      const falloff = Math.pow(1 - t0, 1.75);

      context.fillStyle = `rgba(0, 0, 0, ${this.penumbraAlpha * falloff * distanceFade})`;
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
