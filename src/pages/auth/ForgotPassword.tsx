import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await resetPassword(email)
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    setSent(true)
    toast.success('Password reset email sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f8] p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary text-white">
            <MaterialIcon name="lock_reset" className="text-[28px]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset password</CardTitle>
          <CardDescription>
            {sent
              ? 'Check your email for a password reset link.'
              : 'Enter your email and we will send you a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-500">
                If an account exists for <strong>{email}</strong>, you will receive an email shortly.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">
                  <MaterialIcon name="arrow_back" className="text-[18px]" />
                  Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-slate-100"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <MaterialIcon name="progress_activity" className="animate-spin text-[18px]" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <MaterialIcon name="arrow_back" className="text-[18px]" />
                  Back to sign in
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
