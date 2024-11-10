import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";
import axios from "axios";
import { Model } from "@/types/model";

export default async function Home() {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://oricube.vercel.app/api/data"
      : "http://localhost:3000/api/data";

  try {
    const response = await axios.get(baseUrl);
    const origamiData: Model[] = response.data;
    return (
      <OrigamiListPageProvider origamiData={origamiData}>
        <Header enableSearch={true} origamiData={origamiData} />
        <main className={styles.main}>
          <OrigamiList />
        </main>
      </OrigamiListPageProvider>
    );
  } catch (e) {
    return <>Error</>;
  }
}
