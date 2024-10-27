import { OrigamiDetailPresenter } from "./presenter";
import { Model } from "@/types/model";

interface OrigamiDetailProps {
  modelData: Model
}

export const OrigamiDetail: React.FC<OrigamiDetailProps> = (props: OrigamiDetailProps) => {
  return <OrigamiDetailPresenter modelData={props.modelData} />
}