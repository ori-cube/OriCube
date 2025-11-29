import React from "react";

interface IconSvgProps {
  size: number;
}

export const Play: React.FC<IconSvgProps> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1L11 7L1 13V1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
