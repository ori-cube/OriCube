import styles from "./index.module.scss";
import { TextField } from "@radix-ui/themes";

type Props = {};

export const NameAndColorControlPanel: React.FC<Props> = () => {
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <label className={styles.label}>名前</label>
        <TextField.Root placeholder="つる"></TextField.Root>
      </div>
      <div className={styles.form}>
        <label className={styles.colorLabel}>色</label>
        <div className={styles.pickerContainer}>
          <input type="color" className={styles.picker} />
          <div>#000000</div>
        </div>
      </div>
    </div>
  );
};
