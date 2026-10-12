import { ColorField, TextInput } from "@oricube/design-system";
import styles from "./index.module.scss";

type Props = {
  name: string;
  handleNameChange: (name: string) => void;
  color: string;
  handleColorChange: (color: string | null) => void;
};

export function NameAndColorControlPanel({ name, handleNameChange, color, handleColorChange }: Props) {
  return <div className={styles.container}>
    <TextInput label="名前" placeholder="例：つる" value={name} onChange={handleNameChange} />
    <ColorField label="色" value={color} onChange={handleColorChange} />
  </div>;
}
