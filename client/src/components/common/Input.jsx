import { forwardRef } from 'react';

const Input = forwardRef(({ label, icon: Icon, error, className = '', ...rest }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-lg border bg-white dark:bg-slate-700 ${
            error
              ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500'
          } ${
            Icon ? 'pl-10' : 'pl-3'
          } pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${className}`}
          {...rest}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
