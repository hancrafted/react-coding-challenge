import React, { createContext, useContext, useMemo } from "react";

import Store from "./store";

/*
CONTEXT / PROVIDER INIT
*/

const UserStoreContext = createContext<Store | null>(null);

export const StoreProvider: React.FC = (props) => {
  const { children } = props;
  const store = useMemo(() => new Store(), []);

  return (
    <UserStoreContext.Provider value={store}>
      {children}
    </UserStoreContext.Provider>
  );
};

/* 
HOOK DEFINITION
*/

export const useUserStore = () => useContext(UserStoreContext);
