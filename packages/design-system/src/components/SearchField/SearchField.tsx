"use client";

import { Button, Input, Label, SearchField as AriaSearchField, VisuallyHidden, composeRenderProps, type SearchFieldProps as AriaSearchFieldProps } from "react-aria-components";
import { CloseIcon, SearchIcon } from "../icons";
import styles from "./SearchField.module.css";

export type SearchFieldProps = Omit<AriaSearchFieldProps, "children"> & {
  label: string;
  placeholder?: string;
  hideLabel?: boolean;
};

export function SearchField({ label, placeholder, hideLabel = false, className, ...props }: SearchFieldProps) {
  const labelElement = <Label className={styles.label}>{label}</Label>;
  return (
    <AriaSearchField {...props} className={composeRenderProps(className, (name) => [styles.field, name].filter(Boolean).join(" "))}>
      {({ isEmpty }) => <>
        {hideLabel ? <VisuallyHidden>{labelElement}</VisuallyHidden> : labelElement}
        <div className={styles.control}>
          <SearchIcon size={20} aria-hidden />
          <Input className={styles.input} placeholder={placeholder} />
          <Button slot="clear" aria-label="検索をクリア" className={styles.clear} isDisabled={isEmpty}>
            <CloseIcon size={20} aria-hidden />
          </Button>
        </div>
      </>}
    </AriaSearchField>
  );
}
