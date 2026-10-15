/**
 * Currency Conversion and Formatting Utilities
 *
 * Exchange rate modes:
 *  - 'live'   : use the live rate (fetched from API). If the fetch fails,
 *               a message is returned for the UI (no automatic switch).
 *  - 'manual' : always use the manual/default rate (user can change it).
 *
 * The user can switch mode or change the manual rate at any time.
 *
 * NO silent fallback: if the active mode has no valid rate, an error message
 * is returned (or ExchangeRateError thrown) so the UI can show it.
 */

// ---------- Storage helpers (safe) ----------
const KEYS = {
  manualRate: 'exchangeRate',                 // manual / default rate (kept same key as before)
  mode: 'exchangeRateMode',                   // 'live' | 'manual'
  liveRate: 'Liveexcanheg currency',          // key stored in localStorage
  legacyLiveRate: 'liveExchangeRate',         // fallback compatibility key
  liveRateDate: 'Liveexcanheg_currency_date', // date of fetch (YYYY-MM-DD)
  liveRateAt: 'liveExchangeRateAt',           // timestamp of that fetch
};

const storage = {
  get: (k) => {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch { return null; }
  },
  set: (k, v) => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, String(v)); } catch { /* ignore */ }
  },
};

const toValidRate = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Error thrown when no valid exchange rate is available (no silent fallback). */
export class ExchangeRateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExchangeRateError';
  }
}

export const MSG_NO_MANUAL_RATE = 'Default exchange rate is not set. Please enter the exchange rate manually.';
export const MSG_NO_LIVE_RATE = 'Live exchange rate is not available. Please try again or switch to the default rate.';

/**
 * Currency symbols mapping
 */
export const CURRENCY_SYMBOLS = {
  EUR: '€',
  INR: '₹',
};

// ---------- Rate mode / manual rate ----------

/** @returns {'live'|'manual'} */
export const getRateMode = () => (storage.get(KEYS.mode) === 'live' ? 'live' : 'manual');

/** @param {'live'|'manual'} mode */
export const setRateMode = (mode) => {
  storage.set(KEYS.mode, mode === 'live' ? 'live' : 'manual');
};

/** Manual/default rate, or null if not set / invalid. */
export const getManualRate = () => toValidRate(storage.get(KEYS.manualRate));

/** Set the manual rate and switch to manual mode. */
export const setManualRate = (rate) => {
  const valid = toValidRate(rate);
  if (!valid) return false;
  storage.set(KEYS.manualRate, valid);
  setRateMode('manual');
  return true;
};

/** Last successfully fetched live rate (or null). Checks 'Liveexcanheg currency' first. */
export const getCachedLiveRate = () =>
  toValidRate(storage.get(KEYS.liveRate)) ?? toValidRate(storage.get(KEYS.legacyLiveRate));

/**
 * Current rate for the active mode. NO fallback between modes.
 * - manual mode -> manual rate (null if not set)
 * - live mode   -> cached live rate (null if not available)
 */
export const getExchangeRate = () =>
  getRateMode() === 'live' ? getCachedLiveRate() : getManualRate();

/**
 * Message to show in the UI if the current mode has no valid rate, else null.
 * @example const err = getRateError(); if (err) showToast(err);
 */
export const getRateError = () => {
  if (getExchangeRate()) return null;
  return getRateMode() === 'live' ? MSG_NO_LIVE_RATE : MSG_NO_MANUAL_RATE;
};

/** Like getExchangeRate but throws ExchangeRateError when missing. */
export const requireExchangeRate = () => {
  const rate = getExchangeRate();
  if (!rate) throw new ExchangeRateError(getRateError());
  return rate;
};

/** Today's date (YYYY-MM-DD) in the user's LOCAL time zone. */
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let inflightFetch = null; // makes simultaneous calls share ONE API request

