import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";

type Props = {};

export const FoldMethodControlPanel: React.FC<Props> = () => {
  return (
    <section className={styles.container}>
      <AxisSelectPanel />
    </section>
  );
};
