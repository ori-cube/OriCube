import { useEffect } from "react";
import { useChildren } from "@/app/_children-provider";

export function SetHiragana(
  sentence: string,
  setSentence: React.Dispatch<React.SetStateAction<string>>
) {
  const { isChildren } = useChildren();
  useEffect(() => {
    if (isChildren) {
      setSentence(sentence);
    }
  }, []);
}
