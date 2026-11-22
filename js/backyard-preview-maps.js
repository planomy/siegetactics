import { onSiegeMapChange } from './siege-map-selection.js';

// Footprint coordinates count from the top-left of the 22 × 13 play grid.
const west = (row, y) => ({ spawn: { x: 0.063, y }, entries: [{ col: 0, row }] });
const gate = (name, x, y, col, row, announce) => ({
  name, spawn: { x, y }, entries: [{ col, row }], announce,
});

export const BACKYARD_PREVIEW_MAPS = {
  junkyard: {
    src: 'assets/field-junkyard-preview.png',
    artBounds: { left: 0.043, top: 0.165, right: 0.84, bottom: 0.82 },
    gates: {
      west: west(5, 0.465),
      north: gate('Garden gate', 0.464, 0.086, 10, 0, 'Scouts found the GARDEN GATE!'),
      south: gate('Tow ramp portal', 0.39, 0.856, 8, 12, 'Aliens are heading for the TOW RAMP!'),
    },
    footprints: [
      [1, 4, 2, 3],   // Ute body and rear wheel
      [0, 2, 3, 4],   // Cab and front wheel
      [6, 9, 4, 4],   // Tyre bay pallet
      [11, 14, 4, 4], // Drum bay pallet
      [4, 5, 7, 7],   // Fridge base extends farther north
      [4, 12, 8, 8],  // Salvage pallets
      [6, 6, 10, 10], // Service pit, west of the tow deck
      [11, 11, 10, 10],
    ],
    reserved: [[7, 10, 10, 10]],
  },
  wedding: {
    src: 'assets/field-wedding-preview.png?v=20261122a5',
    artBounds: { left: 0.055, top: 0.147, right: 0.79, bottom: 0.8 },
    gates: {
      west: west(4, 0.365),
      north: gate('Backstage portal', 0.464, 0.086, 10, 0, 'The band has WEDDING CRASHERS!'),
      south: gate('Drinks queue portal', 0.13, 0.805, 2, 11, 'Aliens found the DRINKS QUEUE!'),
    },
    footprints: [
      [1, 1, 4, 5], [3, 3, 3, 3], // Arbor posts
      [4, 6, 2, 2], [8, 10, 2, 2], // Upper chair feet
      [5, 6, 4, 4], [4, 6, 5, 5], [8, 10, 4, 5], // Lower chairs, with the arbor-side gap
      [10, 10, 4, 4], [11, 11, 4, 4], // Cake table
      [12, 17, 3, 3], // Band stage deck
      [4, 8, 9, 10], [5, 5, 11, 11], // Drinks cart wheels, tubs and fruit crate
      [10, 13, 9, 10], // Hay bales
      [16, 17, 9, 9], // Flower barrow
    ],
  },
  'vege-craze': {
    src: 'assets/field-vege-craze-preview.png',
    artBounds: { left: 0.1, top: 0.172, right: 0.855, bottom: 0.81 },
    gates: {
      west: west(4, 0.406),
      north: gate('Garden gate', 0.464, 0.086, 10, 0, 'Scouts are sneaking in through the GARDEN GATE!'),
      south: gate('Pumpkin patch portal', 0.51, 0.851, 11, 12, 'The PUMPKIN PATCH has visitors!'),
    },
    footprints: [
      [2, 4, 2, 3], [7, 8, 2, 2], [11, 15, 2, 2], [17, 19, 2, 3],
      [3, 8, 5, 6], [12, 15, 5, 5], [17, 18, 6, 6],
      [1, 3, 8, 8], [7, 11, 8, 8], [4, 9, 10, 11], [14, 17, 10, 11],
    ],
  },
  'barby-fest': {
    src: 'assets/field-barby-fest-preview.png?v=20261122a6',
    barbySmoker: true,
    artBounds: { left: 0.059, top: 0.172, right: 0.8, bottom: 0.81 },
    gates: {
      west: west(5, 0.457),
      north: gate('Catering lane portal', 0.464, 0.086, 10, 0, 'The CATERING LANE is under attack!'),
      south: gate('Picnic portal', 0.48, 0.851, 10, 12, 'Aliens are crashing the PICNIC!'),
    },
    footprints: [
      [0, 5, 3, 4], [6, 9, 3, 3], // Smoker and kettle barbies
      [14, 17, 2, 2], // Catering station
      [11, 14, 6, 7], // Sauce tent
      [1, 3, 6, 7], [4, 6, 6, 7], [7, 9, 5, 6],
      [7, 16, 10, 11], [8, 15, 9, 9], // Lower tables, moved into the middle
    ],
  },
};

export let backyardPreviewMap;
onSiegeMapChange((map) => {
  backyardPreviewMap = Object.hasOwn(BACKYARD_PREVIEW_MAPS, map) ? BACKYARD_PREVIEW_MAPS[map] : null;
});

function includesCell(footprints, col, row) {
  return footprints.some(([left, right, top, bottom]) =>
    col >= left && col <= right && row >= top && row <= bottom
  );
}

export function isBackyardPreviewObstacle(col, row) {
  return backyardPreviewMap !== null && includesCell(backyardPreviewMap.footprints, col, row);
}

export function isBackyardPreviewReserved(col, row) {
  return includesCell(backyardPreviewMap?.reserved ?? [], col, row);
}
