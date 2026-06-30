/**
 * OverlayDefinitions.ts
 *
 * 3D overlay configuration for AxisFemale.glb.
 * Re-exports the canonical overlay system from the rendering layer and adds
 * model-specific overlay geometry definitions.
 *
 * The overlay engine reads from this file — NOT from PlaceholderBody or GltfBody
 * directly. This is the abstraction that makes the model swappable.
 */

import { BODY_REGION_REGISTRY, anchorForRegion } from "./BodyRegionRegistry";

// Re-export canonical colour/material definitions from the intelligence layer
// so downstream code imports from one place.
export {
  STATUS_COLOR,
  STATUS_LABEL,
  LAYER_META,
  getOverlayAppearance,
  type OverlayAppearance,
  type LayerMeta,
} from "@/components/body/rendering/OverlaySystem";

// ─── Overlay geometry ─────────────────────────────────────────────────────────
// Defines how each muscle region's overlay is rendered in 3D.
// Currently: ellipsoid patches (same as PlaceholderBody).
// Future: texture masks, vertex-colour bands, shader zones.

export type OverlayStyle = "ellipsoid" | "texture_mask" | "vertex_zone";

export interface OverlayGeometryDef {
  regionId:   string;
  /** World-space position (left + right for bilateral) */
  positions:  Array<[number, number, number]>;
  /** [x, y, z] scale of the ellipsoid in local units */
  scale:      [number, number, number];
  style:      OverlayStyle;
}

/** Build overlay geometry for all regions using current anchor data */
export function buildOverlayGeometry(): OverlayGeometryDef[] {
  return BODY_REGION_REGISTRY.map(r => {
    const positions: Array<[number, number, number]> = [];

    if (r.side === "bilateral") {
      if (r.anchorPositionLeft)  positions.push(r.anchorPositionLeft);
      if (r.anchorPositionRight) positions.push(r.anchorPositionRight);
      // Fallback if left/right not specified
      if (positions.length === 0) {
        positions.push(
          [-r.anchorPosition[0], r.anchorPosition[1], r.anchorPosition[2]],
          [ r.anchorPosition[0], r.anchorPosition[1], r.anchorPosition[2]],
        );
      }
    } else {
      positions.push(r.anchorPosition);
    }

    const radius = r.overlayRadius;

    return {
      regionId:  r.id,
      positions,
      scale:     [radius * 1.0, radius * 0.75, radius * 0.50],
      style:     "ellipsoid" as OverlayStyle,
    };
  });
}

// ─── Model-space constants ────────────────────────────────────────────────────
// Calibrated for AxisFemale.glb standing-pose coordinate system.
// Y-up, unit scale (1 unit ≈ 1 m), feet at Y ≈ -1.16.

export const MODEL_BOUNDS = {
  min: [-0.34, -1.16, -0.23] as [number, number, number],
  max: [ 0.34,  1.85,  0.23] as [number, number, number],
  center: [0, 0.345, 0] as [number, number, number],
  height: 3.01,
};

export const BASE_SKIN_COLOR    = "#C9A689";  // warm anatomical skin tone
export const OVERLAY_OPACITY    = 0.82;        // default muscle patch opacity
export const SELECTED_OPACITY   = 1.00;
export const HOVER_OPACITY      = 0.96;
export const UNAVAILABLE_OPACITY = 0.0;        // muscles with no data = invisible
