import type { SVGProps } from "react";
import type { IconProps } from "../Icon.types";
const CautionIcon = ({
  size = "1em",
  ...props
}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" {...props}><mask id="a" width={18} height={16} x={3} y={4} maskUnits="userSpaceOnUse" style={{
    maskType: "luminance"
  }}><path fill="#fff" fillRule="evenodd" stroke="#fff" strokeLinejoin="round" strokeWidth={2} d="M12.433 5.747a.5.5 0 0 0-.866 0l-7.132 12.32a.5.5 0 0 0 .432.751h14.266a.5.5 0 0 0 .433-.75z" clipRule="evenodd" /><path stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} d="M12 15.91v.363m0-6.182.003 3.637" /></mask><g mask="url(#a)"><path fill="currentColor" d="M3.273 3.182h17.454v17.455H3.273z" /></g></svg>;
export default CautionIcon;