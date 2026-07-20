export const RECENT_POSTINGS_AGE_VALUES = Object.freeze({
  TWO_HOURS_OR_LESS: 'twoHoursOrLess',
  ONE_HOUR_OR_LESS: 'oneHourOrLess',
  LESS_THAN_ONE_HOUR: 'lessThanOneHour'
});

export const DEFAULT_RECENT_POSTINGS_AGE = RECENT_POSTINGS_AGE_VALUES.TWO_HOURS_OR_LESS;

const STORAGE_KEY = 'recentPostingsMaxAge';

const RECENT_POSTINGS_AGE_CONFIGS = Object.freeze({
  [RECENT_POSTINGS_AGE_VALUES.TWO_HOURS_OR_LESS]: {
    value: RECENT_POSTINGS_AGE_VALUES.TWO_HOURS_OR_LESS,
    label: '2 hours or less',
    maxAgeMinutes: 120,
    inclusive: true,
    emptyStateText: 'No visible postings from the last two hours.'
  },
  [RECENT_POSTINGS_AGE_VALUES.ONE_HOUR_OR_LESS]: {
    value: RECENT_POSTINGS_AGE_VALUES.ONE_HOUR_OR_LESS,
    label: '1 hour or less',
    maxAgeMinutes: 60,
    inclusive: true,
    emptyStateText: 'No visible postings from the last hour.'
  },
  [RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR]: {
    value: RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR,
    label: 'Less than 1 hour',
    maxAgeMinutes: 60,
    inclusive: false,
    emptyStateText: 'No visible postings from less than an hour ago.'
  }
});

export function recentPostingsAgeOptions() {
  return Object.values(RECENT_POSTINGS_AGE_CONFIGS);
}

export function isValidRecentPostingsAgeValue(value) {
  return Object.prototype.hasOwnProperty.call(RECENT_POSTINGS_AGE_CONFIGS, value);
}

export function getRecentPostingsAgeConfig(value) {
  return RECENT_POSTINGS_AGE_CONFIGS[value] || RECENT_POSTINGS_AGE_CONFIGS[DEFAULT_RECENT_POSTINGS_AGE];
}

export async function loadRecentPostingsAgeSetting() {
  if (!globalThis.chrome?.storage?.local) {
    return DEFAULT_RECENT_POSTINGS_AGE;
  }

  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored?.[STORAGE_KEY];
    return isValidRecentPostingsAgeValue(value) ? value : DEFAULT_RECENT_POSTINGS_AGE;
  } catch (error) {
    return DEFAULT_RECENT_POSTINGS_AGE;
  }
}

export async function saveRecentPostingsAgeSetting(value) {
  const validated = isValidRecentPostingsAgeValue(value) ? value : DEFAULT_RECENT_POSTINGS_AGE;
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: validated });
  }
  return validated;
}
