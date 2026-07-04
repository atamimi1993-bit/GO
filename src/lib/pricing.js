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

// ─── Revenue Split Model ──────────────────────────────────────────────────────
// Core rules:
//   1. driver_payout is a PROTECTED FLOOR — never reduced by fees, refunds,
//      disputes, tax, or promos. No exceptions, no per-job surprises.
//   2. Costs (processing fees, refunds, disputes) are absorbed by a POOLED
//      RESERVE inside platform_fee — spread across ALL jobs, never deducted
//      from one unlucky driver's payout.
//   3. Sales tax is calculated separately, charged to the customer, and passed
//      straight through to the state. It is never part of driver_payout or
//      platform_fee.
//
//   job_value (service value) = base + labor + distance + fees + surge
//   driver_payout  = job_value × 0.65   (PROTECTED FLOOR — never reduced by anything)
//   platform_fee   = job_value × 0.35   (gross — absorbs reserve pool + processing + discounts)
//   customer_price = job_value × 0.88   (12% below market — platform absorbs discount)
//
// From platform_fee, the following are deducted (NEVER from driver_payout):
//   - reserve_contribution: 4% of job_value → shared pool for refunds/disputes
//   - processing_fee: 2.9% + $0.30 per transaction
//   - customer discount shortfall (when customer_price < job_value)

const APP_FEE_RATE = 0.35;        // Platform target share of service value
const DRIVER_SHARE = 0.65;       // Driver protected floor share of service value
const PLATFORM_SHARE = 0.35;    // Platform target share of service value

// Reserve pool — shared across ALL jobs for refunds/disputes
// Comes OUT of platform_fee, never from driver_payout
const RESERVE_POOL_PCT = 0.04;   // 4% of job_value set aside into shared reserve pool

// Card processing (Stripe rates)
const CARD_PROCESSING_PCT = 0.029;   // 2.9%
const CARD_PROCESSING_FLAT = 0.30;   // + $0.30 per transaction

// Booking fee — flat, goes to platform (added to customer total, NOT part of split)
const BOOKING_FEE = 3.50;

// Market rate — traditional competitors charge ~45% above GO's service cost
const MARKET_RATE_MULTIPLIER = 1.45;

// Customer discount below market rate (12% — wins customers without killing margin)
const CUSTOMER_DISCOUNT_RATE = 0.12;

// Platform minimum — GO always earns at least this per job, even after discounts
const PLATFORM_MINIMUM_FEE = 20;

const MI_TO_KM = 1.60934;

// Bulky item surcharge — flat fee per item flagged as bulky (special handling or 75+ lbs)
const BULKY_ITEM_FEE = 25;
const BULKY_WEIGHT_THRESHOLD = 75;

// Carrying surcharge — based on stairs/steps and distance from street parking to door
const FEE_PER_STEP = 3;          // $3 per step (pickup + dropoff combined)
const FEE_PER_50FT = 1;          // $1 per 50ft of distance from street to door

// Extra service add-ons — flat fees the customer can toggle
const EXTRA_HELPER_FEE = 50;     // additional mover for the job
const ELEVATOR_SERVICE_FEE = 30; // buildings requiring elevator reservation

// Labor rates — hourly by truck size (base labor hours derived from weight)
const LABOR_RATES = {
  small:       { hourlyRate: 45, baseHours: 2 },
  medium:      { hourlyRate: 55, baseHours: 3 },
  large:       { hourlyRate: 65, baseHours: 4 },
  extra_large: { hourlyRate: 75, baseHours: 5 },
};

// Long carry threshold — fee kicks in beyond 75ft from truck to door
const LONG_CARRY_THRESHOLD_FT = 75;
const LONG_CARRY_FEE_PER_50FT = 2;

// Minimum job value — floor on service value to protect both driver and platform
const MINIMUM_JOB_FEE = 75;

// Loyalty discount — returning customer markdown (5% off adjusted subtotal)
const LOYALTY_DISCOUNT_RATE = 0.05;

