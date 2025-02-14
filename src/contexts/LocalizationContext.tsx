import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocalizationContextType {
  country: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  updateLocalization: (settings: Partial<LocalizationSettings>) => void;
}

interface LocalizationSettings {
  country: string;
  timezone: string;
  currency: string;
  dateFormat: string;
}

const defaultSettings: LocalizationSettings = {
  country: 'GB',
  timezone: 'Europe/London',
  currency: 'GBP',
  dateFormat: 'dd/MM/yyyy'
};

const LocalizationContext = createContext<LocalizationContextType | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocalizationSettings>(defaultSettings);

  const updateLocalization = (newSettings: Partial<LocalizationSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <LocalizationContext.Provider 
      value={{
        ...settings,
        updateLocalization
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}