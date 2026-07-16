import { Link } from 'react-router-dom'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <MaterialIcon name="search_off" className="text-[36px]" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you requested does not exist or may have moved. Check the URL or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/dashboard">
            <MaterialIcon name="dashboard" className="text-[18px]" />
            Go to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/assets">
            <MaterialIcon name="inventory_2" className="text-[18px]" />
            Browse Assets
          </Link>
        </Button>
      </div>
    </div>
  )
}
