import { Cake, Trophy } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';

const CelebrationBanner = () => {
  const { data, loading } = useFetch('/celebrations/today');

  if (loading || !data) return null;

  const birthdays = data.birthdays || [];
  const anniversaries = data.anniversaries || [];

  if (birthdays.length === 0 && anniversaries.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {birthdays.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
              <Cake className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                Birthdays Today
              </p>
              <p className="text-sm font-medium text-amber-900">
                {birthdays.map((b) => b.name || b).join(', ')}
              </p>
            </div>
          </div>
        )}

        {birthdays.length > 0 && anniversaries.length > 0 && (
          <div className="hidden sm:block h-8 w-px bg-amber-200" />
        )}

        {anniversaries.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-200">
              <Trophy className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">
                Work Anniversaries
              </p>
              <p className="text-sm font-medium text-yellow-900">
                {anniversaries.map((a) => a.name || a).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CelebrationBanner;
