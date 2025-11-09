import React from "react";

interface IconSvgProps {
  size: number;
}

export const Stop: React.FC<IconSvgProps> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 4 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 0H1C0.447715 0 0 0.447715 0 1V13C0 13.5523 0.447715 14 1 14H3C3.55228 14 4 13.5523 4 13V1C4 0.447715 3.55228 0 3 0Z"
        fill="currentColor"
      />
    </svg>
  );
};
