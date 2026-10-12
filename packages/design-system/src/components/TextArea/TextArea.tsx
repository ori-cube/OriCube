"use client";

import { TextField, Label, Text, TextArea as AriaTextArea, FieldError, composeRenderProps, type TextFieldProps } from "react-aria-components";
import fieldStyles from "../TextInput/TextInput.module.css";
import styles from "./TextArea.module.css";

export type TextAreaProps = Omit<TextFieldProps, "children"> & {
  label: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  rows?: number;
};

export function TextArea({ label, description, errorMessage, placeholder, rows = 3, className, ...props }: TextAreaProps) {
  return (
    <TextField {...props} isInvalid={Boolean(errorMessage) || props.isInvalid} className={composeRenderProps(className, (name) => [fieldStyles.field, name].filter(Boolean).join(" "))}>
      <Label className={fieldStyles.label}>{label}</Label>
      {description && <Text slot="description" className={fieldStyles.description}>{description}</Text>}
      <AriaTextArea rows={rows} placeholder={placeholder} className={[fieldStyles.input, styles.input].join(" ")} />
      <FieldError className={fieldStyles.error}>{errorMessage}</FieldError>
    </TextField>
  );
}
