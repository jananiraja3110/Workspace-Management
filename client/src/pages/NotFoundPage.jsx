import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-8xl sm:text-9xl font-extrabold text-indigo-600">404</h1>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900">Page Not Found</h2>
        <p className="mt-2 text-slate-500 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Home className="w-5 h-5" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
