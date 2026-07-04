// GO Carbon Footprint Engine
// Calculates CO₂ emissions for moves based on distance, fuel type, and truck efficiency

// Emission factors: kg CO₂ per gallon (well-to-wheel)
const EMISSION_FACTORS = {
  gasoline: 8.89,   // 8.89 kg CO₂ per gallon of gasoline
  diesel: 10.16,    // 10.16 kg CO₂ per gallon of diesel
  hybrid: 4.45,     // ~50% of gasoline due to regenerative braking
  electric: 0,      // tailpipe emissions = 0
};

// Average car emission for comparison: 0.404 kg CO₂ per mile (EPA average)
const AVG_CAR_KG_PER_MILE = 0.404;

// One tree absorbs ~21 kg CO₂ per year
const TREE_ABSORPTION_KG_PER_YEAR = 21;

const MI_TO_KM = 1.60934;

/**
 * Calculate carbon footprint for a move
 * @param {object} params
 * @param {number} params.distanceMiles - one-way distance
 * @param {string} params.fuelType - gasoline | diesel | hybrid | electric
 * @param {number} params.mpg - miles per gallon
 * @param {string} params.distanceUnit - 'mi' or 'km'
 * @param {number} params.roundTripMiles - pre-calculated round trip (overrides distanceMiles)
 * @returns {{ co2Kg: number, isGreen: boolean, equivalenceMiles: number, treesToOffset: number, fuelType: string }}
 */
export function calculateCarbonFootprint({ distanceMiles = 0, fuelType = 'gasoline', mpg = 14, distanceUnit = 'mi', roundTripMiles } = {}) {
  const oneWayMiles = distanceUnit === 'km' ? distanceMiles / MI_TO_KM : distanceMiles;
  const rtMiles = roundTripMiles || oneWayMiles * 2;

  const effectiveMpg = mpg || 14;
  const effectiveFuelType = fuelType || 'gasoline';
  const emissionFactor = EMISSION_FACTORS[effectiveFuelType] ?? EMISSION_FACTORS.gasoline;

  const gallonsUsed = effectiveFuelType === 'electric' ? 0 : rtMiles / effectiveMpg;
  const co2Kg = gallonsUsed * emissionFactor;

  // How many miles an average car would need to produce the same CO₂
  const equivalenceMiles = co2Kg / AVG_CAR_KG_PER_MILE;

  // Trees needed to offset for one year
  const treesToOffset = co2Kg / TREE_ABSORPTION_KG_PER_YEAR;

  return {
    co2Kg: Math.round(co2Kg * 100) / 100,
    isGreen: effectiveFuelType === 'electric' || effectiveFuelType === 'hybrid',
    equivalenceMiles: Math.round(equivalenceMiles),
    treesToOffset: Math.round(treesToOffset * 100) / 100,
    fuelType: effectiveFuelType,
    gallonsUsed: Math.round(gallonsUsed * 100) / 100,
    roundTripMiles: Math.round(rtMiles * 100) / 100,
  };
}

/**
 * Format CO₂ for display
 */
export function formatCO2(kg) {
  if (kg === 0) return '0 kg CO₂';
  if (kg < 1) return `${Math.round(kg * 1000)} g CO₂`;
  if (kg < 10) return `${kg.toFixed(1)} kg CO₂`;
  return `${Math.round(kg)} kg CO₂`;
}

/**
 * Get a label for the fuel type's environmental impact
 */
export function getEcoLabel(fuelType) {
  switch (fuelType) {
    case 'electric': return { label: 'Zero Emission', color: 'emerald' };
    case 'hybrid': return { label: 'Low Emission', color: 'green' };
    case 'diesel': return { label: 'Higher Emission', color: 'amber' };
    default: return { label: 'Standard Emission', color: 'slate' };
  }
}