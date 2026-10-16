import { useState } from "react";

type UseOrigamiColor = () => {
  origamiColor: string;
  handleOrigamiColorChange: (color: string | null) => void;
};

export const useOrigamiColor: UseOrigamiColor = () => {
  const [origamiColor, setOrigamiColor] = useState("#ff0000");

  const handleOrigamiColorChange = (color: string | null) => {
    if (color !== null) setOrigamiColor(color);
  };

  return {
    origamiColor,
    handleOrigamiColorChange,
  };
};
