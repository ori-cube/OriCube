import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const MenuIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M4 18a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 17q0-.424.288-.712A.97.97 0 0 1 4 16h16q.425 0 .713.288T21 17q0 .424-.288.713A.96.96 0 0 1 20 18zm0-5a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 12q0-.424.288-.712A.97.97 0 0 1 4 11h16q.425 0 .713.288T21 12q0 .424-.288.713A.96.96 0 0 1 20 13zm0-5a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 7q0-.424.288-.712A.97.97 0 0 1 4 6h16q.425 0 .713.288.288.289.287.712 0 .424-.288.713A.96.96 0 0 1 20 8z" /></svg>;
export default MenuIcon;