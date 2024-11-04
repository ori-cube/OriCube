import { OrigamiTitlePresenter } from "./presenter";

interface OrigamiTitlePresenterProps {
  title: string
  description: string
}

export const OrigamiTitle: React.FC<OrigamiTitlePresenterProps> = (props: OrigamiTitlePresenterProps) => {
  return <OrigamiTitlePresenter title={props.title} description={props.description} />
}