// Reads the JSON chunk from a GLB file and reports structure.
// Usage: node scripts/inspect_glb.mjs <path-to.glb>
import { readFileSync } from "fs";

const glbPath = process.argv[2];
if (!glbPath) { console.error("Usage: node scripts/inspect_glb.mjs <path.glb>"); process.exit(1); }

const buf = readFileSync(glbPath);

// GLB header
const magic   = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
if (magic !== 0x46546C67) { console.error("Not a valid GLB file (bad magic)"); process.exit(1); }
console.log(`GLB version: ${version}, total size: ${(buf.length / 1024 / 1024).toFixed(2)} MB\n`);

// Chunk 0 — JSON
const chunk0Len  = buf.readUInt32LE(12);
const chunk0Type = buf.readUInt32LE(16);
if (chunk0Type !== 0x4E4F534A) { console.error("First chunk is not JSON"); process.exit(1); }
const json = JSON.parse(buf.slice(20, 20 + chunk0Len).toString("utf8"));

// ── Scene graph: nodes ─────────────────────────────────────────────────────────
const nodes = json.nodes ?? [];
console.log(`=== NODES (${nodes.length}) ===`);
nodes.forEach((n, i) => {
  const extra = [
    n.mesh !== undefined ? `mesh:${n.mesh}` : null,
    n.children?.length   ? `children:${n.children.length}` : null,
  ].filter(Boolean).join("  ");
  console.log(`  [${i}] "${n.name ?? "(unnamed)"}"  ${extra}`);
});

// ── Meshes ─────────────────────────────────────────────────────────────────────
const meshes = json.meshes ?? [];
console.log(`\n=== MESHES (${meshes.length}) ===`);
meshes.forEach((m, mi) => {
  console.log(`  [${mi}] "${m.name ?? "(unnamed)"}"  primitives:${m.primitives.length}`);
  m.primitives.forEach((p, pi) => {
    const attrs = Object.keys(p.attributes ?? {});
    const matName = p.material !== undefined ? (json.materials?.[p.material]?.name ?? `mat:${p.material}`) : "no-material";
    console.log(`    prim[${pi}]  mat="${matName}"  attrs=[${attrs.join(", ")}]`);
    if (attrs.includes("COLOR_0")) console.log(`      *** COLOR_0 vertex colors present ***`);
  });
});

// ── Materials ─────────────────────────────────────────────────────────────────
const materials = json.materials ?? [];
console.log(`\n=== MATERIALS (${materials.length}) ===`);
materials.forEach((m, i) => console.log(`  [${i}] "${m.name ?? "(unnamed)"}"`));

// ── Extras / extensions / skins ───────────────────────────────────────────────
const skins = json.skins ?? [];
if (skins.length) {
  console.log(`\n=== SKINS (${skins.length}) ===`);
  skins.forEach((s, i) => {
    console.log(`  [${i}] "${s.name ?? "(unnamed)"}"  joints:${s.joints?.length ?? 0}`);
    s.joints?.forEach(j => {
      const joint = nodes[j];
      if (joint) process.stdout.write(`    bone: "${joint.name ?? j}"\n`);
    });
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n=== SUMMARY ===");

const hasColorVerts = meshes.some(m =>
  m.primitives.some(p => "COLOR_0" in (p.attributes ?? {}))
);
const nodeNames = nodes.map(n => n.name ?? "").filter(Boolean);
const meshNodeNames = nodes.filter(n => n.mesh !== undefined).map(n => n.name ?? "(unnamed)");
const muscleLike = nodeNames.filter(n =>
  /muscle|bicep|tricep|glute|quad|hamstr|calf|deltoid|pectoral|lats|trap|core|abdomin|oblique|forearm|shoulder/i.test(n)
);

console.log(`  Named nodes with meshes: [${meshNodeNames.join(", ")}]`);
console.log(`  Vertex colors (COLOR_0): ${hasColorVerts}`);
console.log(`  Muscle-like node names:  ${muscleLike.length ? muscleLike.join(", ") : "none found"}`);
console.log(`  Bone count (joints):     ${skins.flatMap(s => s.joints ?? []).length}`);
