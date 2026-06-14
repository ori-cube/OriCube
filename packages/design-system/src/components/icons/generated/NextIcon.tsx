import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const NextIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9.5 6 6 6-6 6" /></svg>;
export default NextIcon;