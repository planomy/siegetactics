import { onSiegeMapChange } from './siege-map-selection.js';

export let BIRTHDAY_PREVIEW;
onSiegeMapChange((map) => { BIRTHDAY_PREVIEW = map === 'birthday'; });

export const BIRTHDAY_FIELD_SRC = 'assets/field-birthday-preview.png';

// Inclusive footprints, trimmed where the marked cells are clear for building.
export const BIRTHDAY_FOOTPRINTS = [
  { left: 1, right: 5, top: 2, bottom: 2 }, // Dragon, top
  { left: 0, right: 5, top: 3, bottom: 3 },
  { left: 0, right: 6, top: 4, bottom: 5 },
  { left: 16, right: 19, top: 2, bottom: 5 }, // Unicorn
  { left: 2, right: 7, top: 8, bottom: 8 }, // Kraken, top
  { left: 1, right: 8, top: 9, bottom: 11 },
  { left: 11, right: 14, top: 8, bottom: 9 }, // Griffin, top
  { left: 11, right: 15, top: 10, bottom: 11 },
  { left: 18, right: 19, top: 7, bottom: 9 }, // Cake table
  { left: 7, right: 7, top: 4, bottom: 4 }, // West banner pole
  { left: 14, right: 14, top: 4, bottom: 4 }, // East banner pole
];