/**
 * Fetch latest EUR to INR rate from API.
 * The API is called at most ONCE PER DAY (to protect the API limit):
 *  - already fetched today -> returns the value stored in localStorage, NO API call
 *  - not fetched today     -> calls API once, stores the value, reused everywhere
 *  - API fails             -> returns null (no stale/old rate is used)
 *
 * @param {string} [apiUrl] - Custom API endpoint URL
 * @returns {Promise<number|null>}
 */
export const fetchLiveExchangeRate = async (apiUrl) => {
  const todayStr = getTodayStr();
  const cachedRate = getCachedLiveRate();

  // Already fetched today: reuse stored value, do not call API
  if (storage.get(KEYS.liveRateDate) === todayStr && cachedRate) {
    return cachedRate;
  }

  // A request is already running: wait for it instead of calling the API again
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      const url = apiUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXCHANGE_RATE_API_URL);
      if (!url) throw new Error('No exchange rate API URL configured');

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();
      const rate = toValidRate(
        data?.conversion_rates?.INR || data?.rates?.INR || data?.rate ||
        data?.conversion_rates?.inr || data?.rates?.inr
      );
      if (rate) {
        storage.set(KEYS.liveRate, rate);
        storage.set(KEYS.legacyLiveRate, rate);
        storage.set(KEYS.liveRateDate, todayStr);
        storage.set(KEYS.liveRateAt, Date.now());
        return rate;
      }
    } catch (err) {
      console.warn('Failed to fetch live EUR-INR exchange rate:', err);
    }
    return null; // no stale fallback: caller shows MSG_NO_LIVE_RATE
  })();

  try {
    return await inflightFetch;
  } finally {
    inflightFetch = null;
  }
};

/**
 * Get today's live rate (from localStorage if already fetched today,
 * otherwise one API call). No fallback: on failure returns an error message.
 * @returns {Promise<{rate:number|null, failed:boolean, message:string|null}>}
 */
export const refreshLiveRate = async (apiUrl) => {
  const live = await fetchLiveExchangeRate(apiUrl);
  if (live) {
    return { rate: live, failed: false, message: null };
  }
  return { rate: null, failed: true, message: MSG_NO_LIVE_RATE };
};

/**
 * Switch to live mode. Only switches if the live rate was fetched successfully;
 * otherwise the mode stays unchanged and a message is returned for the UI.
 *
 * @returns {Promise<{rate:number|null, mode:'live'|'manual', failed:boolean, message:string|null}>}
 */
export const useLiveRate = async (apiUrl) => {
  const result = await refreshLiveRate(apiUrl);
  if (result.failed) {
    return { rate: null, mode: getRateMode(), failed: true, message: result.message };
  }
  setRateMode('live');
  return { rate: result.rate, mode: 'live', failed: false, message: null };
};

/**
 * Switch to default/manual rate (optionally set a new value).
 * Returns { ok, message }; fails with a message if no valid default rate exists.
 */
export const useManualRate = (rate) => {
  if (rate !== undefined) {
    const ok = setManualRate(rate);
    return { ok, message: ok ? null : 'Please enter a valid exchange rate.' };
  }
  if (!getManualRate()) return { ok: false, message: MSG_NO_MANUAL_RATE };
  setRateMode('manual');
  return { ok: true, message: null };
};

/**
 * Get current rate; in live mode it refreshes first. No fallback.
 * @returns {Promise<{rate:number|null, message:string|null}>}
 */
export const resolveExchangeRate = async (apiUrl) => {
  if (getRateMode() === 'live') {
    const r = await refreshLiveRate(apiUrl);
    return { rate: r.rate, message: r.message };
  }
  const rate = getManualRate();
  return { rate, message: rate ? null : MSG_NO_MANUAL_RATE };
};

/**
 * Get currency symbol for a currency code
 */
export const getCurrencySymbol = (currency = 'EUR') => {
  const curr = (currency || '').trim().toUpperCase();
  return CURRENCY_SYMBOLS[curr] || curr;
};

/**
 * Converts an amount from one currency to another.
 * If exchangeRate is not passed, the current rate (live/manual per mode) is used.
 *
 * @param {number|string} amount
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {number} [exchangeRate] - 1 EUR in INR; defaults to getExchangeRate()
 */
