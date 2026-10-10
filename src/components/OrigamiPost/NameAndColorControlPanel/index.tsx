import { useId, type ChangeEvent } from "react";
import { TextInput } from "@oricube/design-system";
import styles from "./index.module.scss";

type Props = {
  name: string;
  handleNameChange: (name: string) => void;
  color: string;
  handleColorChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function NameAndColorControlPanel({ name, handleNameChange, color, handleColorChange }: Props) {
  const colorId = useId();
  return <div className={styles.container}>
    <TextInput label="名前" placeholder="例：つる" value={name} onChange={handleNameChange} />
    <div className={styles.form}>
      <label className={styles.colorLabel} htmlFor={colorId}>色</label>
      <div className={styles.pickerContainer}>
        <input id={colorId} type="color" className={styles.picker} value={color} onChange={handleColorChange} />
        <div>{color}</div>
      </div>
    </div>
  </div>;
}
