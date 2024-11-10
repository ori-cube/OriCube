import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";
import { UploadData } from "@/components/UploadData";
import { GetData } from "@/components/GetData";
import axios from "axios";
import { Model } from "@/types/model";

export default async function Home() {
  const response = await axios.get("http://localhost:3000/api/data");
  const origamiData: Model[] = response.data;
  return (
    <OrigamiListPageProvider origamiData={origamiData}>
      <Header enableSearch={true} />
      <main className={styles.main}>
        <UploadData />
        <GetData />
        <OrigamiList />
      </main>
    </OrigamiListPageProvider>
  );
}
