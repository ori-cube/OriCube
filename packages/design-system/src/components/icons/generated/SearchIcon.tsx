import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const SearchIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612Q6.778 3 9.5 3t4.613 1.888T16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.6 5.6a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5q0-1.876-1.312-3.187Q11.377 5.002 9.5 5T6.313 6.313 5 9.5t1.313 3.188T9.5 14" /></svg>;
export default SearchIcon;