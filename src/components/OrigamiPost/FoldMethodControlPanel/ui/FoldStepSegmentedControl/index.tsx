// import styles from "./index.module.scss";
import { SegmentedControl } from "@radix-ui/themes";

type Props = {};

export const FoldStepSegmentedControl: React.FC<Props> = ({}) => {
  return (
    <SegmentedControl.Root defaultValue="1">
      <SegmentedControl.Item value="1">1</SegmentedControl.Item>
      <SegmentedControl.Item value="2">2</SegmentedControl.Item>
      <SegmentedControl.Item value="3">3</SegmentedControl.Item>
    </SegmentedControl.Root>
  );
};
