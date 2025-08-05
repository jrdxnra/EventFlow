'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface ModalButtonProps {
  variant: 'delete' | 'save' | 'logistics' | 'close';
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  icon: ReactNode;
  title?: string;
  className?: string;
}

const variantStyles = {
  delete: 'bg-red-500 text-white hover:bg-red-600',
  save: 'bg-green-500 text-white hover:bg-green-600',
  logistics: 'bg-blue-500 text-white hover:bg-blue-600',
  close: 'text-gray-400 hover:text-gray-600'
};

export default function ModalButton({ 
  variant, 
  onClick, 
  href, 
  children, 
  icon, 
  title, 
  className = '' 
}: ModalButtonProps) {
  const baseClasses = variant === 'close' 
    ? 'transition-colors'
    : 'flex items-center space-x-2 px-3 py-2 rounded transition-colors';
  
  const classes = `${baseClasses} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} title={title}>
        {icon}
        <span className="hidden md:inline">{children}</span>
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes} title={title}>
      {variant === 'close' ? (
        icon
      ) : (
        <>
          {icon}
          <span className="hidden md:inline">{children}</span>
        </>
      )}
    </button>
  );
}