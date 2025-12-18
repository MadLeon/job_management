import { createContext, useState, useContext } from 'react';

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [appliedFilters, setAppliedFilters] = useState({
    clients: [],
    contacts: [],
    startDate: '',
    endDate: '',
    priorities: {},
  });

  const applyFilters = (filters) => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setAppliedFilters({
      clients: [],
      contacts: [],
      startDate: '',
      endDate: '',
      priorities: {},
    });
  };

  return (
    <FilterContext.Provider value={{ appliedFilters, applyFilters, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}
