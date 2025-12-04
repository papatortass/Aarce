import React from 'react';

// --- BUTTONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', isLoading, className = '', disabled, ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.4)] border border-transparent",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    outline: "bg-transparent border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-transparent",
    glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-lg",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs tracking-wide",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-8 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
           <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           <span>Processing</span>
        </div>
      ) : children}
    </button>
  );
};

// --- CARDS ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; noPadding?: boolean }> = ({ 
  children, className = '', title, noPadding = false 
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow duration-300 ${noPadding ? '' : 'p-6'} ${className}`}>
      {title && (
        <div className="px-6 pt-6 mb-2">
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

// --- INPUTS ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, rightElement, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        <input 
          className={`w-full h-12 pl-4 pr-12 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all ${className}`}
          {...props} 
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
};

// --- BADGES ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' }> = ({ children, variant = 'neutral' }) => {
  const colors = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
    brand: 'bg-brand-50 text-brand-700 border border-brand-100',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${colors[variant]}`}>
      {children}
    </span>
  );
};

// --- TABLE ---
export const TableHeader: React.FC<{ headers: string[] }> = ({ headers }) => (
  <thead>
    <tr className="border-b border-gray-100 bg-gray-50/50">
      {headers.map((h, i) => (
        <th key={i} className={`py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

export const TableRow: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr 
    onClick={onClick}
    className={`group hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </tr>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`py-4 px-6 text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);