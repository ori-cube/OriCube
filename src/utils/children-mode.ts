import axios from "axios";

export function SetHiragana(
  sentence: string,
  setSentence: React.Dispatch<React.SetStateAction<string>>
) {
  const outputType = "hiragana";
  const getHiraganaData = async () => {
    try {
      const response = await axios.post("/api/hiragana", {
        sentence,
        output_type: outputType,
      });
      setSentence(response.data.converted);
    } catch (err) {
      console.log(err);
    }
  };
  if (sentence != "") {
    getHiraganaData();
  }
}
