import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";
import axios from "axios";
import { Model } from "@/types/model";

export default async function Home() {
  const response = await axios.get("http://localhost:3000/api/data");
  const origamiData: Model[] = response.data;
  return (
    <OrigamiListPageProvider origamiData={origamiData}>
      <Header enableSearch={true} origamiData={origamiData} />
      <main className={styles.main}>
        <OrigamiList />
      </main>
    </OrigamiListPageProvider>
  );
}
