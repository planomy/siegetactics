/**
 * Maths topic categories on the home screen.
 * @typedef {'times-tables'|'place-value-siege'|'measurement-length'|'maths-quest'|'coming-soon'} TopicId
 */

/** @typedef {'forge'|'drill'|'siege'|'quest'} TrainingMode */

/**
 * @typedef {{
 *   id: TopicId|string,
 *   title: string,
 *   subtitle: string,
 *   emoji: string,
 *   strand: string,
 *   available: boolean,
 *   earnsXp: boolean,
 *   gateEligible: boolean,
 *   unitId?: string,
 *   trainingMode?: TrainingMode,
 *   moduleArt?: string,
 * }} MathTopic
 */

/** @type {MathTopic[]} */
export const MATH_TOPICS = [
  {
    id: 'times-tables',
    title: 'Times Tables',
    subtitle: '2 drills push the attack back',
    emoji: '×',
    strand: 'Number',
    available: true,
    earnsXp: true,
    gateEligible: false,
    moduleArt: 'assets/topics/times-tables.png',
  },
  {
    id: 'place-value-siege',
    title: 'Place Value Patrol',
    subtitle: 'Forge digits · buy prep time',
    emoji: '🔢',
    strand: 'Number',
    available: true,
    earnsXp: true,
    gateEligible: true,
    unitId: 'number-place-value-patrol',
    trainingMode: 'forge',
    moduleArt: 'assets/topics/place-value-siege.png',
  },
  {
    id: 'measurement-length',
    title: 'Length Lab',
    subtitle: 'Compare & convert lengths',
    emoji: '📏',
    strand: 'Measurement',
    available: true,
    earnsXp: true,
    gateEligible: true,
    unitId: 'measurement-length-lab',
    trainingMode: 'drill',
    moduleArt: 'assets/topics/measurement-length.png',
  },
  {
    id: 'fractions',
    title: 'Fractions',
    subtitle: 'Compare & order fractions',
    emoji: '½',
    strand: 'Number',
    available: true,
    earnsXp: true,
    gateEligible: true,
    unitId: 'fractions-fence',
    trainingMode: 'drill',
    moduleArt: 'assets/topics/fractions.png',
  },
  {
    id: 'angles',
    title: 'Angles & Shapes',
    subtitle: 'Measure angles & shapes',
    emoji: '∠',
    strand: 'Space',
    available: true,
    earnsXp: true,
    gateEligible: true,
    unitId: 'angles-shapes-lab',
    trainingMode: 'drill',
    moduleArt: 'assets/topics/angles.png',
  },
  {
    id: 'maths-quest',
    title: 'Maths Quest',
    subtitle: '10-problem problem sets',
    emoji: '🧩',
    strand: 'Problem solving',
    available: true,
    earnsXp: true,
    gateEligible: true,
    unitId: 'maths-quest-set',
    trainingMode: 'quest',
    moduleArt: 'assets/topics/maths-quest.png',
  },
];

/** @param {string} id */
export function getTopic(id) {
  return MATH_TOPICS.find((t) => t.id === id) ?? null;
}

/** @returns {MathTopic[]} All modules except times tables that count toward deployment readiness. */
export function getGateTopics() {
  return MATH_TOPICS.filter((t) => t.available && t.id !== 'times-tables' && t.unitId);
}
