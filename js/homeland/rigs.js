/**
 * Granny's scooter gets a new weapon every two regions. Each rig is a sprite plus a perk that adds
 * to her level-ups for the whole run.
 *
 * Sprite measurements are in the sprite's own pixels: the outer edges of the tyres, the centres of
 * the two rocket nozzles, the nozzle radius and the line where the tyres meet the ground.
 *
 * @typedef {{
 *   name: string, sprite: string, perk: string,
 *   tyres: [number, number], pipes: [number, number], pipeY: number, pipeR: number, wheelY: number,
 *   bazooka?: number, rapid?: number, rockets?: number, tesla?: number,
 * }} Rig
 * `bazooka` is seconds between bazooka blasts, `rapid` multiplies how fast every gun fires,
 * `rockets` adds homing rockets and `tesla` adds electric pulse levels.
 */

/** @type {Rig[]} */
export const RIGS = [
  {
    name: 'Rocket Scooter', sprite: 'assets/homeland/granny-scooter.png?v=3', perk: '',
    tyres: [13, 708], pipes: [236, 486], pipeY: 1025, pipeR: 50, wheelY: 1185,
  },
  {
    name: 'Bazooka', sprite: 'assets/homeland/granny/bazooka.webp', perk: 'A shoulder bazooka fires a huge rocket blast every two seconds.',
    tyres: [3, 393], pipes: [133, 264], pipeY: 572, pipeR: 28, wheelY: 692, bazooka: 2,
  },
  {
    name: 'Twin Miniguns', sprite: 'assets/homeland/granny/miniguns.webp', perk: 'Twin miniguns make every gun fire 50% faster.',
    tyres: [54, 430], pipes: [174, 319], pipeY: 564, pipeR: 27, wheelY: 678, rapid: 1.5,
  },
  {
    name: 'Rocket Pods', sprite: 'assets/homeland/granny/rockets.webp', perk: 'Rocket pods launch three homing rockets every two seconds.',
    tyres: [57, 428], pipes: [181, 307], pipeY: 559, pipeR: 27, wheelY: 669, rockets: 3,
  },
  {
    name: 'Tesla Coils', sprite: 'assets/homeland/granny/tesla.webp', perk: 'Tesla coils blast every alien near Granny with big electric pulses.',
    tyres: [27, 410], pipes: [152, 287], pipeY: 561, pipeR: 28, wheelY: 691, tesla: 3,
  },
];

/** The rig Granny drives in a region: a new one every two regions. @param {number} index */
export function rigFor(index) {
  return RIGS[Math.min(RIGS.length - 1, Math.floor(index / 2))];
}
