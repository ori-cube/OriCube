import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";
import { UploadData } from "@/components/UploadData";
import { GetData } from "@/components/GetData";

export default function Home() {
  return (
    <OrigamiListPageProvider>
      <Header enableSearch={true} />
      <main className={styles.main}>
        <UploadData />
        <GetData />
        <OrigamiList />
      </main>
    </OrigamiListPageProvider>
  );
}
