"use client";

import {
  TextField as AriaTextField,
  composeRenderProps,
  FieldError,
  Input,
  Label,
  Text,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import { CautionIcon } from "../icons";
import styles from "./TextInput.module.css";

export type TextInputProps = Omit<
  AriaTextFieldProps,
  "isDisabled" | "isRequired" | "isInvalid" | "children"
> & {
  label: string;
  description?: string;
  errorMessage?: string;
  /** 入力例。「例：」などを付けて渡します。なくても伝わる場合は省略してください。入力ルールの説明には description を使ってください */
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TextInput({
  label,
  description,
  errorMessage,
  placeholder,
  disabled,
  required,
  className,
  ...props
}: TextInputProps) {
  const isInvalid = Boolean(errorMessage);

  return (
    <AriaTextField
      {...props}
      isDisabled={disabled}
      isRequired={required}
      isInvalid={isInvalid || undefined}
      className={composeRenderProps(className, (userClassName) =>
        [styles.field, userClassName].filter(Boolean).join(" "),
      )}
    >
      <Label className={styles.label}>
        {label}
        {required && <span className={styles.requiredText}>（必須）</span>}
      </Label>
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <Input className={styles.input} placeholder={placeholder} />
      <FieldError className={styles.error}>
        {isInvalid && (
          <>
            <CautionIcon
              className={styles.errorIcon}
              aria-hidden
              focusable="false"
            />
            <span>{errorMessage}</span>
          </>
        )}
      </FieldError>
    </AriaTextField>
  );
}
