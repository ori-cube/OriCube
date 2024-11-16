"use client";

import styles from "./index.module.scss";
import { useChildren } from "@/app/_children-provider";
import { Button } from "@radix-ui/themes";

const ChildrenModeButton = () => {
  const { isChildren, setIsChildren } = useChildren();

  const toggleChildrenMode = () => {
    setIsChildren(!isChildren);
  };

  return (
    <div className={styles.button}>
      <Button
        color="gray"
        variant="surface"
        highContrast
        onClick={() => toggleChildrenMode()}
      >
        {isChildren ? <div>漢字にする</div> : <div>ひらがなにする</div>}
      </Button>
    </div>
  );
};

export default ChildrenModeButton;
