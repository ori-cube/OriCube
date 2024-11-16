"use client";
import { createContext, useContext, useState } from "react";

type ChildrenProviderProps = {
  isChildren: boolean;
  setIsChildren: React.Dispatch<React.SetStateAction<boolean>>;
};

const ChildrenProviderContext = createContext<ChildrenProviderProps>(
  {} as ChildrenProviderProps
);

export const ChildrenProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }: { children: React.ReactNode }) => {
  const [isChildren, setIsChildren] = useState(false);

  return (
    <ChildrenProviderContext.Provider
      value={{
        isChildren: isChildren,
        setIsChildren: setIsChildren,
      }}
    >
      {children}
    </ChildrenProviderContext.Provider>
  );
};

export function useChildren() {
  const context = useContext(ChildrenProviderContext);
  if (!context) {
    throw new Error(
      "useChildren must be used within a ChildrenContextProvider"
    );
  }
  return context;
}
