import React from "react";

interface IconSvgProps {
  size: number;
}

export const ArrowBottom: React.FC<IconSvgProps> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 1V15M7 15L13 9M7 15L1 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
