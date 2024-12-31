import { useState } from "react";

type UseOrigamiName = () => {
  origamiName: string;
  handleOrigamiNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const useOrigamiName: UseOrigamiName = () => {
  const [origamiName, setOrigamiName] = useState("");

  const handleOrigamiNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigamiName(e.target.value);
  };

  return {
    origamiName,
    handleOrigamiNameChange,
  };
};
