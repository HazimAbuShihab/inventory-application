import { Link } from 'react-router-dom'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <MaterialIcon name="lock" className="text-[36px]" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Access restricted</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        You do not have permission to view this page. Contact an administrator if you need access.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">
          <MaterialIcon name="arrow_back" className="text-[18px]" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  )
}
