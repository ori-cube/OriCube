import { ControlPanel } from "@/components/ControlPanel";
import style from "./presenter.module.scss"

interface OrigamiDetailPresenterProps {
  step: number
  setStep: React.Dispatch<React.SetStateAction<number>>
  sliderValue: number
  setSliderValue: React.Dispatch<React.SetStateAction<number>>
  stepNum: number
}

export const OrigamiDetailPresenter: React.FC<OrigamiDetailPresenterProps> = (props: OrigamiDetailPresenterProps) => {
  return(
    <div className={style.container}>
      <ControlPanel stepNum={props.stepNum} step={props.step} setStep={props.setStep} sliderValue={props.sliderValue} setSliderValue={props.setSliderValue} maxArg={180}/>
    </div>
  )
}