// Same-day surcharge
const SAME_DAY_MULTIPLIER = 1.30;

// Peak day surcharge — last weekend of month
const PEAK_DAY_MULTIPLIER = 1.20;

// Insurance tiers — damage protection upsell (pure profit for GO)
const INSURANCE_TIERS = {
  basic:    { fee: 15, coverage: 1000,  label: 'Basic Protection',    description: 'Covers up to $1,000 in damage' },
  premium:  { fee: 35, coverage: 5000,  label: 'Premium Protection',  description: 'Covers up to $5,000 in damage' },
  platinum: { fee: 75, coverage: 10000, label: 'Platinum Protection', description: 'Covers up to $10,000 in damage' },
};

// Cancellation fee — charged when a customer cancels after a driver has accepted
const CANCELLATION_FEE = 250;

// Driver payout rates based on truck size + job type
// GO covers gas and miles; driver earns a rate for their labor + equipment
const DRIVER_RATES = {
  residential: {
    small:       { basePay: 25, perMile: 1.50, perLb: 0.030 },
    medium:      { basePay: 35, perMile: 2.00, perLb: 0.025 },
    large:       { basePay: 50, perMile: 2.50, perLb: 0.020 },
    extra_large: { basePay: 65, perMile: 3.00, perLb: 0.015 },
  },
  freight: {
    small:       { basePay: 40, perMile: 2.25, perLb: 0.035 },
    medium:      { basePay: 55, perMile: 3.00, perLb: 0.030 },
    large:       { basePay: 75, perMile: 3.75, perLb: 0.025 },
    extra_large: { basePay: 95, perMile: 4.50, perLb: 0.020 },
  },
  corporate_logistics: {
    small:       { basePay: 45, perMile: 2.50, perLb: 0.040 },
    medium:      { basePay: 60, perMile: 3.25, perLb: 0.035 },
    large:       { basePay: 80, perMile: 4.00, perLb: 0.030 },
    extra_large: { basePay: 100, perMile: 4.75, perLb: 0.025 },
  },
  // Courier — small deliveries (documents, medical samples, pharmacy, etc.)
  // Flat-rate-ish: low base, per-mile focused, minimal weight impact
  courier: {
    small:       { basePay: 12, perMile: 1.20, perLb: 0.010 },
    medium:      { basePay: 15, perMile: 1.50, perLb: 0.008 },
    large:       { basePay: 20, perMile: 2.00, perLb: 0.005 },
    extra_large: { basePay: 25, perMile: 2.50, perLb: 0.003 },
  },
};

// Courier delivery surcharge by category — covers special handling needs
export const COURIER_CATEGORY_FEES = {
  hospital: 10,        // medical items, lab samples
  bank: 8,             // secure document transport
  office: 0,
  pharmacy: 5,
  lab_medical: 15,     // temperature-sensitive, time-critical
  legal_documents: 12, // chain-of-custody
  retail: 0,
  restaurant: 5,       // hot food, time-sensitive
  other: 0,
};

