import { useState, useEffect, useRef } from 'react';
import { inputClasses } from '../styles/commonClasses';

interface TimezoneOption {
  value: string;
  label: string;
  region: string;
}

// Comprehensive IANA timezone list grouped by region
const TIMEZONES: TimezoneOption[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },

  // Americas - North America
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'Americas' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (Phoenix)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', region: 'Americas' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'Americas' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)', region: 'Americas' },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)', region: 'Americas' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)', region: 'Americas' },
  { value: 'America/St_Johns', label: 'Newfoundland Time (St. Johns)', region: 'Americas' },
  
  // Americas - Mexico
  { value: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },
  { value: 'America/Cancun', label: 'Cancun', region: 'Americas' },
  { value: 'America/Tijuana', label: 'Tijuana', region: 'Americas' },
  { value: 'America/Mazatlan', label: 'Mazatlan', region: 'Americas' },
  
  // Americas - Central America
  { value: 'America/Guatemala', label: 'Guatemala', region: 'Americas' },
  { value: 'America/Belize', label: 'Belize', region: 'Americas' },
  { value: 'America/Costa_Rica', label: 'Costa Rica', region: 'Americas' },
  { value: 'America/El_Salvador', label: 'El Salvador', region: 'Americas' },
  { value: 'America/Managua', label: 'Managua (Nicaragua)', region: 'Americas' },
  { value: 'America/Panama', label: 'Panama', region: 'Americas' },
  { value: 'America/Tegucigalpa', label: 'Tegucigalpa (Honduras)', region: 'Americas' },
  
  // Americas - Caribbean
  { value: 'America/Puerto_Rico', label: 'Puerto Rico', region: 'Americas' },
  { value: 'America/Jamaica', label: 'Jamaica', region: 'Americas' },
  { value: 'America/Havana', label: 'Havana (Cuba)', region: 'Americas' },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo (Dominican Republic)', region: 'Americas' },
  { value: 'America/Barbados', label: 'Barbados', region: 'Americas' },
  { value: 'America/Port_of_Spain', label: 'Port of Spain (Trinidad)', region: 'Americas' },
  
  // Americas - South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brazil)', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (Argentina)', region: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago (Chile)', region: 'Americas' },
  { value: 'America/Bogota', label: 'Bogotá (Colombia)', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima (Peru)', region: 'Americas' },
  { value: 'America/Caracas', label: 'Caracas (Venezuela)', region: 'Americas' },
  { value: 'America/Guyana', label: 'Georgetown (Guyana)', region: 'Americas' },
  { value: 'America/La_Paz', label: 'La Paz (Bolivia)', region: 'Americas' },
  { value: 'America/Asuncion', label: 'Asunción (Paraguay)', region: 'Americas' },
  { value: 'America/Montevideo', label: 'Montevideo (Uruguay)', region: 'Americas' },
  { value: 'America/Cayenne', label: 'Cayenne (French Guiana)', region: 'Americas' },
  { value: 'America/Paramaribo', label: 'Paramaribo (Suriname)', region: 'Americas' },
  
  // Europe - Western
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (Portugal)', region: 'Europe' },
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik (Iceland)', region: 'Europe' },
  { value: 'Atlantic/Canary', label: 'Canary Islands', region: 'Europe' },
  
  // Europe - Central
  { value: 'Europe/Paris', label: 'Paris (France)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (Italy)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)', region: 'Europe' },
  { value: 'Europe/Brussels', label: 'Brussels (Belgium)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Vienna (Austria)', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw (Poland)', region: 'Europe' },
  { value: 'Europe/Prague', label: 'Prague (Czech Republic)', region: 'Europe' },
  { value: 'Europe/Budapest', label: 'Budapest (Hungary)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (Switzerland)', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (Sweden)', region: 'Europe' },
  { value: 'Europe/Oslo', label: 'Oslo (Norway)', region: 'Europe' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (Denmark)', region: 'Europe' },
  
  // Europe - Eastern
  { value: 'Europe/Athens', label: 'Athens (Greece)', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (Finland)', region: 'Europe' },
  { value: 'Europe/Bucharest', label: 'Bucharest (Romania)', region: 'Europe' },
  { value: 'Europe/Sofia', label: 'Sofia (Bulgaria)', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (Turkey)', region: 'Europe' },
  { value: 'Europe/Kiev', label: 'Kyiv (Ukraine)', region: 'Europe' },
  { value: 'Europe/Riga', label: 'Riga (Latvia)', region: 'Europe' },
  { value: 'Europe/Tallinn', label: 'Tallinn (Estonia)', region: 'Europe' },
  { value: 'Europe/Vilnius', label: 'Vilnius (Lithuania)', region: 'Europe' },
  
  // Europe - Russia
  { value: 'Europe/Moscow', label: 'Moscow (Russia)', region: 'Europe' },
  { value: 'Europe/Kaliningrad', label: 'Kaliningrad (Russia)', region: 'Europe' },
  { value: 'Europe/Samara', label: 'Samara (Russia)', region: 'Europe' },
  
  // Asia - Middle East
  { value: 'Asia/Dubai', label: 'Dubai (UAE)', region: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)', region: 'Asia' },
  { value: 'Asia/Kuwait', label: 'Kuwait', region: 'Asia' },
  { value: 'Asia/Baghdad', label: 'Baghdad (Iraq)', region: 'Asia' },
  { value: 'Asia/Tehran', label: 'Tehran (Iran)', region: 'Asia' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (Israel)', region: 'Asia' },
  { value: 'Asia/Beirut', label: 'Beirut (Lebanon)', region: 'Asia' },
  { value: 'Asia/Damascus', label: 'Damascus (Syria)', region: 'Asia' },
  { value: 'Asia/Amman', label: 'Amman (Jordan)', region: 'Asia' },
  
  // Asia - South Asia
  { value: 'Asia/Karachi', label: 'Karachi (Pakistan)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata (India)', region: 'Asia' },
  { value: 'Asia/Mumbai', label: 'Mumbai (India)', region: 'Asia' },
  { value: 'Asia/Delhi', label: 'Delhi (India)', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka (Bangladesh)', region: 'Asia' },
  { value: 'Asia/Colombo', label: 'Colombo (Sri Lanka)', region: 'Asia' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (Nepal)', region: 'Asia' },
  
  // Asia - Southeast Asia
  { value: 'Asia/Bangkok', label: 'Bangkok (Thailand)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (Malaysia)', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta (Indonesia)', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila (Philippines)', region: 'Asia' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City (Vietnam)', region: 'Asia' },
  { value: 'Asia/Yangon', label: 'Yangon (Myanmar)', region: 'Asia' },
  { value: 'Asia/Phnom_Penh', label: 'Phnom Penh (Cambodia)', region: 'Asia' },
  
  // Asia - East Asia
  { value: 'Asia/Shanghai', label: 'Shanghai (China)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei (Taiwan)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (South Korea)', region: 'Asia' },
  { value: 'Asia/Pyongyang', label: 'Pyongyang (North Korea)', region: 'Asia' },
  { value: 'Asia/Ulaanbaatar', label: 'Ulaanbaatar (Mongolia)', region: 'Asia' },
  
  // Asia - Central Asia
  { value: 'Asia/Almaty', label: 'Almaty (Kazakhstan)', region: 'Asia' },
  { value: 'Asia/Tashkent', label: 'Tashkent (Uzbekistan)', region: 'Asia' },
  { value: 'Asia/Bishkek', label: 'Bishkek (Kyrgyzstan)', region: 'Asia' },
  { value: 'Asia/Dushanbe', label: 'Dushanbe (Tajikistan)', region: 'Asia' },
  { value: 'Asia/Ashgabat', label: 'Ashgabat (Turkmenistan)', region: 'Asia' },
  
  // Africa - North
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)', region: 'Africa' },
  { value: 'Africa/Algiers', label: 'Algiers (Algeria)', region: 'Africa' },
  { value: 'Africa/Tunis', label: 'Tunis (Tunisia)', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca (Morocco)', region: 'Africa' },
  { value: 'Africa/Tripoli', label: 'Tripoli (Libya)', region: 'Africa' },
  
  // Africa - West
  { value: 'Africa/Lagos', label: 'Lagos (Nigeria)', region: 'Africa' },
  { value: 'Africa/Accra', label: 'Accra (Ghana)', region: 'Africa' },
  { value: 'Africa/Abidjan', label: 'Abidjan (Ivory Coast)', region: 'Africa' },
  { value: 'Africa/Dakar', label: 'Dakar (Senegal)', region: 'Africa' },
  
  // Africa - East
  { value: 'Africa/Nairobi', label: 'Nairobi (Kenya)', region: 'Africa' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (Ethiopia)', region: 'Africa' },
  { value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam (Tanzania)', region: 'Africa' },
  { value: 'Africa/Kampala', label: 'Kampala (Uganda)', region: 'Africa' },
  { value: 'Africa/Mogadishu', label: 'Mogadishu (Somalia)', region: 'Africa' },
  
  // Africa - South
  { value: 'Africa/Johannesburg', label: 'Johannesburg (South Africa)', region: 'Africa' },
  { value: 'Africa/Harare', label: 'Harare (Zimbabwe)', region: 'Africa' },
  { value: 'Africa/Lusaka', label: 'Lusaka (Zambia)', region: 'Africa' },
  { value: 'Africa/Maputo', label: 'Maputo (Mozambique)', region: 'Africa' },
  
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', region: 'Australia & Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)', region: 'Australia & Pacific' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', region: 'Australia & Pacific' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Australia & Pacific' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT)', region: 'Australia & Pacific' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', region: 'Australia & Pacific' },
  { value: 'Australia/Hobart', label: 'Hobart (AEDT)', region: 'Australia & Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland (New Zealand)', region: 'Australia & Pacific' },
  { value: 'Pacific/Wellington', label: 'Wellington (New Zealand)', region: 'Australia & Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji', region: 'Australia & Pacific' },
  { value: 'Pacific/Guam', label: 'Guam', region: 'Australia & Pacific' },
  { value: 'Pacific/Port_Moresby', label: 'Port Moresby (Papua New Guinea)', region: 'Australia & Pacific' },
  { value: 'Pacific/Tahiti', label: 'Tahiti', region: 'Australia & Pacific' },
  { value: 'Pacific/Samoa', label: 'Samoa', region: 'Australia & Pacific' },
  { value: 'Pacific/Tongatapu', label: 'Tongatapu (Tonga)', region: 'Australia & Pacific' },
];

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
  required?: boolean;
}

export default function TimezoneSelector({ value, onChange, className }: TimezoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredTimezones, setFilteredTimezones] = useState<TimezoneOption[]>(TIMEZONES);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the label for the selected timezone
  const selectedOption = TIMEZONES.find(tz => tz.value === value);
  const displayValue = selectedOption ? selectedOption.label : value || 'Select timezone...';

  // Filter timezones based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTimezones(TIMEZONES);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = TIMEZONES.filter(
        tz => 
          tz.label.toLowerCase().includes(query) ||
          tz.value.toLowerCase().includes(query) ||
          tz.region.toLowerCase().includes(query)
      );
      setFilteredTimezones(filtered);
    }
  }, [searchQuery]);

  // Close dropdown when clicking outside and calculate position
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate if dropdown should open upward
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 240; // Approximate height of dropdown
        
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          setDropdownPosition('above');
        } else {
          setDropdownPosition('below');
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (timezone: string) => {
    onChange(timezone);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Group timezones by region for better display
  const groupedTimezones = filteredTimezones.reduce((acc, tz) => {
    if (!acc[tz.region]) {
      acc[tz.region] = [];
    }
    acc[tz.region].push(tz);
    return acc;
  }, {} as Record<string, TimezoneOption[]>);

  const regions = Object.keys(groupedTimezones).sort();

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Display button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${inputClasses} text-left flex justify-between items-center cursor-pointer`}
      >
        <span className={!selectedOption && !value ? 'text-gray-400 dark:text-gray-500' : ''}>
          {displayValue}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-[60] w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col ${
          dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timezones..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto">
            {filteredTimezones.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No timezones found
              </div>
            ) : (
              regions.map(region => (
                <div key={region}>
                  {/* Region header */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0">
                    {region}
                  </div>
                  {/* Timezone options */}
                  {groupedTimezones[region].map(tz => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => handleSelect(tz.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 ${
                        value === tz.value
                          ? 'bg-blue-100 dark:bg-gray-700 text-blue-900 dark:text-blue-200 font-medium'
                          : 'text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {tz.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

