"use client";
import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";
import { Model } from "@/types/model";
import AddOrigamiButton from "@/components/ui/AddOrigamiButton";
import Footer from "@/components/Footer";
import axios from "axios";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  if (!baseUrl) return <div>URL is not found</div>;
  const [origamiData, setOrigamiData] = useState([] as Model[]);
  useEffect(() => {
    const getData = async () => {
      try {
        const response = await axios.get<Model[]>(`${baseUrl}/api/data`);
        setOrigamiData(response.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    getData();
  }, []);

  return (
    <OrigamiListPageProvider origamiData={origamiData}>
      <Header enableSearch={true} origamiData={origamiData} />
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <main className={styles.main}>
            <OrigamiList />
          </main>
          <AddOrigamiButton />
        </>
      )}

      <Footer />
    </OrigamiListPageProvider>
  );
}
