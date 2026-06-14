import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const PlayIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 6 10 6-10 6z" /></svg>;
export default PlayIcon;