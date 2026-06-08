const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const LoadingSpinner = ({ size = 'md', skeleton }) => {
  if (skeleton) {
    return (
      <div className="space-y-4 py-4 px-2">
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-6 w-full" />
        <div className="skeleton h-6 w-5/6" />
        <div className="flex gap-4 mt-6">
          <div className="skeleton h-24 w-1/3 rounded-xl" />
          <div className="skeleton h-24 w-1/3 rounded-xl" />
          <div className="skeleton h-24 w-1/3 rounded-xl" />
        </div>
        <div className="skeleton h-40 w-full rounded-xl mt-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600`}
      />
    </div>
  );
};

export default LoadingSpinner;