// Quick courier price estimate — simplified for the one-page booking
export function calculateCourierPrice({ distanceMiles, deliveryCategory = 'other', tolls = 0, countryCode, stateCode, currency, distanceUnit }) {
  const distanceInMiles = distanceUnit === 'km' ? distanceMiles / MI_TO_KM : distanceMiles;
  const roundTripMiles = distanceInMiles * 2;

  // Small truck for all courier jobs
  const truck = TRUCK_CONFIG.small;
  const baseCost = truck.baseCost + (roundTripMiles * truck.costPerMile);
  const fuelCost = (roundTripMiles / truck.mpg) * FUEL_PRICES.gasoline;
  const driverRate = DRIVER_RATES.courier.small;
  const baseDriverPayout = driverRate.basePay + (roundTripMiles * driverRate.perMile);
  const categoryFee = COURIER_CATEGORY_FEES[deliveryCategory] || 0;
  const tollCost = Number(tolls) || 0;

  // Hard costs (passthrough)
  const hardCosts = fuelCost + tollCost;

  // Service value (split 65/35) — base + category handling fee
  const serviceValue = baseCost + categoryFee;

  // Three-way split — driver_payout is a PROTECTED FLOOR
  const splitDriverPayout = serviceValue * DRIVER_SHARE;
  const driverPayout = Math.max(splitDriverPayout, baseDriverPayout);

  // Platform costs — come OUT of platform_fee, NEVER from driver_payout
  const reserveContribution = serviceValue * RESERVE_POOL_PCT;
  const processingFee = serviceValue * CARD_PROCESSING_PCT + CARD_PROCESSING_FLAT;
  const totalPlatformCosts = reserveContribution + processingFee;

  // Market rate and customer discount (12% below market)
  const marketServiceRate = serviceValue * MARKET_RATE_MULTIPLIER;
  const customerServicePrice = serviceValue * (1 - CUSTOMER_DISCOUNT_RATE);
  let platformFeeGross = serviceValue * PLATFORM_SHARE;
  // Net platform profit after reserve + processing
  let netPlatformProfit = platformFeeGross - totalPlatformCosts;
  // Platform minimum floor
  if (netPlatformProfit < PLATFORM_MINIMUM_FEE) netPlatformProfit = PLATFORM_MINIMUM_FEE;
  let platformFee = netPlatformProfit;

  // Booking fee — flat, goes to platform, NOT part of the split
  const bookingFee = BOOKING_FEE;

  const customerPricePreTax = customerServicePrice + hardCosts + bookingFee;

  const country = countryCode ? COUNTRY_CONFIG[countryCode] : null;
  const taxRate = country ? country.taxRate : (STATE_TAX_RATES[stateCode?.toUpperCase()] || 0.06);
  const taxAmount = customerPricePreTax * taxRate;
  const totalPrice = customerPricePreTax + taxAmount;

  // Reconciliation check — driver + platform should equal job value
  const reconciles = Math.round((driverPayout + platformFeeGross) * 100) / 100 === Math.round(serviceValue * 100) / 100;

  const marketRateTotal = (marketServiceRate + hardCosts) * (1 + taxRate);
  const customerSavings = marketRateTotal - totalPrice;
  const customerSavingsPercent = marketRateTotal > 0 ? Math.round((customerSavings / marketRateTotal) * 100) : 0;

  const currencyCode = currency || country?.currency || 'USD';
  const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const convert = (usd) => Math.round(usd * curr.rate * Math.pow(10, curr.decimals)) / Math.pow(10, curr.decimals);

  return {
    baseCost: convert(baseCost),
    fuelCost: convert(fuelCost),
    driverPayout: convert(driverPayout),
    driverPayoutPercent: totalPrice > 0 ? Math.round((driverPayout / totalPrice) * 100) : 0,
    platformTakePercent: totalPrice > 0 ? Math.round((platformFee / totalPrice) * 100) : 0,
    categoryFee: convert(categoryFee),
    tollCost: convert(tollCost),
    appFee: convert(platformFee),
    goProfit: convert(platformFee),
    platformFeeGross: convert(platformFeeGross),
    reserveContribution: convert(reserveContribution),
    processingFee: convert(processingFee),
    totalPlatformCosts: convert(totalPlatformCosts),
    netPlatformProfit: convert(netPlatformProfit),
    netProfitPct: serviceValue > 0 ? Math.round((netPlatformProfit / serviceValue) * 100) / 100 : 0,
    bookingFee: convert(bookingFee),
    reconciles,
    taxRate,
    taxAmount: convert(taxAmount),
    totalPrice: convert(totalPrice),
    marketRate: convert(marketRateTotal),
    customerSavings: convert(customerSavings),
    customerSavingsPercent,
    driverFee: 0,
    bulkyItemFee: 0,
    materialsFee: 0,
    carryingFee: 0,
    extraServiceFee: 0,
    serviceValue: convert(serviceValue),
    operationalSubtotal: convert(serviceValue + hardCosts),
    surgeAdjustedSubtotal: convert(serviceValue + hardCosts),
    adjustedOperationalSubtotal: convert(serviceValue + hardCosts),
    currency: curr,
  };
}
const LB_TO_KG = 0.453592;
const GAL_TO_L = 3.78541;