export const convertCurrency = (amount, fromCurrency = 'EUR', toCurrency = 'INR', exchangeRate) => {
  const numericAmount = parseFloat(amount || 0);
  if (isNaN(numericAmount) || numericAmount === 0) return 0;

  const from = (fromCurrency || '').trim().toUpperCase();
  const to = (toCurrency || '').trim().toUpperCase();

  if (from === to) return numericAmount;

  // Throws ExchangeRateError (with a UI-ready message) if no valid rate exists
  const rate = toValidRate(exchangeRate) ?? requireExchangeRate();

  // EUR to INR
  if (from === 'EUR' && to === 'INR') {
    return Math.round(numericAmount * rate);
  }

  // INR to EUR
  if (from === 'INR' && to === 'EUR') {
    return parseFloat((numericAmount / rate).toFixed(2));
  }

  return numericAmount;
};

/**
 * Format a price/amount with its currency symbol and locale formatting.
 */
export const formatCurrency = (amount, currency = 'EUR', options = {}) => {
  const { withSymbol = true, decimals = 2 } = options;
  const num = parseFloat(amount || 0);
  const safeNum = isNaN(num) ? 0 : num;

  const symbol = getCurrencySymbol(currency);
  const locale = (currency || '').toUpperCase() === 'INR' ? 'en-IN' : 'en-US';

  const formattedNum = safeNum.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (!withSymbol) return formattedNum;
  return `${symbol}\u00A0${formattedNum}`;
};

/**
 * Converts an array of quotation/product items when currency is switched.
 */
export const convertItemsCurrency = (items = [], fromCurrency, toCurrency, exchangeRate) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (fromCurrency === toCurrency) return items;

  return items.map((item) => {
    const price = convertCurrency(item.price, fromCurrency, toCurrency, exchangeRate);
    const basePrice = item.basePrice !== undefined
      ? convertCurrency(item.basePrice, fromCurrency, toCurrency, exchangeRate)
      : price;

    return {
      ...item,
      price: price.toString(),
      basePrice: basePrice.toString()
    };
  });
};

/**
 * Converts number to words (Indian numbering system).
 */
export const convertNumberToWords = (amount) => {
  const num = Math.floor(parseFloat(amount || 0));
  if (isNaN(num) || num === 0) return "Zero Only";

  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const double = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertLessThanThousand = (n) => {
    let str = "";
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred";
      n %= 100;
      if (n > 0) {
        str += " and ";
      }
    }
    if (n >= 20) {
      str += double[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += single[n] + " ";
    }
    return str.trim();
  };

  let words = "";
  let rem = num;

  if (rem >= 10000000) {
    words += convertLessThanThousand(Math.floor(rem / 10000000)) + " Crore ";
    rem %= 10000000;
  }
  if (rem >= 100000) {
    words += convertLessThanThousand(Math.floor(rem / 100000)) + " Lakh ";
    rem %= 100000;
  }
  if (rem >= 1000) {
    words += convertLessThanThousand(Math.floor(rem / 1000)) + " Thousand ";
    rem %= 1000;
  }
  if (rem > 0) {
    if (words.trim().length > 0 && (rem < 100 || rem % 100 === 0)) {
      words += "and ";
    }
    words += convertLessThanThousand(rem);
  }

  return words.trim() + " Only";
};

export default {
  ExchangeRateError,
  MSG_NO_MANUAL_RATE,
  MSG_NO_LIVE_RATE,
  getRateError,
  requireExchangeRate,
  CURRENCY_SYMBOLS,
  getCurrencySymbol,
  getRateMode,
  setRateMode,
  getManualRate,
  setManualRate,
  getCachedLiveRate,
  getExchangeRate,
  resolveExchangeRate,
  refreshLiveRate,
  useLiveRate,
  useManualRate,
  convertCurrency,
  formatCurrency,
  convertItemsCurrency,
  fetchLiveExchangeRate,
  convertNumberToWords
};