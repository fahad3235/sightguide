// Deterministic Demo Mode scenarios. Every frame is labelled DEMO.
// Boxes move gradually (about 0.04 per sample) so the local tracker
// can keep the same ID across samples. No left/right guidance is
// produced: guidance comes from fallbackGuidance().
export const DEMO_STEPS = [
  [],
  // Scenario 1: low-risk side obstacle, visual only, voice silent
  [{ category: "fixed_obstacle", label: "pole", position: "side", box: { x: 0.68, y: 0.30, width: 0.08, height: 0.30 }, distanceBand: "Far", uncertain: false }],
  // Scenario 2: same pole moves gradually into the path
  [{ category: "fixed_obstacle", label: "pole", position: "side", box: { x: 0.64, y: 0.31, width: 0.09, height: 0.32 }, distanceBand: "Far", uncertain: false }],
  [{ category: "fixed_obstacle", label: "pole", position: "side", box: { x: 0.60, y: 0.32, width: 0.10, height: 0.34 }, distanceBand: "Close", uncertain: false }],
  [{ category: "fixed_obstacle", label: "pole", position: "center", box: { x: 0.56, y: 0.34, width: 0.12, height: 0.36 }, distanceBand: "Close", uncertain: false }],
  [{ category: "fixed_obstacle", label: "pole", position: "center", box: { x: 0.52, y: 0.36, width: 0.15, height: 0.40 }, distanceBand: "Very close", uncertain: false }],
  [{ category: "fixed_obstacle", label: "pole", position: "center", box: { x: 0.48, y: 0.38, width: 0.18, height: 0.44 }, distanceBand: "Very close", uncertain: false }],
  // Noisy frame: pole briefly appears on the other side - lock must hold
  [{ category: "fixed_obstacle", label: "pole", position: "side", box: { x: 0.18, y: 0.40, width: 0.18, height: 0.45 }, distanceBand: "Very close", uncertain: false }],
  [{ category: "fixed_obstacle", label: "pole", position: "center", box: { x: 0.48, y: 0.38, width: 0.18, height: 0.44 }, distanceBand: "Very close", uncertain: false }],
  // Scenario 3: higher-priority moving hazard appears in the path
  [
    { category: "fixed_obstacle", label: "pole", position: "center", box: { x: 0.48, y: 0.38, width: 0.18, height: 0.44 }, distanceBand: "Very close", uncertain: false },
    { category: "vehicle", label: "vehicle", position: "center", box: { x: 0.38, y: 0.45, width: 0.28, height: 0.30 }, distanceBand: "Very close", uncertain: false },
  ],
  [
    { category: "vehicle", label: "vehicle", position: "center", box: { x: 0.36, y: 0.48, width: 0.34, height: 0.34 }, distanceBand: "Very close", uncertain: false },
  ],
  [
    { category: "vehicle", label: "vehicle", position: "center", box: { x: 0.36, y: 0.48, width: 0.34, height: 0.34 }, distanceBand: "Very close", uncertain: false },
  ],
  // Scenario 4: uncertain scene, no high-risk candidate
  [{ category: "unknown", label: "unknown object", position: "side", box: { x: 0.70, y: 0.30, width: 0.10, height: 0.20 }, distanceBand: "Distance unknown", uncertain: true }],
  [],
];

// Named, individually selectable scenarios (indices into DEMO_STEPS).
// "all" replays the full deterministic walkthrough in order.
export const SCENARIOS = [
  { id: "all", label: "Full walkthrough (all scenarios)", steps: DEMO_STEPS },
  { id: "side", label: "Side Obstacle", sub: "Low-risk side obstacle — voice silent", steps: DEMO_STEPS.slice(0, 2) },
  { id: "pole", label: "Pole in Path", sub: "Pole enters path, Far to Very close", steps: DEMO_STEPS.slice(1, 9) },
  { id: "vehicle", label: "Moving Vehicle", sub: "Higher-priority vehicle override", steps: DEMO_STEPS.slice(8, 12) },
  { id: "uncertain", label: "Uncertain Scene", sub: "No high-risk claim when unsure", steps: DEMO_STEPS.slice(12) },
  { id: "steps", label: "Steps Down", sub: "Steps down ahead", steps: [
    [{ category: "stairs", label: "steps down", position: "center", box: { x: 0.30, y: 0.55, width: 0.40, height: 0.22 }, distanceBand: "Close", uncertain: false }],
    [{ category: "stairs", label: "steps down", position: "center", box: { x: 0.28, y: 0.53, width: 0.44, height: 0.26 }, distanceBand: "Very close", uncertain: false }],
    [{ category: "stairs", label: "steps down", position: "center", box: { x: 0.28, y: 0.53, width: 0.44, height: 0.26 }, distanceBand: "Very close", uncertain: false }],
  ] },
  { id: "person", label: "Moving Person", sub: "Person in the visible path", steps: [
    [{ category: "person", label: "person", position: "center", box: { x: 0.44, y: 0.28, width: 0.14, height: 0.42 }, distanceBand: "Close", uncertain: false }],
    [{ category: "person", label: "person", position: "center", box: { x: 0.43, y: 0.26, width: 0.17, height: 0.47 }, distanceBand: "Very close", uncertain: false }],
    [{ category: "person", label: "person", position: "center", box: { x: 0.43, y: 0.26, width: 0.17, height: 0.47 }, distanceBand: "Very close", uncertain: false }],
  ] },
  { id: "branch", label: "Low Branch", sub: "Low branch ahead (overhead)", steps: [
    [{ category: "branch", label: "low branch", position: "center", box: { x: 0.25, y: 0.08, width: 0.50, height: 0.14 }, distanceBand: "Close", uncertain: false }],
    [{ category: "branch", label: "low branch", position: "center", box: { x: 0.22, y: 0.07, width: 0.56, height: 0.16 }, distanceBand: "Very close", uncertain: false }],
    [{ category: "branch", label: "low branch", position: "center", box: { x: 0.22, y: 0.07, width: 0.56, height: 0.16 }, distanceBand: "Very close", uncertain: false }],
  ] },
  { id: "drain", label: "Open Drain", sub: "Open drain ahead", steps: [
    [{ category: "drain", label: "open drain", position: "center", box: { x: 0.36, y: 0.62, width: 0.28, height: 0.16 }, distanceBand: "Close", uncertain: false }],
    [{ category: "drain", label: "open drain", position: "center", box: { x: 0.34, y: 0.60, width: 0.32, height: 0.19 }, distanceBand: "Very close", uncertain: false }],
    [{ category: "drain", label: "open drain", position: "center", box: { x: 0.34, y: 0.60, width: 0.32, height: 0.19 }, distanceBand: "Very close", uncertain: false }],
  ] },
];
