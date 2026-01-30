import React from 'react';

interface ButtonProps {
  onClick: () => void;
  label: string;
  colorClass: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ onClick, label, colorClass, icon, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-lg'} 
      text-white font-bold py-2 px-2 md:py-3 md:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex flex-col items-center justify-center min-w-0 w-full`}
    >
      {icon && <span className="text-xl md:text-2xl mb-1">{icon}</span>}
      <span className="text-xs md:text-base whitespace-nowrap">{label}</span>
    </button>
  );
};