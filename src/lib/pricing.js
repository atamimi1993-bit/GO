// GO Pricing Engine
// Calculates total cost for a move based on weight, distance, truck, and fees

const GAS_PRICE_PER_GALLON = 3.50;

const TRUCK_CONFIG = {
  small: { baseCost: 75, costPerMile: 1.50, costPerLb: 0.05, mpg: 18 },
  medium: { baseCost: 125, costPerMile: 2.00, costPerLb: 0.04, mpg: 14 },
  large: { baseCost: 200, costPerMile: 2.75, costPerLb: 0.03, mpg: 10 },
  extra_large: { baseCost: 300, costPerMile: 3.50, costPerLb: 0.025, mpg: 8 },
};

const STATE_TAX_RATES = {
  AL: 0.04, AK: 0, AZ: 0.056, AR: 0.065, CA: 0.0725, CO: 0.029, CT: 0.0635,
  DE: 0, FL: 0.06, GA: 0.04, HI: 0.04, ID: 0.06, IL: 0.0625, IN: 0.07,
  IA: 0.06, KS: 0.065, KY: 0.06, LA: 0.0445, ME: 0.055, MD: 0.06,
  MA: 0.0625, MI: 0.06, MN: 0.06875, MS: 0.07, MO: 0.04225, MT: 0,
  NE: 0.055, NV: 0.0685, NH: 0, NJ: 0.06625, NM: 0.05125, NY: 0.04,
  NC: 0.0475, ND: 0.05, OH: 0.0575, OK: 0.045, OR: 0, PA: 0.06,
  RI: 0.07, SC: 0.06, SD: 0.042, TN: 0.07, TX: 0.0625, UT: 0.0610,
  VT: 0.06, VA: 0.053, WA: 0.065, WV: 0.06, WI: 0.05, WY: 0.04, DC: 0.06
};

const APP_FEE_RATE = 0.10;
const DRIVER_FEE_RATE = 0.05;

export function calculateMovePrice({ totalWeightLbs, distanceMiles, truckSize, stateCode }) {
  const truck = TRUCK_CONFIG[truckSize] || TRUCK_CONFIG.medium;
  const roundTripMiles = distanceMiles * 2;

  // Base cost + per-mile + per-pound
  const baseCost = truck.baseCost + (roundTripMiles * truck.costPerMile) + (totalWeightLbs * truck.costPerLb);

  // Fuel cost for round trip
  const gallonsNeeded = roundTripMiles / truck.mpg;
  const fuelCost = gallonsNeeded * GAS_PRICE_PER_GALLON;

  // Subtotal before fees
  const subtotal = baseCost + fuelCost;

  // Tax
  const taxRate = STATE_TAX_RATES[stateCode?.toUpperCase()] || 0.06;
  const taxAmount = subtotal * taxRate;

  // App fee (10%)
  const appFee = subtotal * APP_FEE_RATE;

  // Driver fee (5%)
  const driverFee = subtotal * DRIVER_FEE_RATE;

  // Total
  const totalPrice = subtotal + taxAmount + appFee + driverFee;

  // Driver payout = subtotal + driver fee - app fee
  const driverPayout = subtotal + driverFee;

  return {
    baseCost: Math.round(baseCost * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    appFee: Math.round(appFee * 100) / 100,
    driverFee: Math.round(driverFee * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    driverPayout: Math.round(driverPayout * 100) / 100,
    roundTripMiles,
    gallonsNeeded: Math.round(gallonsNeeded * 10) / 10,
  };
}

export function recommendTruckSize(totalWeightLbs) {
  if (totalWeightLbs <= 1000) return 'small';
  if (totalWeightLbs <= 3000) return 'medium';
  if (totalWeightLbs <= 6000) return 'large';
  return 'extra_large';
}

export const TRUCK_SIZE_LABELS = {
  small: 'Pickup / Small Van (up to 1,000 lbs)',
  medium: 'Cargo Van / Small Box (up to 3,000 lbs)',
  large: 'Box Truck (up to 6,000 lbs)',
  extra_large: '26ft+ Truck (6,000+ lbs)',
};

export { STATE_TAX_RATES };