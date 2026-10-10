import { useState } from "react";

export const useOrigamiName = () => {
  const [origamiName, setOrigamiName] = useState("");
  return { origamiName, handleOrigamiNameChange: setOrigamiName };
};
