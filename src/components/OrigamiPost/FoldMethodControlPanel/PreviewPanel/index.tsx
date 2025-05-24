import styles from "./index.module.scss";
import { Button, TextField } from "@radix-ui/themes";

type Props = {
  handlePrevStep: () => void;
  handleNextStep: () => void;
  handleRegisterOrigami: () => void;
  name: string;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color: string;
  handleColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const PreviewPanel: React.FC<Props> = ({
  name,
  color,
  handleColorChange,
  handleNameChange,
  //handleRegisterOrigami,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り紙を公開する</h2>
      <section className={styles.h3Section}>
        <h3 className={styles.h3}>
          折り紙の名前をつけましょう
          <span className={styles.requiredMessage}>※必須</span>
        </h3>
        <div className={styles.descriptions}>
          <TextField.Root
            placeholder="つる"
            value={name}
            onChange={handleNameChange}
          />
        </div>
      </section>
      <section className={styles.h3Section}>
        <h3 className={styles.h3}>折り紙の色を変更できます</h3>
        <div className={styles.pickerContainer}>
          <input
            type="color"
            className={styles.picker}
            value={color}
            onChange={handleColorChange}
          />
          <div>{color}</div>
        </div>
      </section>
      <section className={styles.h3Section}>
        <h3 className={styles.h3}>折り方に間違いがないか確認してください</h3>
      </section>
      {/* <div className={styles.descriptions}>
        <p></p>
        <Image
          src="/assets/step2.gif"
          alt="動画：カーソルが動いて、折り紙の折る側の面を選択している。"
          width={255}
          height={255}
          className={styles.gif}
        />
      </div> */}
      <div className={styles.buttons}>
        <Button
          className={styles.button}
          onClick={() => console.log("未実装：戻る")}
        >
          修正する
        </Button>
        <Button
          className={styles.registerButton}
          onClick={() => console.log("未実装：手順確定")}
        >
          手順を確定する
        </Button>
      </div>
    </div>
  );
};
