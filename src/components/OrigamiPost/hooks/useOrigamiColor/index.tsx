import React, { useState } from "react";

type UseOrigamiColor = () => {
  origamiColor: string;
  handleOrigamiColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const useOrigamiColor: UseOrigamiColor = () => {
  const [origamiColor, setOrigamiColor] = useState("#ff0000");

  const handleOrigamiColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigamiColor(e.target.value);
  };

  return {
    origamiColor,
    handleOrigamiColorChange,
  };
};
