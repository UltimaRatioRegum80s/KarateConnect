import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (enabled: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: React.ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Load admin mode state from localStorage on initialization
  useEffect(() => {
    const savedAdminMode = localStorage.getItem('nkf-admin-mode');
    if (savedAdminMode === 'true') {
      setIsAdminMode(true);
    }
  }, []);

  // Save admin mode state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('nkf-admin-mode', isAdminMode.toString());
  }, [isAdminMode]);

  const toggleAdminMode = () => {
    if (!isAdminMode) {
      // Prompt for admin password when enabling admin mode
      const password = prompt('Enter admin password:');
      if (password === 'NKFAdmin2025') {
        setIsAdminMode(true);
      } else if (password !== null) {
        alert('Incorrect password');
      }
    } else {
      // Disable admin mode
      setIsAdminMode(false);
    }
  };

  const setAdminMode = (enabled: boolean) => {
    setIsAdminMode(enabled);
  };

  return (
    <AdminContext.Provider value={{
      isAdminMode,
      toggleAdminMode,
      setAdminMode
    }}>
      {children}
    </AdminContext.Provider>
  );
};