import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const CloseIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path fill="currentColor" d="m12 13.4-4.9 4.9a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275.95.95 0 0 1-.275-.7q0-.426.275-.7l4.9-4.9-4.9-4.9a.95.95 0 0 1-.275-.7q0-.426.275-.7a.95.95 0 0 1 .7-.275q.425 0 .7.275l4.9 4.9 4.9-4.9a.95.95 0 0 1 .7-.275q.425 0 .7.275a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7L13.4 12l4.9 4.9a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275z" /></svg>;
export default CloseIcon;