export function calculateMovePrice({ totalWeightLbs, distanceMiles, truckSize, stateCode, countryCode, currency, distanceUnit, weightUnit, jobType, truckMpg, fuelType, tolls, bulkyItemCount = 0, materialsFee = 0, pickupSteps = 0, dropoffSteps = 0, pickupDistanceFromStreet = 0, dropoffDistanceFromStreet = 0, extraHelper = false, elevatorService = false, pendingMovesCount = 0, moveDate, isReturningCustomer = false, laborHours }) {
  const truck = TRUCK_CONFIG[truckSize] || TRUCK_CONFIG.medium;

  // Convert metric inputs to imperial for internal calculation
  const weightInLbs = weightUnit === 'kg' ? totalWeightLbs / LB_TO_KG : totalWeightLbs;
  const distanceInMiles = distanceUnit === 'km' ? distanceMiles / MI_TO_KM : distanceMiles;
  const roundTripMiles = distanceInMiles * 2;

  // Labor cost — estimated from weight + truck base hours, or overridden by caller
  const labor = LABOR_RATES[truckSize] || LABOR_RATES.medium;
  const estimatedLaborHours = Number(laborHours) || (labor.baseHours + Math.ceil(weightInLbs / 2000));
  const laborCost = estimatedLaborHours * labor.hourlyRate;

  // Base service cost (truck dispatch + distance + labor) — this is the core service value
  const baseCost = truck.baseCost + (roundTripMiles * truck.costPerMile) + laborCost;

  // Fuel cost — HARD COST (passthrough to driver, NOT split between platform/driver)
  const actualMpg = truckMpg || truck.mpg;
  const actualFuelType = fuelType || 'gasoline';
  const fuelPrice = FUEL_PRICES[actualFuelType] || FUEL_PRICES.gasoline;
  const gallonsNeeded = roundTripMiles / actualMpg;
  const fuelCost = actualFuelType === 'electric' ? roundTripMiles * fuelPrice : gallonsNeeded * fuelPrice;

  // Driver base rate — MINIMUM FLOOR for driver payout (from the rate table by truck + job type)
  // The three-way split (75% of service value) almost always exceeds this, but it
  // guarantees drivers never earn less than the base rate on any job.
  const jobKey = jobType || 'residential';
  const rateTable = DRIVER_RATES[jobKey] || DRIVER_RATES.residential;
  const driverRate = rateTable[truckSize] || rateTable.medium;
  const baseDriverPayout = driverRate.basePay + (roundTripMiles * driverRate.perMile) + (weightInLbs * driverRate.perLb);

  // Hard costs (passthrough — reimbursed to driver, NOT part of the 75/25 split)
  const tollCost = Number(tolls) || 0;
  const hardCosts = fuelCost + tollCost;

  // Service fees — part of service value, split 75/25 between driver and platform
  const bulkyCount = Number(bulkyItemCount) || 0;
  const bulkyItemFee = bulkyCount * BULKY_ITEM_FEE;

  // Materials — 100% PLATFORM PROFIT (upsell, NOT split with driver)
  const materialsFeeCost = Number(materialsFee) || 0;

  // Stairs fee — per step, only when no elevator service at either location
  const totalSteps = (Number(pickupSteps) || 0) + (Number(dropoffSteps) || 0);
  const stairsFee = elevatorService ? 0 : (totalSteps * FEE_PER_STEP);

  // Long carry fee — only applies if total distance from truck to door exceeds 75ft
  const totalDistanceFromStreet = (Number(pickupDistanceFromStreet) || 0) + (Number(dropoffDistanceFromStreet) || 0);
  const longCarryFee = totalDistanceFromStreet > LONG_CARRY_THRESHOLD_FT
    ? Math.ceil((totalDistanceFromStreet - LONG_CARRY_THRESHOLD_FT) / 50) * LONG_CARRY_FEE_PER_50FT
    : 0;
  const carryingFee = stairsFee + longCarryFee;

  // Extra service add-ons — customer-selected optional services
  const extraServiceFee = (extraHelper ? EXTRA_HELPER_FEE : 0) + (elevatorService ? ELEVATOR_SERVICE_FEE : 0);

  // ─── SERVICE VALUE (what the moving service is worth — the basis for the 75/25 split) ───
  // Excludes hard costs (fuel, tolls — passthrough) and upsells (materials — 100% platform)
  const serviceValue = baseCost + bulkyItemFee + carryingFee + extraServiceFee;

  // Apply surge / dynamic pricing — multiplies service value during peak demand
  const surge = calculateSurgeMultiplier(new Date(), pendingMovesCount);
  const peakDayMultiplier = isLastWeekendOfMonth(moveDate) ? PEAK_DAY_MULTIPLIER : 1;
  const sameDayMultiplier = isSameDay(moveDate) ? SAME_DAY_MULTIPLIER : 1;
  const dynamicMultiplier = surge.multiplier * peakDayMultiplier * sameDayMultiplier;
  const surgeMultiplier = dynamicMultiplier;

  const surgeAdjustedServiceValue = serviceValue * dynamicMultiplier;

  // Loyalty discount — platform absorbs (reduces customer price, NEVER reduces driver payout)
  const loyaltyDiscount = isReturningCustomer ? surgeAdjustedServiceValue * LOYALTY_DISCOUNT_RATE : 0;

  // Minimum service value floor — protects both driver and platform on tiny jobs
  const preFloorServiceValue = surgeAdjustedServiceValue - loyaltyDiscount;
  const minimumJobApplied = preFloorServiceValue < MINIMUM_JOB_FEE;
  const finalServiceValue = minimumJobApplied ? MINIMUM_JOB_FEE : preFloorServiceValue;

  // ─── THREE-WAY SPLIT ──────────────────────────────────────────────────────────
  // Driver gets 65% of service value (PROTECTED FLOOR — never reduced by anything)
  const splitDriverPayout = finalServiceValue * DRIVER_SHARE;
  // Driver earns at least 65% of service value OR the base rate, whichever is higher
  const driverPayout = Math.max(splitDriverPayout, baseDriverPayout);

  // Platform costs — come OUT of platform_fee, NEVER from driver_payout
  const reserveContribution = finalServiceValue * RESERVE_POOL_PCT;
  const processingFee = finalServiceValue * CARD_PROCESSING_PCT + CARD_PROCESSING_FLAT;
  const totalPlatformCosts = reserveContribution + processingFee;

  // Market rate — what traditional competitors charge for the same service
  const marketServiceRate = surgeAdjustedServiceValue * MARKET_RATE_MULTIPLIER;

  // Customer price for service — 12% below market (platform absorbs the discount)
  const customerServicePrice = finalServiceValue * (1 - CUSTOMER_DISCOUNT_RATE);

  // Platform fee (gross) = 35% of service value
  const platformFeeGross = finalServiceValue * PLATFORM_SHARE;
  // Net platform profit after reserve pool + processing costs
  let netPlatformProfit = platformFeeGross - totalPlatformCosts;
  // Platform minimum — GO always earns at least this much per job
  if (netPlatformProfit < PLATFORM_MINIMUM_FEE) {
    netPlatformProfit = PLATFORM_MINIMUM_FEE;
  }
  let platformFee = netPlatformProfit;
  const appFee = platformFee;
  const goProfit = platformFee;
  const driverFee = 0;

  // Booking fee — flat, goes to platform, NOT part of the split
  const bookingFee = BOOKING_FEE;

  // Customer price (pre-tax) = service portion + hard costs + upsells + booking fee
  const customerPricePreTax = customerServicePrice + hardCosts + materialsFeeCost + bookingFee;

  // Reconciliation check — driver + platform_gross should equal job value
  const reconciles = Math.round((driverPayout + platformFeeGross) * 100) / 100 === Math.round(finalServiceValue * 100) / 100;

  // Tax rate: country config overrides state
  const country = countryCode ? COUNTRY_CONFIG[countryCode] : null;
  const taxRate = country ? country.taxRate : (STATE_TAX_RATES[stateCode?.toUpperCase()] || 0.06);

  // Tax applied to the full customer price (service + hard costs + upsells)
  const taxAmount = customerPricePreTax * taxRate;

  // Total price — what the customer actually pays
  const totalPrice = customerPricePreTax + taxAmount;

  // Market rate total (what competitor would charge including tax)
  const marketRateTotal = marketServiceRate + hardCosts + materialsFeeCost;
  const marketRateWithTax = marketRateTotal * (1 + taxRate);

  // Customer savings vs traditional mover
  const customerSavings = marketRateWithTax - totalPrice;
  const customerSavingsPercent = marketRateWithTax > 0
    ? Math.round((customerSavings / marketRateWithTax) * 100)
    : 0;

  // Actual take rates (for audit / admin dashboard)
  const driverPayoutPercent = totalPrice > 0
    ? Math.round((driverPayout / totalPrice) * 100)
    : 0;
  const platformTakePercent = totalPrice > 0
    ? Math.round((platformFee / totalPrice) * 100)
    : 0;

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
    laborCost: convert(laborCost),
    laborHours: estimatedLaborHours,
    fuelCost: convert(fuelCost),
    tolls: convert(tollCost),
    bulkyItemFee: convert(bulkyItemFee),
    materialsFee: convert(materialsFeeCost),
    carryingFee: convert(carryingFee),
    stairsFee: convert(stairsFee),
    longCarryFee: convert(longCarryFee),
    extraServiceFee: convert(extraServiceFee),
    surgeMultiplier: surgeMultiplier,
    surgeLabel: surge.label,
    surgeLevel: surge.level,
    surgeReasons: surge.reasons,
    peakDayMultiplier,
    sameDayMultiplier,
    loyaltyDiscount: convert(loyaltyDiscount),
    minimumJobFee: minimumJobApplied ? MINIMUM_JOB_FEE : 0,
    // Three-way split fields
    serviceValue: convert(finalServiceValue),
    operationalSubtotal: convert(serviceValue + hardCosts),
    surgeAdjustedSubtotal: convert(surgeAdjustedServiceValue + hardCosts),
    adjustedOperationalSubtotal: convert(finalServiceValue + hardCosts),
    marketRate: convert(marketRateWithTax),
    customerSavings: convert(customerSavings),
    customerSavingsPercent,
    customerDiscountRate: CUSTOMER_DISCOUNT_RATE,
    // Platform cost breakdown (comes out of platform_fee, not driver_payout)
    platformFeeGross: convert(platformFeeGross),
    reserveContribution: convert(reserveContribution),
    processingFee: convert(processingFee),
    totalPlatformCosts: convert(totalPlatformCosts),
    netPlatformProfit: convert(netPlatformProfit),
    netProfitPct: finalServiceValue > 0 ? Math.round((netPlatformProfit / finalServiceValue) * 100) / 100 : 0,
    bookingFee: convert(bookingFee),
    reconciles,
    driverPayout: convert(driverPayout),
    driverPayoutPercent,
    driverPayoutFloor: convert(baseDriverPayout),
    platformTakePercent,
    appFee: convert(appFee),
    goProfit: convert(goProfit),
    driverFee: convert(driverFee),
    extraHelper: extraHelper,
    elevatorService: elevatorService,
    taxRate,
    taxAmount: convert(taxAmount),
    totalPrice: convert(totalPrice),
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

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

// Installment plan rate table — APR % (longer terms = higher rates, lower credit = higher rates)
const INSTALLMENT_RATES = {
  excellent: { 3: 0.00, 6: 1.99, 12: 3.99, 24: 5.99, 36: 6.99, 48: 8.00 },
  good:      { 3: 3.99, 6: 5.99, 12: 7.99, 24: 9.99, 36: 11.99, 48: 14.00 },
  fair:      { 3: 8.99, 6: 10.99, 12: 12.99, 24: 15.99, 36: 18.99, 48: 22.00 },
};

export function getInstallmentAPR(termMonths, creditTier) {
  const rates = INSTALLMENT_RATES[creditTier] || INSTALLMENT_RATES.good;
  const breakpoints = [3, 6, 12, 24, 36, 48];
  if (termMonths <= 3) return rates[3];
  if (termMonths >= 48) return rates[48];
  let lower = 3, upper = 48;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (termMonths >= breakpoints[i] && termMonths <= breakpoints[i + 1]) {
      lower = breakpoints[i];
      upper = breakpoints[i + 1];
      break;
    }
  }
  const t = (termMonths - lower) / (upper - lower);
  return Math.round((rates[lower] + t * (rates[upper] - rates[lower])) * 100) / 100;
}

