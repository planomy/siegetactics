/**
 * Planet scenery: the GPT prop sheets, grouped into one look per region.
 *
 * Tall props stand at the sides of the battlefield and roll past as Granny drives; flat props
 * (craters, cracks, slime, hatches and tracks) lie on the ground for aliens to walk over.
 * Widths are in world units.
 */

const S = 0.45;
const M = 0.8;
const L = 1.15;
const XL = 1.6;
const XXL = 2.6;

/** @typedef {{ name: string, w: number }} PropDef */

/** @type {PropDef[]} */
const ROCKS = [
  { name: 'rock-arch-glow', w: L }, { name: 'rock-stack-glow', w: L }, { name: 'rock-fern', w: L }, { name: 'rock-purple', w: L },
  { name: 'rock-slabs-tubes', w: L }, { name: 'rock-boulder-glow', w: M }, { name: 'rock-shards', w: M }, { name: 'rock-fins', w: M },
  { name: 'spire-orange', w: M }, { name: 'spire-hook', w: M }, { name: 'spire-twin', w: L }, { name: 'rock-slab', w: M },
  { name: 'rock-block', w: M }, { name: 'rock-small-1', w: S }, { name: 'rock-small-2', w: S }, { name: 'rock-small-3', w: S },
];
const SHROOMS = [
  { name: 'shroom-purple', w: M }, { name: 'shroom-gold', w: M }, { name: 'shroom-rock', w: L }, { name: 'shroom-glow-purple', w: L },
  { name: 'shroom-glow-orange', w: L }, { name: 'shroom-pink', w: L }, { name: 'shroom-pods', w: M }, { name: 'shroom-orange', w: M },
  { name: 'shroom-tubes', w: M }, { name: 'shroom-fire', w: M }, { name: 'shroom-violet', w: M }, { name: 'shroom-teal', w: M },
];
const BONES = [
  { name: 'bones-ribs', w: L }, { name: 'bones-skull', w: M }, { name: 'bones-shell', w: M }, { name: 'bones-tusks', w: L },
  { name: 'bones-skull-spine', w: XL }, { name: 'bones-horned-skull', w: L }, { name: 'bones-arches', w: XL }, { name: 'bones-spine', w: L },
  { name: 'bones-giant-skull', w: XL },
];
const TECH = [
  { name: 'tech-pod', w: L }, { name: 'tech-fin', w: M }, { name: 'tech-barrel-slime', w: M }, { name: 'tech-arch', w: M },
  { name: 'tech-beacon', w: S }, { name: 'tech-saucer', w: L }, { name: 'tech-tank', w: L }, { name: 'tech-dish', w: M },
  { name: 'tech-coil', w: S }, { name: 'tech-antenna', w: S }, { name: 'tech-bunker', w: L }, { name: 'tech-ring', w: M },
  { name: 'tech-dome-saucer', w: L }, { name: 'tech-plates', w: M }, { name: 'tech-hatch', w: M }, { name: 'tech-turbine', w: M },
  { name: 'tech-pipe-slime', w: L }, { name: 'tech-capsule', w: L }, { name: 'tech-hull', w: L }, { name: 'tech-siren', w: S },
  { name: 'tech-dish-small', w: S }, { name: 'tech-windsock', w: S },
];
const EGGS = [
  { name: 'egg-cracked', w: M }, { name: 'egg-cluster-glow', w: M }, { name: 'egg-spotted', w: M }, { name: 'egg-hatched', w: M },
  { name: 'egg-pair', w: L }, { name: 'egg-small', w: S }, { name: 'egg-trio', w: M }, { name: 'egg-nest', w: L }, { name: 'egg-giant', w: L },
];
const VENTS = [
  { name: 'vent-lava', w: M }, { name: 'vent-pods', w: M }, { name: 'vent-volcano-1', w: M }, { name: 'vent-volcano-2', w: M },
  { name: 'vent-green', w: M }, { name: 'vent-small', w: S }, { name: 'vent-medium', w: M }, { name: 'vent-large', w: L },
];
const CRATERS = [
  { name: 'crater-small', w: M }, { name: 'crater-ring', w: L }, { name: 'crater-wide', w: L }, { name: 'crater-double', w: L },
  { name: 'crater-deep', w: L }, { name: 'crater-rim', w: L }, { name: 'crater-s', w: M }, { name: 'crater-m', w: L }, { name: 'crater-l', w: XL },
  { name: 'ground-crater-pit', w: M }, { name: 'ground-crater-bowl', w: L }, { name: 'ground-crater-broken', w: L },
  { name: 'ground-crater-twin', w: XL }, { name: 'ground-crater-shallow', w: XL }, { name: 'ground-crater-funnel', w: XL },
  { name: 'ground-crater-wide-2', w: L }, { name: 'ground-crater-oval', w: L }, { name: 'ground-crater-small-2', w: M },
  { name: 'ground-crater-twin-2', w: L },
];
const CRACKS = [{ name: 'ground-cracks-slabs', w: XL }, { name: 'ground-cracks-web', w: XL }, { name: 'ground-cracks-plates', w: XL }];
const FOSSILS = [
  { name: 'ground-fossil-shell', w: M }, { name: 'ground-fossil-trilobite', w: M }, { name: 'ground-fossil-footprint', w: M },
  { name: 'ground-fossil-fish', w: L },
];
const PUDDLES = [
  { name: 'ground-puddle-slime', w: M }, { name: 'ground-puddle-slime-blob', w: M }, { name: 'ground-puddle-slime-drops', w: S },
  { name: 'ground-crater-slime', w: L }, { name: 'ground-grate-slime', w: L },
];
const TRACKS = [{ name: 'ground-tracks-chevron', w: XL }, { name: 'ground-tracks-twin', w: XL }, { name: 'ground-tracks-curve', w: XL }];
const PLATES = [
  { name: 'ground-hatch-round', w: L }, { name: 'ground-plate-hazard', w: M }, { name: 'ground-hatch-vent', w: M },
  { name: 'ground-pad-target', w: M }, { name: 'ground-plates-cracked', w: L }, { name: 'ground-hatch-quad', w: M },
  { name: 'ground-plate-vents', w: M }, { name: 'ground-plate-arrows', w: L }, { name: 'ground-crater-tech-ring', w: L },
  { name: 'ground-scorch', w: L },
];
const BURIED_BONES = [
  { name: 'ground-ribs-small', w: M }, { name: 'ground-ribs-large', w: L }, { name: 'ground-skull-buried', w: M },
  { name: 'ground-jaw-buried', w: M },
];
const GEYSERS = [{ name: 'ground-geyser-1', w: M }, { name: 'ground-geyser-2', w: S }];
const WRECKS = [
  { name: 'ground-arch-broken', w: L }, { name: 'ground-arch-low', w: L }, { name: 'ground-tunnel-pipe', w: M },
  { name: 'ground-beacon-dome', w: M }, { name: 'ground-wreck-wing', w: L },
];
const SLIME = [
  { name: 'slime-green', w: M }, { name: 'slime-lime', w: L }, { name: 'slime-purple', w: L }, { name: 'slime-teal', w: L },
  { name: 'slime-bubbles', w: M }, { name: 'slime-fizz', w: M }, { name: 'slime-pool', w: M }, { name: 'slime-rocky', w: M },
  { name: 'slime-m', w: M }, { name: 'slime-l', w: L },
];

