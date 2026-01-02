
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', header, footer, noPadding }) => {
  return (
    <div className={`rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-ui transition-all ${className}`}>
      {header && (
        <div className="border-b border-border-light dark:border-border-dark px-5 py-3">
          {header}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-border-light dark:border-border-dark px-5 py-3 bg-slate-50/50 dark:bg-slate-900/20">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