export function calculateInstallmentPlan(principal, termMonths, creditTier) {
  const apr = getInstallmentAPR(termMonths, creditTier);
  const monthlyRate = apr / 100 / 12;
  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  const totalCost = monthlyPayment * termMonths;
  return {
    apr,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalInterest: Math.round((totalCost - principal) * 100) / 100,
    termMonths,
  };
}

export const CREDIT_TIERS = [
  { key: 'excellent', label: 'Excellent', description: '720+ credit score' },
  { key: 'good', label: 'Good', description: '660-719 credit score' },
  { key: 'fair', label: 'Fair', description: '600-659 credit score' },
];

export const INSTALLMENT_TERM_OPTIONS = [3, 6, 12, 24, 36, 48];

// ─── Move-Date Helpers ─────────────────────────────────────────────────────────

/**
 * Check if a date falls on the last weekend (Sat/Sun) of its month.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {boolean}
 */
function isLastWeekendOfMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  if (day !== 0 && day !== 6) return false; // not a weekend
  const nextWeek = new Date(d);
  nextWeek.setDate(d.getDate() + 7);
  return nextWeek.getMonth() !== d.getMonth();
}

/**
 * Check if a date string is today.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {boolean}
 */
function isSameDay(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

// ─── Surge / Dynamic Pricing ─────────────────────────────────────────────────
// Adjusts rates based on demand, time of day, day of week, and season.
// Multiplier of 1.0 = normal pricing; >1.0 = surge premium.

// Peak moving season: May–September (summer months)
const PEAK_MONTHS = [5, 6, 7, 8, 9];

// Peak hours: early morning (7-9) and evening (4-7) — higher demand
const PEAK_HOURS = [
  { start: 7, end: 9, multiplier: 1.10 },
  { start: 16, end: 19, multiplier: 1.12 },
];

// Weekend surcharge
const WEEKEND_MULTIPLIER = 1.08;

// Max surge cap to protect customers
const MAX_SURGE = 1.5;

/**
 * Calculate the current surge multiplier based on time and demand.
 * @param {Date} date - the date/time to check (defaults to now)
 * @param {number} pendingMovesCount - number of pending moves (demand indicator)
 * @returns {{ multiplier: number, reasons: string[], label: string, level: 'normal'|'moderate'|'high'|'peak' }}
 */
export function calculateSurgeMultiplier(date = new Date(), pendingMovesCount = 0) {
  let multiplier = 1.0;
  const reasons = [];

  // Seasonal surge — summer is peak moving season
  const month = date.getMonth() + 1;
  if (PEAK_MONTHS.includes(month)) {
    multiplier *= 1.1;
    reasons.push('Peak moving season');
  }

  // Time of day surge
  const hour = date.getHours();
  for (const peak of PEAK_HOURS) {
    if (hour >= peak.start && hour < peak.end) {
      multiplier *= peak.multiplier;
      reasons.push('Peak hours');
      break;
    }
  }

  // Weekend surge
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    multiplier *= WEEKEND_MULTIPLIER;
    reasons.push('Weekend demand');
  }

  // Demand-based surge — if there are many pending moves relative to drivers
  if (pendingMovesCount > 20) {
    multiplier *= 1.15;
    reasons.push('High demand');
  } else if (pendingMovesCount > 10) {
    multiplier *= 1.08;
    reasons.push('Moderate demand');
  }

  // Cap at maximum
  const finalMultiplier = Math.min(multiplier, MAX_SURGE);

  let level = 'normal';
  let label = 'Normal Pricing';
  if (finalMultiplier >= 1.3) {
    level = 'peak';
    label = 'Peak Surge';
  } else if (finalMultiplier >= 1.15) {
    level = 'high';
    label = 'High Demand';
  } else if (finalMultiplier > 1.0) {
    level = 'moderate';
    label = 'Moderate Surge';
  }

  return {
    multiplier: Math.round(finalMultiplier * 100) / 100,
    reasons: reasons.length > 0 ? reasons : ['Standard rates'],
    label,
    level,
  };
}