const ABYSS_TALL = [
  { name: 'abyss-rib-arch', w: XL }, { name: 'abyss-spine', w: M }, { name: 'abyss-jaw', w: L }, { name: 'abyss-horned-skull', w: L },
  { name: 'abyss-tusk', w: M }, { name: 'abyss-crystals', w: M }, { name: 'abyss-tubes', w: M }, { name: 'abyss-jelly', w: M },
  { name: 'abyss-fungus', w: L }, { name: 'abyss-eyestalks', w: S }, { name: 'abyss-spire', w: L }, { name: 'abyss-brazier', w: M },
  { name: 'abyss-wreck', w: XL }, { name: 'abyss-geyser', w: M }, { name: 'abyss-bone-pile', w: M },
];
const ABYSS_FLAT = [
  { name: 'abyss-slab', w: L }, { name: 'abyss-ooze', w: L }, { name: 'abyss-crater', w: L }, { name: 'abyss-pebbles', w: L },
  { name: 'abyss-ice', w: L }, { name: 'abyss-ribcage', w: L }, { name: 'abyss-skull', w: L }, { name: 'abyss-vertebrae', w: L },
  { name: 'abyss-claw', w: L }, { name: 'abyss-spiral', w: L },
];

const GLOW_TALL = [
  { name: 'glow-giant-shroom', w: XL }, { name: 'glow-arch', w: XL }, { name: 'glow-trumpets', w: L }, { name: 'glow-lantern-tree', w: L },
  { name: 'glow-stump', w: L }, { name: 'glow-shroom-cluster', w: M }, { name: 'glow-pods', w: M }, { name: 'glow-log', w: L },
  { name: 'glow-ferns', w: M }, { name: 'glow-shroom-amber', w: M }, { name: 'glow-spiky-pod', w: M }, { name: 'glow-egg', w: M },
  { name: 'glow-orb-plants', w: M }, { name: 'glow-rune-ring', w: L }, { name: 'glow-rune-stone', w: M }, { name: 'glow-skull', w: L },
  { name: 'glow-portal', w: L }, { name: 'glow-lotus', w: M },
];
const GLOW_FLAT = [
  { name: 'glow-slab', w: L }, { name: 'glow-pool', w: L }, { name: 'glow-crater', w: L }, { name: 'glow-spore-bed', w: L },
  { name: 'glow-moss', w: L }, { name: 'glow-spore-cloud', w: L }, { name: 'glow-pond', w: L },
];
const SWAMP_TALL = [
  { name: 'swamp-willow', w: XL }, { name: 'swamp-pitcher', w: L }, { name: 'swamp-bulbs', w: M }, { name: 'swamp-flytrap', w: M },
  { name: 'swamp-shroom-tree', w: L }, { name: 'swamp-reeds', w: M }, { name: 'swamp-eggs', w: M }, { name: 'swamp-log', w: L },
  { name: 'swamp-ribs', w: L }, { name: 'swamp-skull', w: L }, { name: 'swamp-mound', w: M }, { name: 'swamp-tubes', w: M },
  { name: 'swamp-nest', w: M }, { name: 'swamp-pipe', w: L }, { name: 'swamp-dish', w: L }, { name: 'swamp-barrel', w: L },
  { name: 'swamp-tusks', w: L }, { name: 'swamp-geyser', w: M },
];
const SWAMP_FLAT = [
  { name: 'swamp-cracked-mud', w: L }, { name: 'swamp-puddle', w: L }, { name: 'swamp-crater', w: L }, { name: 'swamp-lily-pond', w: L },
  { name: 'swamp-claw-mud', w: L }, { name: 'swamp-bubbling-pool', w: L }, { name: 'swamp-bubbles', w: M },
];
const SCRAP_TALL = [
  { name: 'scrap-gear-pile', w: L }, { name: 'scrap-robot-head', w: L }, { name: 'scrap-pipe-tangle', w: L }, { name: 'scrap-fan-wreck', w: L },
  { name: 'scrap-barrels', w: L }, { name: 'scrap-dish', w: L }, { name: 'scrap-crane-arm', w: L }, { name: 'scrap-tower', w: M },
  { name: 'scrap-tesla-tower', w: M }, { name: 'scrap-flag', w: M }, { name: 'scrap-crate', w: L }, { name: 'scrap-missiles', w: M },
  { name: 'scrap-dome-reactor', w: L }, { name: 'scrap-tanks', w: L }, { name: 'scrap-tesla-coils', w: L }, { name: 'scrap-crashed-saucer', w: XL },
  { name: 'scrap-gate-ring', w: XL }, { name: 'scrap-wrecked-ship', w: XL }, { name: 'scrap-bunker-door', w: XL }, { name: 'scrap-robot-skull', w: L },
];
const SCRAP_FLAT = [
  { name: 'scrap-lava-plates', w: L }, { name: 'scrap-gear-plate', w: L }, { name: 'scrap-furnace-pit', w: L }, { name: 'scrap-oil-slick', w: L },
  { name: 'scrap-hazard-plates', w: L },
];
const HIVE_TALL = [
  { name: 'hive-mother-hive', w: XXL }, { name: 'hive-mother-hive-2', w: XXL }, { name: 'hive-arch', w: XL }, { name: 'hive-gate', w: XL },
  { name: 'hive-honeycomb-mound', w: L }, { name: 'hive-egg-mound', w: L }, { name: 'hive-hatched-eggs', w: L }, { name: 'hive-ribcage', w: L },
  { name: 'hive-egg-cluster', w: L }, { name: 'hive-spine-ribs', w: L }, { name: 'hive-trumpet-shrooms', w: L }, { name: 'hive-pod-flower', w: L },
  { name: 'hive-bulb-tree', w: M }, { name: 'hive-lantern-tree', w: L }, { name: 'hive-bubbling-goo', w: M }, { name: 'hive-egg-ring', w: L },
  { name: 'hive-egg-trio', w: L }, { name: 'hive-shroom-cluster', w: M }, { name: 'hive-spire', w: M }, { name: 'hive-pod-tower', w: M },
  { name: 'hive-egg-pod', w: M }, { name: 'hive-tusks', w: L }, { name: 'hive-egg-pair', w: L }, { name: 'hive-glow-eggs', w: M },
  { name: 'hive-cracked-egg', w: L }, { name: 'hive-orange-pods', w: M }, { name: 'hive-rib-cave', w: L }, { name: 'hive-horns', w: L },
  { name: 'hive-drip-shrooms', w: L }, { name: 'hive-chimneys', w: M }, { name: 'hive-spiked-mound', w: L }, { name: 'hive-egg-vine', w: L },
  { name: 'hive-honeycomb-dome', w: L }, { name: 'hive-egg-lotus', w: M }, { name: 'hive-nest', w: L }, { name: 'hive-crystal-spikes', w: L },
  { name: 'hive-pod-chamber', w: M }, { name: 'hive-hollow-log', w: L }, { name: 'hive-slime-fountain', w: M },
];
const HIVE_FLAT = [
  { name: 'hive-cracked-slab', w: L }, { name: 'hive-slime-puddle', w: L }, { name: 'hive-crater', w: L }, { name: 'hive-web', w: L },
  { name: 'hive-slime-pool', w: L }, { name: 'hive-plates', w: L }, { name: 'hive-goo-puddle', w: L }, { name: 'hive-honeycomb-slab', w: L },
  { name: 'hive-glow-cells', w: L }, { name: 'hive-fang-pit', w: L },
];
const VENT_TALL = [
  { name: 'vent-steam-cones', w: L }, { name: 'vent-holey-boulder', w: L }, { name: 'vent-rib-tusks', w: L }, { name: 'vent-lava-mesa', w: L },
  { name: 'vent-rock-arch', w: XL }, { name: 'vent-lava-spire', w: L }, { name: 'vent-eruption', w: M }, { name: 'vent-steam-pipe', w: L },
  { name: 'vent-fire-crystals', w: L }, { name: 'vent-crystal-cluster', w: L }, { name: 'vent-magma-shrooms', w: L }, { name: 'vent-magma-eggs', w: L },
  { name: 'vent-shelf-fungus', w: L }, { name: 'vent-holey-rock', w: L }, { name: 'vent-furnace-dome', w: L }, { name: 'vent-forge-gate', w: XL },
  { name: 'vent-dragon-skull', w: XL }, { name: 'vent-obsidian-spires', w: L }, { name: 'vent-refinery', w: XL },
];
const VENT_FLAT = [
  { name: 'vent-lava-slab', w: L }, { name: 'vent-lava-pool', w: L }, { name: 'vent-steam-crater', w: L }, { name: 'vent-lava-cracks', w: L },
  { name: 'vent-ember-bed', w: L }, { name: 'vent-bubbling-pool', w: L },
];
const RUINS_TALL = [
  { name: 'ruins-horned-skull', w: L }, { name: 'ruins-arch', w: L }, { name: 'ruins-rib-claws', w: L }, { name: 'ruins-tusks', w: L },
  { name: 'ruins-robot-skull', w: L }, { name: 'ruins-banner-gate', w: XL }, { name: 'ruins-orb-pillars', w: L }, { name: 'ruins-skull-tunnel', w: XL },
  { name: 'ruins-gear-core', w: L }, { name: 'ruins-pylon', w: L }, { name: 'ruins-crystals', w: L }, { name: 'ruins-tanks', w: L },
  { name: 'ruins-tesla-pylons', w: L }, { name: 'ruins-dish', w: L }, { name: 'ruins-crystal-horns', w: L }, { name: 'ruins-monster-head', w: XL },
  { name: 'ruins-furnace', w: L }, { name: 'ruins-skull-gate', w: XXL }, { name: 'ruins-cannon', w: L }, { name: 'ruins-beast-skull', w: XL },
];
const RUINS_FLAT = [
  { name: 'ruins-rune-slab', w: L }, { name: 'ruins-rune-plate', w: L }, { name: 'ruins-portal-pit', w: L }, { name: 'ruins-cracked-tiles', w: L },
  { name: 'ruins-furnace-grate', w: L },
];
const PALACE_TALL = [
  { name: 'palace-coin-pile', w: M }, { name: 'palace-crown', w: M }, { name: 'palace-gem-sack', w: M }, { name: 'palace-fountain', w: L },
  { name: 'palace-trophy', w: L }, { name: 'palace-flamingos', w: L }, { name: 'palace-pillar', w: M }, { name: 'palace-hot-tub', w: L },
  { name: 'palace-throne-car', w: L }, { name: 'palace-disco-ball', w: L }, { name: 'palace-gnome', w: M }, { name: 'palace-velvet-rope', w: L },
  { name: 'palace-supreme-sign', w: L }, { name: 'palace-rocket', w: M }, { name: 'palace-chandelier', w: L }, { name: 'palace-gold-bars', w: M },
  { name: 'palace-limo', w: XL }, { name: 'palace-statue', w: XXL },
];
const PALACE_FLAT = [
  { name: 'palace-gold-tiles', w: L }, { name: 'palace-red-carpet', w: L }, { name: 'palace-marble-tiles', w: L }, { name: 'palace-fountain-pool', w: L },
  { name: 'palace-star-tile', w: L }, { name: 'palace-coin-medallion', w: M }, { name: 'palace-leopard-rug', w: L },
];

