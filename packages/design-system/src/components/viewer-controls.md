# 閲覧用の操作部品

`@oricube/design-system` から `IconButton`, `Pagination`, `Slider`, `SidePanel` を利用する。React Aria の操作・フォーカス管理を共通の OriCube トークンとアイコンで包んでいる。アプリで直接 React Aria の部品を使ってスタイルを追加しない。

- `IconButton`: 必須の `icon` と `label`。`selected` でトグル状態を `aria-pressed` に伝える。`variant="floating"` は枠線の代わりに影で浮かせる見た目で、3D表示の上に置く操作に使う。`size="lg"` は64pxの円形で、折り手順の前後移動のように画面で最も見つけやすくしたい操作に限る。`onPress` / `isDisabled` は React Aria と同じ。
- `Slider`: 必須の `label`。`value` / `onChange` で制御でき、ラベル・現在値・キーボード操作を備える。
- `Pagination`: `page` は1始まり。`totalPages`, `onChange` が必須。`getPageLabel` で操作名を変える。`currentType="step"` を指定するとステップ選択として伝える。既定はページ選択。36rem以下では番号ボタンを非表示にして前後ボタンと現在位置を表示する。
- `SidePanel`: 必須の `title`, `triggerLabel`。常に出しておく必要のない操作を、開閉ボタンだけの状態に畳んでおけるパネル。React Aria の Disclosure で開閉状態を `aria-expanded` に伝える。開いている間はボタンが閉じるアイコンに変わり、同じ位置で閉じられる。`defaultExpanded` / `isExpanded` / `onExpandedChange` で開閉状態を扱う。画面の右端に接して置く前提の見た目で、閉じているときは端から出たタブ、開いているときは端に沿ったパネルになる。位置は利用側の `className` で決める。

各操作対象は44pxを確保し、フォーカス・選択・無効の状態を区別する。Storybook の `Design System/IconButton`, `Slider`, `Pagination`, `SidePanel` で各状態を確認できる。
