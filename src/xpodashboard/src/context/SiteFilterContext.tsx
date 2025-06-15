'use client';

import React, { createContext, useContext, useState } from 'react';

export type Site = 'all' | 'ffd' | 'abiss' | 'artisan';

const SiteFilterContext = createContext<{
  site: Site;
  setSite: (site: Site) => void;
}>({
  site: 'all',
  setSite: () => {},
});

export const useSiteFilter = () => useContext(SiteFilterContext);

export const SiteFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [site, setSite] = useState<Site>('all');
  return (
    <SiteFilterContext.Provider value={{ site, setSite }}>
      {children}
    </SiteFilterContext.Provider>
  );
}; 