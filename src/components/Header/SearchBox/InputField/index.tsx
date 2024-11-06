import { TextField, Box } from "@radix-ui/themes";
import { HiMagnifyingGlass, HiMiniXMark } from "react-icons/hi2";
import { Zen_Maru_Gothic } from "next/font/google";
import { IconButton } from "@/components/ui/IconButton";
import { useOrigamiListPage } from "@/app/_provider";
import origamiData from "@/models/origamiList.json";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export const InputField: React.FC = () => {
  const { searchKeyword, setSearchKeyword, setFilteredOrigamiList } =
    useOrigamiListPage();

  const handleSearch = (searchKeyword: string) => {
    // 検索キーワードでフィルタリング
    const newFilteredOrigamiList = origamiData.filter((item) =>
      item.searchKeyword.some((keyword: string) =>
        keyword.includes(searchKeyword)
      )
    );

    // searchKeywordを除いた結果を設定
    const newItems = newFilteredOrigamiList.map((item) => {
      const { ...rest } = item;
      return rest;
    });
    setFilteredOrigamiList(newItems); // フィルタリング結果を更新
  };

  const handleKeyDown = (key: string) => {
    switch (key) {
      case "Enter":
        handleSearch(searchKeyword);
        break;
      default:
        break;
    }
  };

  const resetSearchKeyword = () => {
    setSearchKeyword("");
    handleSearch("");
  };
  return (
    <Box width="90%">
      <TextField.Root
        placeholder="おりがみのなまえを入力してください 例：つる"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e.key)}
        className={ZenMaruFont.className}
      >
        <TextField.Slot>
          <HiMagnifyingGlass height="26" width="26" />
        </TextField.Slot>
        <TextField.Slot pr="3">
          <IconButton
            Icon={HiMiniXMark}
            handleClick={() => resetSearchKeyword()}
            disable={false}
            size={20}
          />
        </TextField.Slot>
      </TextField.Root>
    </Box>
  );
};
