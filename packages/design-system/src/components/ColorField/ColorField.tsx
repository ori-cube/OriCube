"use client";

import { useEffect, useId, useState } from "react";
import {
  ColorField as AriaColorField,
  composeRenderProps,
  Input,
  Label,
  parseColor,
  Text,
  type ColorFieldProps as AriaColorFieldProps,
} from "react-aria-components";
import fieldStyles from "../TextInput/TextInput.module.css";
import { CautionIcon } from "../icons";
import styles from "./ColorField.module.css";

export type ColorFieldProps = Omit<
  AriaColorFieldProps,
  | "children"
  | "channel"
  | "colorSpace"
  | "value"
  | "defaultValue"
  | "onChange"
  | "isRequired"
  | "isInvalid"
  | "validate"
  | "validationBehavior"
  | "aria-required"
  | "aria-invalid"
  | "aria-errormessage"
> & {
  label: string;
  description?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (color: string | null) => void;
};

export function ColorField({
  label,
  description,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorFieldProps) {
  const descriptionId = useId();
  const errorId = useId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const describedBy = [props["aria-describedby"], description && descriptionId, errorMessage && errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  useEffect(() => setErrorMessage(null), [props.value]);

  const showFormatError = (inputValue: string) => {
    setErrorMessage(
      `${label}：「${inputValue}」を色として反映できませんでした。#FF0000（6桁）または#F00（3桁）の形式で入力してください。色は変更していません。`,
    );
  };

  const reportFormatError = (inputValue: string) => {
    if (inputValue === "") return;
    try {
      parseColor(inputValue.startsWith("#") ? inputValue : `#${inputValue}`);
    } catch {
      showFormatError(inputValue);
    }
  };

  return (
    <AriaColorField
      {...props}
      defaultValue={defaultValue}
      onChange={(color) => onChange?.(color?.toString("hex") ?? null)}
      validationBehavior="aria"
      className={composeRenderProps(className, (name) =>
        [fieldStyles.field, name].filter(Boolean).join(" "),
      )}
    >
      {({ state, isDisabled, isReadOnly }) => (
        <>
          <Label className={fieldStyles.label}>{label}</Label>
          {description && (
            <p id={descriptionId} className={fieldStyles.description}>
              <Text slot="description">{description}</Text>
            </p>
          )}
          <div>
            <div className={styles.controls}>
              <input
                type="color"
                className={styles.picker}
                aria-label={`${label}を選択`}
                aria-describedby={describedBy}
                disabled={isDisabled || isReadOnly}
                value={state.colorValue?.toString("hex") ?? "#000000"}
                onChange={(event) => {
                  setErrorMessage(null);
                  state.setColorValue(parseColor(event.currentTarget.value));
                }}
              />
              <Input
                className={[fieldStyles.input, styles.input].join(" ")}
                placeholder="例：#ff0000"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={describedBy}
                onChange={() => setErrorMessage(null)}
                onBlur={() => reportFormatError(state.inputValue)}
                onPaste={(event) => {
                  if (isReadOnly || isDisabled) return;
                  const input = event.currentTarget;
                  const nextValue = input.value.slice(0, input.selectionStart ?? 0)
                    + event.clipboardData.getData("text")
                    + input.value.slice(input.selectionEnd ?? input.value.length);
                  if (!state.validate(nextValue)) {
                    event.preventDefault();
                    showFormatError(nextValue);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing && !isReadOnly) {
                    reportFormatError(state.inputValue);
                    state.commit();
                  }
                }}
              />
            </div>
            <div role="status" aria-atomic="true">
              {errorMessage && (
                <p id={errorId} className={[fieldStyles.error, styles.error].join(" ")}>
                  <CautionIcon className={fieldStyles.errorIcon} aria-hidden focusable="false" />
                  <span>{errorMessage}</span>
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </AriaColorField>
  );
}
