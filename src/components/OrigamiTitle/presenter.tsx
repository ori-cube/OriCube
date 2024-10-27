import style from "./presenter.module.scss";

interface OrigamiTitlePresenterProps {
  title: string;
  description: string;
}

export const OrigamiTitlePresenter: React.FC<OrigamiTitlePresenterProps> = (
  props: OrigamiTitlePresenterProps
) => {
  return (
    <div className={style.origami_title}>
      <h1 className={style.title}>{props.title}</h1>
      {/* <div className={style.divider}></div> */}
      <p className={style.description}>{props.description}</p>
    </div>
  );
};