// ─── Refund / Dispute Handling ────────────────────────────────────────────────
// Pulls from the shared reserve pool, NEVER from an individual driver's payout.

/**
 * Process a refund or dispute using the shared reserve pool.
 * driver_payout is NEVER affected — the reserve pool absorbs the cost.
 * @param {number} refundAmount - amount to refund
 * @param {number} reservePoolBalance - current balance of the shared reserve pool
 * @returns {{ status: string, shortfall?: number, newReservePoolBalance?: number, driverPayoutAffected: boolean }}
 */
export function processRefund(refundAmount, reservePoolBalance) {
  const refund = Math.round(refundAmount * 100) / 100;
  const balance = Math.round(reservePoolBalance * 100) / 100;

  if (refund > balance) {
    // Reserve pool underfunded — flag for manual review, needs rate adjustment
    return {
      status: 'RESERVE_POOL_INSUFFICIENT',
      shortfall: Math.round((refund - balance) * 100) / 100,
      driverPayoutAffected: false, // still never touch driver payout
    };
  }

  return {
    status: 'PROCESSED',
    newReservePoolBalance: Math.round((balance - refund) * 100) / 100,
    driverPayoutAffected: false,
  };
}

// ─── Config Export ────────────────────────────────────────────────────────────
export const PRICING_CONFIG = {
  DRIVER_PAYOUT_PCT: DRIVER_SHARE,
  PLATFORM_FEE_PCT: PLATFORM_SHARE,
  RESERVE_POOL_PCT,
  CARD_PROCESSING_PCT,
  CARD_PROCESSING_FLAT,
  MINIMUM_JOB_VALUE: MINIMUM_JOB_FEE,
  MARKET_DISCOUNT_PCT: CUSTOMER_DISCOUNT_RATE,
  PEAK_DAY_MULTIPLIER,
  SAME_DAY_MULTIPLIER,
  BOOKING_FEE,
  PLATFORM_MINIMUM_FEE,
  MARKET_RATE_MULTIPLIER,
};

export { STATE_TAX_RATES, CURRENCIES, COUNTRY_CONFIG, COUNTRY_LIST, FUEL_PRICES, FUEL_LABELS, DRIVER_RATES, US_STATES, BULKY_ITEM_FEE, BULKY_WEIGHT_THRESHOLD, EXTRA_HELPER_FEE, ELEVATOR_SERVICE_FEE, CANCELLATION_FEE, INSTALLMENT_RATES, INSURANCE_TIERS, LABOR_RATES, MINIMUM_JOB_FEE, APP_FEE_RATE, DRIVER_SHARE, PLATFORM_SHARE, MARKET_RATE_MULTIPLIER, CUSTOMER_DISCOUNT_RATE, PLATFORM_MINIMUM_FEE, RESERVE_POOL_PCT, CARD_PROCESSING_PCT, CARD_PROCESSING_FLAT, BOOKING_FEE };