"use client";
import axios from "axios";

export const GetData = () => {
  const getData = async () => {
    const response = await axios.get("/api/data");
    console.log(response.data);
  };

  return (
    <div>
      <button
        onClick={() => {
          getData();
        }}
      >
        Get Data
      </button>
    </div>
  );
};
