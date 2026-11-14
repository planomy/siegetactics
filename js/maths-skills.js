/**
 * Hidden labels on every maths question: which mathematical skill it tests and which question
 * template produced it. Players never see these. They exist so a future teacher view can report
 * by skill and level ("strong at equivalent fractions at Level 3") rather than by topic card.
 *
 * Skills are mathematical, not tied to a topic card: a halving question in Decimals & % still
 * tests fractions of an amount.
 */

/** @typedef {{ name: string, strand: 'Number'|'Algebra'|'Measurement'|'Space'|'Statistics'|'Probability' }} MathSkill */

/** @type {Record<string, MathSkill>} */
export const SKILLS = {
  'number.counting': { name: 'Counting, skip counting and patterns', strand: 'Number' },
  'number.place-value': { name: 'Place value of whole numbers', strand: 'Number' },
  'number.properties': { name: 'Odd, even, prime and factors', strand: 'Number' },
  'number.integers': { name: 'Negative numbers', strand: 'Number' },
  'number.indices': { name: 'Squares, roots and powers', strand: 'Number' },
  'operations.number-bonds': { name: 'Number bonds', strand: 'Number' },
  'operations.addition': { name: 'Addition', strand: 'Number' },
  'operations.subtraction': { name: 'Subtraction', strand: 'Number' },
  'operations.multiplication': { name: 'Multiplication', strand: 'Number' },
  'operations.times-tables': { name: 'Times tables recall', strand: 'Number' },
  'operations.division': { name: 'Division and equal sharing', strand: 'Number' },
  'operations.order': { name: 'Order of operations', strand: 'Number' },
  'operations.multi-step': { name: 'Multi-step word problems', strand: 'Number' },
  'algebra.equations': { name: 'Solving equations and working backwards', strand: 'Algebra' },
  'algebra.substitution': { name: 'Substituting into expressions', strand: 'Algebra' },
  'algebra.logic': { name: 'Logical reasoning', strand: 'Algebra' },
  'fractions.parts': { name: 'Fractions as parts of a whole', strand: 'Number' },
  'fractions.of-amount': { name: 'Fractions of an amount', strand: 'Number' },
  'fractions.compare': { name: 'Comparing and ordering fractions', strand: 'Number' },
  'fractions.equivalence': { name: 'Equivalent fractions', strand: 'Number' },
  'fractions.add-subtract': { name: 'Adding and subtracting fractions', strand: 'Number' },
  'fractions.multiply': { name: 'Multiplying fractions', strand: 'Number' },
  'fractions.mixed': { name: 'Mixed numbers', strand: 'Number' },
  'decimals.place-value': { name: 'Decimal place value', strand: 'Number' },
  'decimals.operations': { name: 'Calculating with decimals', strand: 'Number' },
  'decimals.convert': { name: 'Converting fractions, decimals and percentages', strand: 'Number' },
  'percent.of-amount': { name: 'Percentages of an amount', strand: 'Number' },
  'percent.change': { name: 'Percentage increase and discount', strand: 'Number' },
  'ratio.share': { name: 'Ratio and sharing', strand: 'Number' },
  'money.calculate': { name: 'Money', strand: 'Number' },
  'money.best-buy': { name: 'Best buys and unit price', strand: 'Number' },
  'measurement.units': { name: 'Choosing units', strand: 'Measurement' },
  'length.compare': { name: 'Comparing lengths', strand: 'Measurement' },
  'length.convert': { name: 'Converting length units', strand: 'Measurement' },
  'length.calculate': { name: 'Adding and subtracting lengths', strand: 'Measurement' },
  'length.perimeter': { name: 'Perimeter', strand: 'Measurement' },
  'length.scale': { name: 'Maps and scale', strand: 'Measurement' },
  'area.calculate': { name: 'Area', strand: 'Measurement' },
  'volume.calculate': { name: 'Volume', strand: 'Measurement' },
  'mass.compare': { name: 'Comparing mass and capacity', strand: 'Measurement' },
  'mass.convert': { name: 'Converting mass and capacity units', strand: 'Measurement' },
  'mass.calculate': { name: 'Mass and capacity problems', strand: 'Measurement' },
  'time.read-clock': { name: 'Reading clocks', strand: 'Measurement' },
  'time.units': { name: 'Time units and conversions', strand: 'Measurement' },
  'time.duration': { name: 'Elapsed time and durations', strand: 'Measurement' },
  'time.12-24': { name: '12-hour and 24-hour time', strand: 'Measurement' },
  'time.timetables': { name: 'Timetables', strand: 'Measurement' },
  'time.zones': { name: 'Time zones', strand: 'Measurement' },
  'rates.speed': { name: 'Speed, distance and time', strand: 'Measurement' },
  'shape.properties': { name: '2D shape properties and symmetry', strand: 'Space' },
  'angles.types': { name: 'Naming and classifying angles', strand: 'Space' },
  'angles.turns': { name: 'Turns and degrees', strand: 'Space' },
  'angles.lines': { name: 'Parallel and perpendicular lines', strand: 'Space' },
  'angles.reasoning': { name: 'Finding unknown angles', strand: 'Space' },
  'angles.polygons': { name: 'Angles in polygons', strand: 'Space' },
  'statistics.averages': { name: 'Mean, median and range', strand: 'Statistics' },
  'probability.chance': { name: 'Chance', strand: 'Probability' },
};

