"use client";

import { useId } from "react";
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
          <div className={styles.controls}>
            <input
              type="color"
              className={styles.picker}
              aria-label={`${label}を選択`}
              aria-describedby={
                [props["aria-describedby"], description && descriptionId]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              disabled={isDisabled || isReadOnly}
              value={state.colorValue?.toString("hex") ?? "#000000"}
              onChange={(event) => state.setColorValue(parseColor(event.currentTarget.value))}
            />
            <Input
              className={[fieldStyles.input, styles.input].join(" ")}
              placeholder="例：#ff0000"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && !isReadOnly) {
                  state.commit();
                }
              }}
            />
          </div>
        </>
      )}
    </AriaColorField>
  );
}
