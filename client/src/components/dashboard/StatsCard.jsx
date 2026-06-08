import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorMap = {
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-600 dark:text-indigo-400' },
  green:  { bg: 'bg-green-100 dark:bg-green-900/30',   icon: 'text-green-600 dark:text-green-400'   },
  red:    { bg: 'bg-red-100 dark:bg-red-900/30',       icon: 'text-red-600 dark:text-red-400'       },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400' },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',     icon: 'text-blue-600 dark:text-blue-400'     },
};

const trendConfig = {
  up:      { icon: TrendingUp,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20'   },
  down:    { icon: TrendingDown, color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20'       },
  neutral: { icon: Minus,        color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/50'   },
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'indigo',
}) => {
  const palette = colorMap[color] || colorMap.indigo;
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm card-hover stagger-item">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white stat-number">
            {typeof value === 'object' ? JSON.stringify(value) : value}
          </p>
          {trendInfo && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendInfo.bg} ${trendInfo.color}`}
              >
                <trendInfo.icon className="h-3 w-3" />
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${palette.bg}`}
        >
          {Icon && <Icon className={`h-6 w-6 ${palette.icon}`} />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