/**
 * Every question template, as `topic:template`, and the skill it tests. Level 1 and Level 6
 * templates come from the extra Year 2 / Year 7 bank and start with `y2-` / `y7-`.
 * @type {Record<string, string>}
 */
export const QUESTION_TYPES = {
  // Fractions
  'fractions:half-vs-quarter': 'fractions.compare',
  'fractions:unit-compare-same-denom': 'fractions.compare',
  'fractions:half-of-number': 'fractions.of-amount',
  'fractions:quarter-of-number': 'fractions.of-amount',
  'fractions:shaded-parts': 'fractions.parts',
  'fractions:equivalent': 'fractions.equivalence',
  'fractions:same-denom-add': 'fractions.add-subtract',
  'fractions:compare-same-denom': 'fractions.compare',
  'fractions:third-of-number': 'fractions.of-amount',
  'fractions:missing-numerator': 'fractions.equivalence',
  'fractions:add-related-denom': 'fractions.add-subtract',
  'fractions:subtract-related-denom': 'fractions.add-subtract',
  'fractions:fraction-of-quantity': 'fractions.of-amount',
  'fractions:order-fractions': 'fractions.compare',
  'fractions:mixed-number': 'fractions.mixed',
  'fractions:compare-diff-denom': 'fractions.compare',
  'fractions:add-same-denom': 'fractions.add-subtract',
  'fractions:order-on-numberline': 'fractions.compare',
  'fractions:subtract-same-denom': 'fractions.add-subtract',
  'fractions:y2-shaded-shape': 'fractions.parts',
  'fractions:y2-half-of-number': 'fractions.of-amount',
  'fractions:y2-parts-in-whole': 'fractions.parts',
  'fractions:y7-add-subtract-unlike': 'fractions.add-subtract',
  'fractions:y7-multiply': 'fractions.multiply',
  'fractions:y7-improper-to-mixed': 'fractions.mixed',
  'fractions:y7-fraction-to-percent': 'decimals.convert',

  // Length Lab
  'measurement-length:compare-cm-small': 'length.compare',
  'measurement-length:compare-m-whole': 'length.compare',
  'measurement-length:longer-or-shorter': 'length.compare',
  'measurement-length:join-lengths': 'length.calculate',
  'measurement-length:metre-to-cm': 'length.convert',
  'measurement-length:compare-cm': 'length.compare',
  'measurement-length:compare-m': 'length.compare',
  'measurement-length:convert-simple': 'length.convert',
  'measurement-length:mm-to-cm': 'length.convert',
  'measurement-length:convert-mixed': 'length.convert',
  'measurement-length:convert-hard': 'length.convert',
  'measurement-length:perimeter-rect': 'length.perimeter',
  'measurement-length:add-lengths': 'length.calculate',
  'measurement-length:kilometres': 'length.convert',
  'measurement-length:decimal-metres': 'length.convert',
  'measurement-length:area-rect': 'area.calculate',
  'measurement-length:fence-gap': 'length.perimeter',
  'measurement-length:mixed-compare': 'length.compare',
  'measurement-length:y2-longest': 'length.compare',
  'measurement-length:y2-join-ribbons': 'length.calculate',
  'measurement-length:y2-difference': 'length.calculate',
  'measurement-length:y2-choose-unit': 'measurement.units',
  'measurement-length:y2-cm-in-metre': 'length.convert',
  'measurement-length:y7-triangle-area': 'area.calculate',
  'measurement-length:y7-parallelogram-area': 'area.calculate',
  'measurement-length:y7-composite-area': 'area.calculate',
  'measurement-length:y7-convert-metric': 'length.convert',
  'measurement-length:y7-map-scale': 'length.scale',

  // Angles & Shapes
  'angles:shape-sides': 'shape.properties',
  'angles:right-angle': 'angles.types',
  'angles:square-properties': 'shape.properties',
  'angles:triangle-type': 'shape.properties',
  'angles:rectangle-vs-square': 'shape.properties',
  'angles:acute-or-obtuse': 'angles.types',
  'angles:quarter-turn': 'angles.turns',
  'angles:compare-right-angle': 'angles.types',
  'angles:line-type': 'angles.lines',
  'angles:protractor-read': 'angles.types',
  'angles:angle-sum-triangle': 'angles.reasoning',
  'angles:angles-around-point': 'angles.reasoning',
  'angles:vertically-opposite': 'angles.reasoning',
  'angles:corresponding-angles': 'angles.reasoning',
  'angles:missing-quadrilateral': 'angles.reasoning',
  'angles:straight-line': 'angles.reasoning',
  'angles:full-turn': 'angles.turns',
  'angles:reflex': 'angles.types',
  'angles:symmetry': 'shape.properties',
  'angles:y2-name-shape': 'shape.properties',
  'angles:y2-count-corners': 'shape.properties',
  'angles:y2-quarter-turns': 'angles.turns',
  'angles:y2-shape-facts': 'shape.properties',
  'angles:y7-exterior-angle': 'angles.reasoning',
  'angles:y7-co-interior': 'angles.reasoning',
  'angles:y7-alternate': 'angles.reasoning',
  'angles:y7-polygon-angle-sum': 'angles.polygons',
  'angles:y7-regular-polygon-angle': 'angles.polygons',
  'angles:y7-isosceles-base': 'angles.reasoning',

  // Operations HQ
  'operations:add': 'operations.addition',
  'operations:subtract': 'operations.subtraction',
  'operations:multiply': 'operations.multiplication',
  'operations:divide': 'operations.division',
  'operations:add-after-multiply': 'operations.order',
  'operations:groups-plus-more': 'operations.multi-step',
  'operations:multiply-2-digit': 'operations.multiplication',
  'operations:missing-factor': 'operations.multiplication',
  'operations:multiply-teens': 'operations.multiplication',
  'operations:brackets': 'operations.order',
  'operations:y2-make-ten': 'operations.number-bonds',
  'operations:y2-make-twenty': 'operations.number-bonds',
  'operations:y2-add-within-20': 'operations.addition',
  'operations:y2-subtract-from-teens': 'operations.subtraction',
  'operations:y2-add-ones': 'operations.addition',
  'operations:y2-add-tens': 'operations.addition',
  'operations:y2-double': 'operations.multiplication',
  'operations:y2-equal-groups': 'operations.multiplication',
  'operations:y2-skip-count': 'number.counting',
  'operations:y7-add-negative': 'number.integers',
  'operations:y7-subtract-below-zero': 'number.integers',
  'operations:y7-multiply-negative': 'number.integers',
  'operations:y7-square-then-multiply': 'operations.order',
  'operations:y7-square-root': 'number.indices',
  'operations:y7-solve-equation': 'algebra.equations',
  'operations:y7-substitute': 'algebra.substitution',
  'operations:y7-powers': 'number.indices',
  'operations:y7-hcf': 'number.properties',

  // Decimals & %
  'decimals-percent:dollars-and-cents': 'money.calculate',
  'decimals-percent:dollars-to-cents': 'money.calculate',
  'decimals-percent:half-of': 'fractions.of-amount',
  'decimals-percent:tenths-in-whole': 'decimals.place-value',
  'decimals-percent:tenths-value': 'decimals.place-value',
  'decimals-percent:hundredths-value': 'decimals.place-value',
  'decimals-percent:half-as-decimal': 'decimals.convert',
  'decimals-percent:add-decimals': 'decimals.operations',
  'decimals-percent:subtract-decimals': 'decimals.operations',
  'decimals-percent:times-100': 'decimals.operations',
  'decimals-percent:percent-25': 'percent.of-amount',
  'decimals-percent:percent-10': 'percent.of-amount',
  'decimals-percent:percent-50': 'percent.of-amount',
  'decimals-percent:share-ratio': 'ratio.share',
  'decimals-percent:discount': 'percent.change',
  'decimals-percent:y2-coins-in-dollar': 'money.calculate',
  'decimals-percent:y2-add-coins': 'money.calculate',
  'decimals-percent:y2-change': 'money.calculate',
  'decimals-percent:y2-double-price': 'money.calculate',
  'decimals-percent:y2-worth-most': 'money.calculate',
  'decimals-percent:y7-percent-of': 'percent.of-amount',
  'decimals-percent:y7-percent-increase': 'percent.change',
  'decimals-percent:y7-sale-price': 'percent.change',
  'decimals-percent:y7-share-ratio': 'ratio.share',
  'decimals-percent:y7-simplify-ratio': 'ratio.share',
  'decimals-percent:y7-multiply-decimals': 'decimals.operations',
  'decimals-percent:y7-fraction-to-decimal': 'decimals.convert',

  // Time Command
  'time:hours-to-minutes': 'time.units',
  'time:minutes-elapsed': 'time.duration',
  'time:hours-elapsed': 'time.duration',
  'time:half-hour': 'time.units',
  'time:compare-durations': 'time.units',
  'time:quarter-hours': 'time.units',
  'time:elapsed-12h': 'time.duration',
  'time:finish-time': 'time.duration',
  'time:hours-minutes-to-minutes': 'time.units',
  'time:to-12-hour': 'time.12-24',
  'time:to-24-hour': 'time.12-24',
  'time:mission-duration': 'time.duration',
  'time:arrival-time': 'time.duration',
  'time:duration-to-minutes': 'time.units',
  'time:timetable-gap': 'time.timetables',
  'time:add-24h': 'time.duration',
  'time:duration-24h': 'time.duration',
  'time:multi-leg': 'time.duration',
  'time:days-to-hours': 'time.units',
  'time:past-midnight': 'time.duration',
  'time:departures': 'time.timetables',
  'time:y2-read-clock': 'time.read-clock',
  'time:y2-hour-later': 'time.duration',
  'time:y2-time-facts': 'time.units',
  'time:y7-time-zone': 'time.zones',
  'time:y7-distance': 'rates.speed',
  'time:y7-travel-time': 'rates.speed',
  'time:y7-overnight-duration': 'time.duration',
  'time:y7-decimal-hours': 'time.units',

  // Mass Capacity Volume
  'mass-capacity:heavier-grams': 'mass.compare',
  'mass-capacity:unit-for-bag': 'measurement.units',
  'mass-capacity:unit-for-bottle': 'measurement.units',
  'mass-capacity:bottles-total-ml': 'mass.calculate',
  'mass-capacity:container-add': 'mass.calculate',
  'mass-capacity:kg-to-g': 'mass.convert',
  'mass-capacity:l-to-ml': 'mass.convert',
  'mass-capacity:packs-total-g': 'mass.calculate',
  'mass-capacity:kg-vs-g': 'mass.compare',
  'mass-capacity:g-to-kg': 'mass.convert',
  'mass-capacity:ml-to-l': 'mass.convert',
  'mass-capacity:crate-volume': 'volume.calculate',
  'mass-capacity:bottles-to-litres': 'mass.calculate',
  'mass-capacity:packs-to-kg': 'mass.calculate',
  'mass-capacity:tank-space': 'mass.calculate',
  'mass-capacity:three-bottles': 'mass.calculate',
  'mass-capacity:bag-loses': 'mass.calculate',
  'mass-capacity:y2-heaviest': 'mass.compare',
  'mass-capacity:y2-holds-most': 'mass.compare',
  'mass-capacity:y2-jugs-to-cups': 'mass.calculate',
  'mass-capacity:y2-add-kg': 'mass.calculate',
  'mass-capacity:y2-choose-unit': 'measurement.units',
  'mass-capacity:y7-tank-litres': 'volume.calculate',
  'mass-capacity:y7-price-per-kg': 'money.best-buy',
  'mass-capacity:y7-better-value': 'money.best-buy',
  'mass-capacity:y7-convert-units': 'mass.convert',
  'mass-capacity:y7-cans-to-litres': 'mass.calculate',

  // Times Tables (and the Battle Prep extras built from them)
  ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`times-tables:table-${i + 1}`, 'operations.times-tables'])),
  'times-tables:division-fact': 'operations.division',
  'times-tables:missing-factor': 'operations.multiplication',
  'times-tables:square-number': 'number.indices',
  'times-tables:square-root': 'number.indices',

  // Place Value Patrol
  'place-value-siege:digit-value': 'number.place-value',
  'place-value-siege:total': 'number.place-value',
};

let notedType = '';

/**
 * Question makers call this with the template they picked, so the finished question can be labelled.
 * @template {string} T @param {T} name @returns {T}
 */
export function noteType(name) {
  notedType = name;
  return name;
}

/**
 * Adds the hidden `type` and `skill` labels to a finished question.
 * @template {object} Q
 * @param {Q} question
 * @param {string} topicId
 * @param {string} [name] The template; defaults to the one last passed to noteType.
 * @returns {Q & { type: string, skill: string }}
 */
export function labelQuestion(question, topicId, name = notedType) {
  notedType = '';
  const type = `${topicId}:${name}`;
  return { ...question, type, skill: QUESTION_TYPES[type] ?? 'unlabelled' };
}

/**
 * Labels a fixed problem (Maths Quest) with its own template name and skill.
 * @template {object} Q
 * @param {string} name @param {string} skill @param {Q} problem
 * @returns {Q & { type: string, skill: string }}
 */
export function withSkill(name, skill, problem) {
  return { ...problem, type: `maths-quest:${name}`, skill };
}
