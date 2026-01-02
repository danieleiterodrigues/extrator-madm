
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '', dot }) => {
  const variants = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    info: "bg-primary/10 text-primary border-primary/20",
    outline: "border-border-light dark:border-border-dark text-slate-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full bg-current`}></span>}
      {children}
    </span>
  );
};

export default Badge;
