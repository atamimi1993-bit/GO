// GO Pricing Engine — Worldwide
// Calculates total cost for a move based on weight, distance, truck, and fees
// Supports multi-currency, metric/imperial units, and international tax rates

const FUEL_PRICES = {
  gasoline: 3.50,
  diesel: 4.00,
  hybrid: 3.50,
  electric: 0.15, // per kWh equivalent (used as cost-per-mile for electric)
};
const FUEL_LABELS = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

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

const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', rate: 1, decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92, decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79, decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', rate: 1.36, decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', rate: 1.52, decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', rate: 149, decimals: 0 },
  INR: { code: 'INR', symbol: '₹', rate: 83, decimals: 0 },
  BRL: { code: 'BRL', symbol: 'R$', rate: 5.05, decimals: 2 },
  MXN: { code: 'MXN', symbol: 'Mex$', rate: 17.5, decimals: 0 },
  ZAR: { code: 'ZAR', symbol: 'R', rate: 18.5, decimals: 2 },
  AED: { code: 'AED', symbol: 'AED ', rate: 3.67, decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', rate: 1.35, decimals: 2 },
  NGN: { code: 'NGN', symbol: '₦', rate: 1500, decimals: 0 },
  KES: { code: 'KES', symbol: 'KSh ', rate: 155, decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', rate: 7.25, decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', rate: 1330, decimals: 0 },
  CHF: { code: 'CHF', symbol: 'CHF ', rate: 0.88, decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr ', rate: 10.5, decimals: 0 },
  NOK: { code: 'NOK', symbol: 'kr ', rate: 10.8, decimals: 0 },
  DKK: { code: 'DKK', symbol: 'kr ', rate: 6.9, decimals: 0 },
  PLN: { code: 'PLN', symbol: 'zł ', rate: 4.0, decimals: 2 },
  TRY: { code: 'TRY', symbol: '₺', rate: 32, decimals: 0 },
  NZD: { code: 'NZD', symbol: 'NZ$', rate: 1.65, decimals: 2 },
  THB: { code: 'THB', symbol: '฿', rate: 36, decimals: 0 },
  IDR: { code: 'IDR', symbol: 'Rp ', rate: 16000, decimals: 0 },
  PHP: { code: 'PHP', symbol: '₱', rate: 58, decimals: 0 },
  MYR: { code: 'MYR', symbol: 'RM', rate: 4.7, decimals: 2 },
  VND: { code: 'VND', symbol: '₫', rate: 25000, decimals: 0 },
  ILS: { code: 'ILS', symbol: '₪', rate: 3.7, decimals: 2 },
  ARS: { code: 'ARS', symbol: '$', rate: 900, decimals: 0 },
  CLP: { code: 'CLP', symbol: '$', rate: 950, decimals: 0 },
  COP: { code: 'COP', symbol: '$', rate: 4100, decimals: 0 },
  PEN: { code: 'PEN', symbol: 'S/', rate: 3.75, decimals: 2 },
  EGP: { code: 'EGP', symbol: 'E£', rate: 48, decimals: 0 },
  MAD: { code: 'MAD', symbol: 'DH ', rate: 10, decimals: 0 },
  GHS: { code: 'GHS', symbol: '₵', rate: 15, decimals: 0 },
  QAR: { code: 'QAR', symbol: 'QR ', rate: 3.64, decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KD ', rate: 0.31, decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SR ', rate: 3.75, decimals: 2 },
  CZK: { code: 'CZK', symbol: 'Kč ', rate: 23, decimals: 0 },
  HUF: { code: 'HUF', symbol: 'Ft ', rate: 360, decimals: 0 },
  RON: { code: 'RON', symbol: 'lei ', rate: 4.6, decimals: 2 },
  BGN: { code: 'BGN', symbol: 'лв ', rate: 1.8, decimals: 2 },
};

const COUNTRY_CONFIG = {
  US: { name: 'United States', currency: 'USD', taxRate: 0.06, distanceUnit: 'mi' },
  CA: { name: 'Canada', currency: 'CAD', taxRate: 0.05, distanceUnit: 'km' },
  MX: { name: 'Mexico', currency: 'MXN', taxRate: 0.16, distanceUnit: 'km' },
  GB: { name: 'United Kingdom', currency: 'GBP', taxRate: 0.20, distanceUnit: 'mi' },
  IE: { name: 'Ireland', currency: 'EUR', taxRate: 0.23, distanceUnit: 'km' },
  FR: { name: 'France', currency: 'EUR', taxRate: 0.20, distanceUnit: 'km' },
  DE: { name: 'Germany', currency: 'EUR', taxRate: 0.19, distanceUnit: 'km' },
  ES: { name: 'Spain', currency: 'EUR', taxRate: 0.21, distanceUnit: 'km' },
  IT: { name: 'Italy', currency: 'EUR', taxRate: 0.22, distanceUnit: 'km' },
  NL: { name: 'Netherlands', currency: 'EUR', taxRate: 0.21, distanceUnit: 'km' },
  BE: { name: 'Belgium', currency: 'EUR', taxRate: 0.21, distanceUnit: 'km' },
  PT: { name: 'Portugal', currency: 'EUR', taxRate: 0.23, distanceUnit: 'km' },
  CH: { name: 'Switzerland', currency: 'CHF', taxRate: 0.077, distanceUnit: 'km' },
  AT: { name: 'Austria', currency: 'EUR', taxRate: 0.20, distanceUnit: 'km' },
  SE: { name: 'Sweden', currency: 'SEK', taxRate: 0.25, distanceUnit: 'km' },
  NO: { name: 'Norway', currency: 'NOK', taxRate: 0.25, distanceUnit: 'km' },
  DK: { name: 'Denmark', currency: 'DKK', taxRate: 0.25, distanceUnit: 'km' },
  FI: { name: 'Finland', currency: 'EUR', taxRate: 0.255, distanceUnit: 'km' },
  PL: { name: 'Poland', currency: 'PLN', taxRate: 0.23, distanceUnit: 'km' },
  GR: { name: 'Greece', currency: 'EUR', taxRate: 0.24, distanceUnit: 'km' },
  CZ: { name: 'Czech Republic', currency: 'CZK', taxRate: 0.21, distanceUnit: 'km' },
  HU: { name: 'Hungary', currency: 'HUF', taxRate: 0.27, distanceUnit: 'km' },
  RO: { name: 'Romania', currency: 'RON', taxRate: 0.19, distanceUnit: 'km' },
  BG: { name: 'Bulgaria', currency: 'BGN', taxRate: 0.20, distanceUnit: 'km' },
  HR: { name: 'Croatia', currency: 'EUR', taxRate: 0.25, distanceUnit: 'km' },
  JP: { name: 'Japan', currency: 'JPY', taxRate: 0.10, distanceUnit: 'km' },
  CN: { name: 'China', currency: 'CNY', taxRate: 0.13, distanceUnit: 'km' },
  IN: { name: 'India', currency: 'INR', taxRate: 0.18, distanceUnit: 'km' },
  KR: { name: 'South Korea', currency: 'KRW', taxRate: 0.10, distanceUnit: 'km' },
  SG: { name: 'Singapore', currency: 'SGD', taxRate: 0.09, distanceUnit: 'km' },
  AE: { name: 'United Arab Emirates', currency: 'AED', taxRate: 0.05, distanceUnit: 'km' },
  SA: { name: 'Saudi Arabia', currency: 'SAR', taxRate: 0.15, distanceUnit: 'km' },
  QA: { name: 'Qatar', currency: 'QAR', taxRate: 0.10, distanceUnit: 'km' },
  KW: { name: 'Kuwait', currency: 'KWD', taxRate: 0.10, distanceUnit: 'km' },
  TH: { name: 'Thailand', currency: 'THB', taxRate: 0.07, distanceUnit: 'km' },
  MY: { name: 'Malaysia', currency: 'MYR', taxRate: 0.06, distanceUnit: 'km' },
  ID: { name: 'Indonesia', currency: 'IDR', taxRate: 0.11, distanceUnit: 'km' },
  PH: { name: 'Philippines', currency: 'PHP', taxRate: 0.12, distanceUnit: 'km' },
  VN: { name: 'Vietnam', currency: 'VND', taxRate: 0.10, distanceUnit: 'km' },
  IL: { name: 'Israel', currency: 'ILS', taxRate: 0.17, distanceUnit: 'km' },
  TR: { name: 'Turkey', currency: 'TRY', taxRate: 0.20, distanceUnit: 'km' },
  AU: { name: 'Australia', currency: 'AUD', taxRate: 0.10, distanceUnit: 'km' },
  NZ: { name: 'New Zealand', currency: 'NZD', taxRate: 0.15, distanceUnit: 'km' },
  ZA: { name: 'South Africa', currency: 'ZAR', taxRate: 0.15, distanceUnit: 'km' },
  NG: { name: 'Nigeria', currency: 'NGN', taxRate: 0.075, distanceUnit: 'km' },
  KE: { name: 'Kenya', currency: 'KES', taxRate: 0.16, distanceUnit: 'km' },
  EG: { name: 'Egypt', currency: 'EGP', taxRate: 0.14, distanceUnit: 'km' },
  MA: { name: 'Morocco', currency: 'MAD', taxRate: 0.20, distanceUnit: 'km' },
  GH: { name: 'Ghana', currency: 'GHS', taxRate: 0.15, distanceUnit: 'km' },
  BR: { name: 'Brazil', currency: 'BRL', taxRate: 0.17, distanceUnit: 'km' },
  AR: { name: 'Argentina', currency: 'ARS', taxRate: 0.21, distanceUnit: 'km' },
  CO: { name: 'Colombia', currency: 'COP', taxRate: 0.19, distanceUnit: 'km' },
  CL: { name: 'Chile', currency: 'CLP', taxRate: 0.19, distanceUnit: 'km' },
  PE: { name: 'Peru', currency: 'PEN', taxRate: 0.18, distanceUnit: 'km' },
};

const COUNTRY_LIST = Object.entries(COUNTRY_CONFIG)
  .map(([code, cfg]) => ({ code, name: cfg.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const APP_FEE_RATE = 0.25;
const DRIVER_SHARE_RATE = 0.15;
const FREIGHT_DRIVER_SHARE_RATE = 0.35;
const MI_TO_KM = 1.60934;
const LB_TO_KG = 0.453592;
const GAL_TO_L = 3.78541;

export function calculateMovePrice({ totalWeightLbs, distanceMiles, truckSize, stateCode, countryCode, currency, distanceUnit, weightUnit, jobType, truckMpg, fuelType }) {
  const truck = TRUCK_CONFIG[truckSize] || TRUCK_CONFIG.medium;

  // Convert metric inputs to imperial for internal calculation
  const weightInLbs = weightUnit === 'kg' ? totalWeightLbs / LB_TO_KG : totalWeightLbs;
  const distanceInMiles = distanceUnit === 'km' ? distanceMiles / MI_TO_KM : distanceMiles;

  const roundTripMiles = distanceInMiles * 2;

  // Base cost + per-mile + per-pound (calculated in USD)
  const baseCost = truck.baseCost + (roundTripMiles * truck.costPerMile) + (weightInLbs * truck.costPerLb);

  // Fuel cost for round trip (in USD) — uses driver's actual truck MPG & fuel type if provided
  const actualMpg = truckMpg || truck.mpg;
  const actualFuelType = fuelType || 'gasoline';
  const fuelPrice = FUEL_PRICES[actualFuelType] || FUEL_PRICES.gasoline;
  const gallonsNeeded = roundTripMiles / actualMpg;
  const fuelCost = actualFuelType === 'electric' ? roundTripMiles * fuelPrice : gallonsNeeded * fuelPrice;

  // Subtotal before fees (in USD)
  const subtotal = baseCost + fuelCost;

  // Tax rate: country config overrides state
  const country = countryCode ? COUNTRY_CONFIG[countryCode] : null;
  const taxRate = country ? country.taxRate : (STATE_TAX_RATES[stateCode?.toUpperCase()] || 0.06);
  const taxAmount = subtotal * taxRate;

  // App fee (25%) (in USD)
  const appFee = subtotal * APP_FEE_RATE;
  const driverFee = 0;

  // Total and driver payout (in USD) — freight/CDL drivers earn 35%, others earn 15%
  const totalPrice = subtotal + taxAmount + appFee;
  const isFreight = jobType === 'freight' || jobType === 'corporate_logistics';
  const driverPayout = totalPrice * (isFreight ? FREIGHT_DRIVER_SHARE_RATE : DRIVER_SHARE_RATE);

  // Currency conversion
  const currencyCode = currency || country?.currency || 'USD';
  const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const convert = (usd) => Math.round(usd * curr.rate * Math.pow(10, curr.decimals)) / Math.pow(10, curr.decimals);

  // Display units
  const useMetric = distanceUnit === 'km' || (!distanceUnit && country?.distanceUnit === 'km');
  const displayRoundTrip = useMetric ? Math.round(roundTripMiles * MI_TO_KM * 10) / 10 : Math.round(roundTripMiles * 10) / 10;
  const displayDistanceUnit = useMetric ? 'km' : 'mi';
  const displayFuel = useMetric ? Math.round(gallonsNeeded * GAL_TO_L * 10) / 10 : Math.round(gallonsNeeded * 10) / 10;
  const displayFuelUnit = useMetric ? 'L' : 'gal';

  return {
    baseCost: convert(baseCost),
    fuelCost: convert(fuelCost),
    taxRate,
    taxAmount: convert(taxAmount),
    appFee: convert(appFee),
    driverFee: convert(driverFee),
    totalPrice: convert(totalPrice),
    driverPayout: convert(driverPayout),
    roundTripMiles,
    gallonsNeeded: Math.round(gallonsNeeded * 10) / 10,
    currency: curr,
    displayDistance: displayRoundTrip,
    displayDistanceUnit,
    displayFuel,
    displayFuelUnit,
  };
}

export function recommendTruckSize(totalWeightLbs) {
  if (totalWeightLbs <= 1000) return 'small';
  if (totalWeightLbs <= 3000) return 'medium';
  if (totalWeightLbs <= 6000) return 'large';
  return 'extra_large';
}

export function getCurrency(currencyCode = 'USD') {
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

export function formatCurrency(amount, currencyCode = 'USD') {
  const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return curr.symbol + Number(amount || 0).toFixed(curr.decimals);
}

export const TRUCK_SIZE_LABELS = {
  small: 'Pickup / Small Van (up to 1,000 lbs)',
  medium: 'Cargo Van / Small Box (up to 3,000 lbs)',
  large: 'Box Truck (up to 6,000 lbs)',
  extra_large: '26ft+ Truck (6,000+ lbs)',
};

export { STATE_TAX_RATES, CURRENCIES, COUNTRY_CONFIG, COUNTRY_LIST, FUEL_PRICES, FUEL_LABELS };