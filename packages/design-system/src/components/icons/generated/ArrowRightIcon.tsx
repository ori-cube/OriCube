import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const ArrowRightIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" /></svg>;
export default ArrowRightIcon;