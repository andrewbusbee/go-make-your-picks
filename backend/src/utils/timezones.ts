// IANA Timezone Database
// Grouped by region for better UX

export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  offset?: string; // e.g., "UTC-5" for display purposes
}

export const TIMEZONE_REGIONS = {
  AMERICA: 'Americas',
  EUROPE: 'Europe',
  ASIA: 'Asia',
  AFRICA: 'Africa',
  AUSTRALIA: 'Australia & Pacific',
  ATLANTIC: 'Atlantic',
  INDIAN: 'Indian Ocean',
  PACIFIC: 'Pacific',
  UTC: 'UTC'
} as const;

// Comprehensive list of IANA timezones grouped by region
export const TIMEZONES: TimezoneOption[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: TIMEZONE_REGIONS.UTC },

  // Americas - North America
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (Phoenix)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/St_Johns', label: 'Newfoundland Time (St. Johns)', region: TIMEZONE_REGIONS.AMERICA },
  
  // Americas - Mexico
  { value: 'America/Mexico_City', label: 'Mexico City', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Cancun', label: 'Cancun', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Tijuana', label: 'Tijuana', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Mazatlan', label: 'Mazatlan', region: TIMEZONE_REGIONS.AMERICA },
  
  // Americas - Central America
  { value: 'America/Guatemala', label: 'Guatemala', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Belize', label: 'Belize', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Costa_Rica', label: 'Costa Rica', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/El_Salvador', label: 'El Salvador', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Managua', label: 'Managua (Nicaragua)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Panama', label: 'Panama', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Tegucigalpa', label: 'Tegucigalpa (Honduras)', region: TIMEZONE_REGIONS.AMERICA },
  
  // Americas - Caribbean
  { value: 'America/Puerto_Rico', label: 'Puerto Rico', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Jamaica', label: 'Jamaica', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Havana', label: 'Havana (Cuba)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo (Dominican Republic)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Barbados', label: 'Barbados', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Port_of_Spain', label: 'Port of Spain (Trinidad)', region: TIMEZONE_REGIONS.AMERICA },
  
  // Americas - South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brazil)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (Argentina)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Santiago', label: 'Santiago (Chile)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Bogota', label: 'Bogotá (Colombia)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Lima', label: 'Lima (Peru)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Caracas', label: 'Caracas (Venezuela)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Guyana', label: 'Georgetown (Guyana)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/La_Paz', label: 'La Paz (Bolivia)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Asuncion', label: 'Asunción (Paraguay)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Montevideo', label: 'Montevideo (Uruguay)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Cayenne', label: 'Cayenne (French Guiana)', region: TIMEZONE_REGIONS.AMERICA },
  { value: 'America/Paramaribo', label: 'Paramaribo (Suriname)', region: TIMEZONE_REGIONS.AMERICA },
  
  // Europe - Western
  { value: 'Europe/London', label: 'London (GMT/BST)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Dublin', label: 'Dublin', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Lisbon', label: 'Lisbon (Portugal)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik (Iceland)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Atlantic/Canary', label: 'Canary Islands', region: TIMEZONE_REGIONS.EUROPE },
  
  // Europe - Central
  { value: 'Europe/Paris', label: 'Paris (France)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Rome', label: 'Rome (Italy)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Brussels', label: 'Brussels (Belgium)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Vienna', label: 'Vienna (Austria)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Warsaw', label: 'Warsaw (Poland)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Prague', label: 'Prague (Czech Republic)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Budapest', label: 'Budapest (Hungary)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Zurich', label: 'Zurich (Switzerland)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Stockholm', label: 'Stockholm (Sweden)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Oslo', label: 'Oslo (Norway)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (Denmark)', region: TIMEZONE_REGIONS.EUROPE },
  
  // Europe - Eastern
  { value: 'Europe/Athens', label: 'Athens (Greece)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Helsinki', label: 'Helsinki (Finland)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Bucharest', label: 'Bucharest (Romania)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Sofia', label: 'Sofia (Bulgaria)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Istanbul', label: 'Istanbul (Turkey)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Kiev', label: 'Kyiv (Ukraine)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Riga', label: 'Riga (Latvia)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Tallinn', label: 'Tallinn (Estonia)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Vilnius', label: 'Vilnius (Lithuania)', region: TIMEZONE_REGIONS.EUROPE },
  
  // Europe - Russia
  { value: 'Europe/Moscow', label: 'Moscow (Russia)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Kaliningrad', label: 'Kaliningrad (Russia)', region: TIMEZONE_REGIONS.EUROPE },
  { value: 'Europe/Samara', label: 'Samara (Russia)', region: TIMEZONE_REGIONS.EUROPE },
  
  // Asia - Middle East
  { value: 'Asia/Dubai', label: 'Dubai (UAE)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Kuwait', label: 'Kuwait', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Baghdad', label: 'Baghdad (Iraq)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Tehran', label: 'Tehran (Iran)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (Israel)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Beirut', label: 'Beirut (Lebanon)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Damascus', label: 'Damascus (Syria)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Amman', label: 'Amman (Jordan)', region: TIMEZONE_REGIONS.ASIA },
  
  // Asia - South Asia
  { value: 'Asia/Karachi', label: 'Karachi (Pakistan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Kolkata', label: 'Kolkata (India)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Mumbai', label: 'Mumbai (India)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Delhi', label: 'Delhi (India)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Dhaka', label: 'Dhaka (Bangladesh)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Colombo', label: 'Colombo (Sri Lanka)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (Nepal)', region: TIMEZONE_REGIONS.ASIA },
  
  // Asia - Southeast Asia
  { value: 'Asia/Bangkok', label: 'Bangkok (Thailand)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Singapore', label: 'Singapore', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (Malaysia)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Jakarta', label: 'Jakarta (Indonesia)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Manila', label: 'Manila (Philippines)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City (Vietnam)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Yangon', label: 'Yangon (Myanmar)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Phnom_Penh', label: 'Phnom Penh (Cambodia)', region: TIMEZONE_REGIONS.ASIA },
  
  // Asia - East Asia
  { value: 'Asia/Shanghai', label: 'Shanghai (China)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Taipei', label: 'Taipei (Taiwan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Seoul', label: 'Seoul (South Korea)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Pyongyang', label: 'Pyongyang (North Korea)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Ulaanbaatar', label: 'Ulaanbaatar (Mongolia)', region: TIMEZONE_REGIONS.ASIA },
  
  // Asia - Central Asia
  { value: 'Asia/Almaty', label: 'Almaty (Kazakhstan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Tashkent', label: 'Tashkent (Uzbekistan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Bishkek', label: 'Bishkek (Kyrgyzstan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Dushanbe', label: 'Dushanbe (Tajikistan)', region: TIMEZONE_REGIONS.ASIA },
  { value: 'Asia/Ashgabat', label: 'Ashgabat (Turkmenistan)', region: TIMEZONE_REGIONS.ASIA },
  
  // Africa - North
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Algiers', label: 'Algiers (Algeria)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Tunis', label: 'Tunis (Tunisia)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Casablanca', label: 'Casablanca (Morocco)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Tripoli', label: 'Tripoli (Libya)', region: TIMEZONE_REGIONS.AFRICA },
  
  // Africa - West
  { value: 'Africa/Lagos', label: 'Lagos (Nigeria)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Accra', label: 'Accra (Ghana)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Abidjan', label: 'Abidjan (Ivory Coast)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Dakar', label: 'Dakar (Senegal)', region: TIMEZONE_REGIONS.AFRICA },
  
  // Africa - East
  { value: 'Africa/Nairobi', label: 'Nairobi (Kenya)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (Ethiopia)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam (Tanzania)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Kampala', label: 'Kampala (Uganda)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Mogadishu', label: 'Mogadishu (Somalia)', region: TIMEZONE_REGIONS.AFRICA },
  
  // Africa - South
  { value: 'Africa/Johannesburg', label: 'Johannesburg (South Africa)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Harare', label: 'Harare (Zimbabwe)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Lusaka', label: 'Lusaka (Zambia)', region: TIMEZONE_REGIONS.AFRICA },
  { value: 'Africa/Maputo', label: 'Maputo (Mozambique)', region: TIMEZONE_REGIONS.AFRICA },
  
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Australia/Hobart', label: 'Hobart (AEDT)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Auckland', label: 'Auckland (New Zealand)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Wellington', label: 'Wellington (New Zealand)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Fiji', label: 'Fiji', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Guam', label: 'Guam', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Port_Moresby', label: 'Port Moresby (Papua New Guinea)', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Tahiti', label: 'Tahiti', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Samoa', label: 'Samoa', region: TIMEZONE_REGIONS.AUSTRALIA },
  { value: 'Pacific/Tongatapu', label: 'Tongatapu (Tonga)', region: TIMEZONE_REGIONS.AUSTRALIA },
];

// Create a set of valid timezone values for quick validation
export const VALID_TIMEZONES = new Set(TIMEZONES.map(tz => tz.value));

/**
 * Validates if a timezone string is a valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  return VALID_TIMEZONES.has(timezone);
}

/**
 * Gets timezone options grouped by region
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  const grouped: Record<string, TimezoneOption[]> = {};
  
  TIMEZONES.forEach(tz => {
    if (!grouped[tz.region]) {
      grouped[tz.region] = [];
    }
    grouped[tz.region].push(tz);
  });
  
  return grouped;
}

/**
 * Searches timezones by label or value
 */
export function searchTimezones(query: string): TimezoneOption[] {
  const lowercaseQuery = query.toLowerCase();
  return TIMEZONES.filter(tz => 
    tz.label.toLowerCase().includes(lowercaseQuery) ||
    tz.value.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Gets a timezone option by value
 */
export function getTimezoneOption(value: string): TimezoneOption | undefined {
  return TIMEZONES.find(tz => tz.value === value);
}

