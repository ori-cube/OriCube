import style from "./presenter.module.scss";
import { Zen_Maru_Gothic } from "next/font/google";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "700",
  subsets: ["latin"],
});

interface OrigamiTitlePresenterProps {
  title: string;
  description: string;
}

export const OrigamiTitlePresenter: React.FC<OrigamiTitlePresenterProps> = (
  props: OrigamiTitlePresenterProps
) => {
  return (
    <div className={`${style.origami_title} ${ZenMaruFont.className}`}>
      <h1 className={style.title}>{props.title}</h1>
      <p className={style.description}>{props.description}</p>
    </div>
  );
};
