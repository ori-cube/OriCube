import React from "react";

interface IconSvgProps {
  size: number;
}

export const ArrowLeft: React.FC<IconSvgProps> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 7H15M1 7L7 13M1 7L7 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
