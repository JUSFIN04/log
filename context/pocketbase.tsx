// pocketbase.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import PocketBase, { AsyncAuthStore } from 'pocketbase';
import React, { createContext, useContext, useEffect, useState } from 'react';

const PocketBaseContext = createContext<{ pb: PocketBase | null }>({ pb: null });

export const usePocketBase = () => useContext(PocketBaseContext);

export const PocketBaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pb, setPb] = useState<PocketBase | null>(null);

  useEffect(() => {
    const initializePocketBase = async () => {
      // This is where our auth session will be stored. It's PocketBase magic.
      const store = new AsyncAuthStore({
        save: async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
        initial: (await AsyncStorage.getItem('pb_auth')) || '',
        clear: async () => AsyncStorage.removeItem('pb_auth'),
      });
      const pbInstance = new PocketBase('https://pocketbase-production-38ea2.up.railway.app', store); // Replace with your actual PocketBase URL
      setPb(pbInstance);
    };

    initializePocketBase();
  }, []);

  return (
    <PocketBaseContext.Provider value={{ pb }}>
      {children}
    </PocketBaseContext.Provider>
  );
};
