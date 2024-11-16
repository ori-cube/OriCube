import styles from "./index.module.scss";
import { TextField } from "@radix-ui/themes";

type Props = {
  name: string;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color: string;
  handleColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const NameAndColorControlPanel: React.FC<Props> = ({
  name,
  handleNameChange,
  color,
  handleColorChange,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <label className={styles.label}>名前</label>
        <TextField.Root
          placeholder="つる"
          value={name}
          onChange={handleNameChange}
        />
      </div>
      <div className={styles.form}>
        <label className={styles.colorLabel}>色</label>
        <div className={styles.pickerContainer}>
          <input
            type="color"
            className={styles.picker}
            value={color}
            onChange={handleColorChange}
          />
          <div>{color}</div>
        </div>
      </div>
    </div>
  );
};
