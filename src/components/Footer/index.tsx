import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-background-subtle py-[20px] text-text-subtle border-t border-background-subtler">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center sm:flex-row sm:justify-between">
        <p className="mb-[10px] text-body-sm sm:mb-0">
          &copy; {new Date().getFullYear()} OriCube. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
