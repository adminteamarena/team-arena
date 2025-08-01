import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CityContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const useCityContext = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCityContext must be used within a CityProvider');
  }
  return context;
};

interface CityProviderProps {
  children: ReactNode;
}

export const CityProvider: React.FC<CityProviderProps> = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState<string>('Casablanca'); // Default to Casablanca instead of All Cities

  // Load selected city from localStorage on component mount
  useEffect(() => {
    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity && savedCity !== 'All Cities') {
      setSelectedCityState(savedCity);
    }
  }, []);

  // Save selected city to localStorage whenever it changes
  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    localStorage.setItem('selectedCity', city);
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
};