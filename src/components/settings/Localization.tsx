import React, { useState } from 'react';
import { Globe, Save } from 'lucide-react';
import FormInput from '../FormInput';

interface CountryOption {
  code: string;
  name: string;
  currency: string;
  timezones: string[];
}

const SUPPORTED_COUNTRIES: CountryOption[] = [
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    timezones: ['Europe/London']
  },
  {
    code: 'IE',
    name: 'Ireland',
    currency: 'EUR',
    timezones: ['Europe/Dublin']
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    timezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    timezones: [
      'America/Toronto',
      'America/Vancouver',
      'America/Edmonton',
      'America/Winnipeg',
      'America/Halifax',
      'America/St_Johns'
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    timezones: [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Adelaide',
      'Australia/Perth',
      'Australia/Darwin',
      'Australia/Hobart'
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham']
  }
];

const TIMEZONE_LABELS: Record<string, string> = {
  // UK & Ireland
  'Europe/London': 'London (GMT/BST)',
  'Europe/Dublin': 'Dublin (GMT/IST)',
  // US
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'America/Phoenix': 'Arizona (MT - no DST)',
  'America/Anchorage': 'Alaska Time (AKT)',
  'Pacific/Honolulu': 'Hawaii Time (HST)',
  // Canada
  'America/Toronto': 'Eastern Time (ET)',
  'America/Vancouver': 'Pacific Time (PT)',
  'America/Edmonton': 'Mountain Time (MT)',
  'America/Winnipeg': 'Central Time (CT)',
  'America/Halifax': 'Atlantic Time (AT)',
  'America/St_Johns': 'Newfoundland Time (NT)',
  // Australia
  'Australia/Sydney': 'Sydney (AEST/AEDT)',
  'Australia/Melbourne': 'Melbourne (AEST/AEDT)',
  'Australia/Brisbane': 'Brisbane (AEST)',
  'Australia/Adelaide': 'Adelaide (ACST/ACDT)',
  'Australia/Perth': 'Perth (AWST)',
  'Australia/Darwin': 'Darwin (ACST)',
  'Australia/Hobart': 'Hobart (AEST/AEDT)',
  // New Zealand
  'Pacific/Auckland': 'Auckland (NZST/NZDT)',
  'Pacific/Chatham': 'Chatham Islands (CHAST/CHADT)'
};

export default function Localization() {
  const [country, setCountry] = useState('GB');
  const [timezone, setTimezone] = useState('Europe/London');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.code === country);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - in real implementation, this would update localization settings
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update localization settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Localization</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Globe className="w-5 h-5 text-brand-primary mr-2" />
          <h2 className="text-lg font-medium text-brand-primary">Regional Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                // Reset timezone when country changes
                const newCountry = SUPPORTED_COUNTRIES.find(c => c.code === e.target.value);
                if (newCountry) {
                  setTimezone(newCountry.timezones[0]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            >
              {SUPPORTED_COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            >
              {selectedCountry?.timezones.map(tz => (
                <option key={tz} value={tz}>
                  {TIMEZONE_LABELS[tz]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2024)</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2024)</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD (2024-12-31)</option>
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}