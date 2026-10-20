import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const { session, error } = await signUp(values.email, values.password, values.fullName);
      if (error) {
        let msg = error.message || 'Failed to create account.';
        if (error.message.toLowerCase().includes('rate limit')) {
          msg = 'Supabase email rate limit reached. Please explore with the Demo Account or disable email confirmation in Supabase Dashboard (Auth > Providers > Email).';
        } else if (error.message.toLowerCase().includes('invalid')) {
          msg = 'Please use a valid email address with a real domain.';
        }
        setFormError(msg);
        toast.error(msg);
      } else if (session) {
        toast.success('Account created and signed in successfully!');
        navigate('/');
      } else {
        setSignupSuccess(true);
        toast.success('Account created! Please check your inbox to confirm your email.');
      }
    } catch {
      const msg = 'An unexpected error occurred during sign up.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-lg border-border text-center">
          <CardHeader className="space-y-3 pb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Created!</CardTitle>
            <CardDescription className="text-sm">
              We've sent a confirmation email. Please check your inbox and verify your email
              address to start tracking your finances.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-3">
            <Button
              type="button"
              className="w-full h-10 font-semibold"
              onClick={() => navigate('/login')}
            >
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Wallet className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create an Account
          </CardTitle>
          <CardDescription className="text-sm">
            Start managing your personal finances effectively
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                disabled={isSubmitting}
                className={errors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`pr-10 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>

          {formError && (
            <div className="mx-6 mb-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupPage;
