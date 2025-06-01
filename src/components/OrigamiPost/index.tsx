"use client";

import React, { useState } from "react";
import { useOrigamiName } from "./hooks/useOrigamiName";
import { useOrigamiColor } from "./hooks/useOrigamiColor";
import { OrigamiPostPreview } from "./Preview";
import { Model } from "@/types/model";
import { OrigamiPostProcess } from "./Process";

export const OrigamiPost = () => {
  const { origamiName, handleOrigamiNameChange } = useOrigamiName();
  const { origamiColor, handleOrigamiColorChange } = useOrigamiColor();
  const [previewModel, setPreviewModel] = useState<Model | null>(null);

  const handleSetPreviewModel = (model: Model) => {
    setPreviewModel(model);
  };

  return (
    <>
      {previewModel != null ? (
        <OrigamiPostPreview
          description={""}
          color={origamiColor}
          modelData={previewModel}
          handleNameChange={handleOrigamiNameChange}
          handleColorChange={handleOrigamiColorChange}
          origamiName={origamiName}
          origamiColor={origamiColor}
        />
      ) : (
        <OrigamiPostProcess
          origamiName={origamiName}
          origamiColor={origamiColor}
          handleOrigamiNameChange={handleOrigamiNameChange}
          handleOrigamiColorChange={handleOrigamiColorChange}
          handleSetPreviewModel={handleSetPreviewModel}
        />
      )}
    </>
  );
};