/**
 * One look per region of the planet map. `tall` stands at the sides, `flat` lies on the ground.
 * @type {Record<string, { title: string, tall: PropDef[], flat: PropDef[] }>}
 */
export const THEMES = {
  canyon: { title: 'Rust Canyon', tall: [...ROCKS, ...GEYSERS], flat: [...CRATERS, ...CRACKS, ...FOSSILS.slice(0, 2)] },
  shrooms: { title: 'Glowshroom Forest', tall: GLOW_TALL, flat: GLOW_FLAT },
  bones: { title: 'The Boneyard', tall: [...BONES, ...BURIED_BONES, ...ROCKS.slice(5, 9)], flat: [...CRATERS, ...FOSSILS, ...FOSSILS, ...CRACKS] },
  swamp: { title: 'Slime Swamp', tall: SWAMP_TALL, flat: SWAMP_FLAT },
  scrapyard: { title: 'The Scrapyard', tall: SCRAP_TALL, flat: SCRAP_FLAT },
  hive: { title: 'Hive Nests', tall: HIVE_TALL, flat: HIVE_FLAT },
  vents: { title: 'Smoking Vents', tall: VENT_TALL, flat: VENT_FLAT },
  abyss: { title: 'The Abyss', tall: ABYSS_TALL, flat: ABYSS_FLAT },
  ruins: { title: 'Ancient Ruins', tall: RUINS_TALL, flat: RUINS_FLAT },
  palace: { title: 'The Supreme Leader\'s Palace', tall: PALACE_TALL, flat: PALACE_FLAT },
};

/** The first region mixes a bit of everything. */
const LANDING = {
  title: 'Landing Zone',
  tall: [
    ...ROCKS, ...SHROOMS.slice(0, 6), ...BONES.slice(0, 4), ...TECH.slice(0, 7), ...EGGS.slice(0, 3), ...VENTS.slice(0, 4),
    ...BURIED_BONES.slice(0, 2), ...GEYSERS, ...WRECKS.slice(0, 3),
  ],
  flat: [...CRATERS, ...SLIME.slice(0, 4), ...CRACKS, ...FOSSILS, ...PUDDLES.slice(0, 2), ...PLATES.slice(0, 4), ...TRACKS],
};

/** @type {Map<string, HTMLImageElement>} */
const images = new Map();

/** @param {string} name */
export function propImage(name) {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.src = `assets/homeland/props/${name}.webp`;
    images.set(name, img);
  }
  return img;
}

/**
 * The scenery for a region, with every image already loading.
 * @param {string | null} region A key of THEMES, or anything else for the landing zone.
 */
export function sceneryFor(region) {
  const theme = (region && THEMES[region]) || LANDING;
  for (const def of [...theme.tall, ...theme.flat]) propImage(def.name);
  return theme;
}
