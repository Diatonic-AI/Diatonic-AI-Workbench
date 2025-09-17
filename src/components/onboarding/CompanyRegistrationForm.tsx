import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Mail, Phone, User, Crown, Building, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const companyRegistrationSchema = z.object({
  // Admin User Account Info
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  
  // Admin Personal Info
  fullName: z.string().min(2, 'Full name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  
  // Basic Company Info (more details in next step)
  companyName: z.string().min(2, 'Company name is required'),
  companyDomain: z.string().optional(),
  
  // Admin Preferences
  newsletterOptIn: z.boolean().default(false),
  productUpdates: z.boolean().default(true),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CompanyRegistrationForm = z.infer<typeof companyRegistrationSchema>;

const CompanyRegistrationForm: React.FC = () => {
  const { state, setFormData, nextStep, prevStep } = useOnboarding();
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<CompanyRegistrationForm>({
    resolver: zodResolver(companyRegistrationSchema),
    defaultValues: {
      ...state.formData,
      newsletterOptIn: state.formData.newsletterOptIn || false,
      productUpdates: state.formData.productUpdates || true,
      agreeToTerms: false,
    },
    mode: 'onChange'
  });

  const onSubmit = async (data: CompanyRegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Store form data in onboarding context
      setFormData(data);

      // Create Cognito admin user account
      await signUp({
        email: data.email,
        password: data.password,
        attributes: {
          name: data.fullName,
          'custom:user_type': 'company',
          'custom:account_type': 'admin', // Admin user for the company
          'custom:job_title': data.jobTitle,
          'custom:company_name': data.companyName,
          phone_number: data.phone,
        }
      });

      // Proceed to company details step
      nextStep();
    } catch (error) {
      console.error('Company admin registration failed:', error);
      // Error handling would go here (toast notification, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Company Administrator Account</h2>
        <p className="text-gray-400">
          Set up your admin account to manage your team's AI development workspace
        </p>
      </div>

      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-workbbench-orange" />
            <span>Create Admin Account</span>
          </CardTitle>
          <CardDescription>
            This account will have full administrative access to manage your company's workspace, users, and billing
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Admin Account Credentials */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-workbbench-purple">
                <User className="w-4 h-4" />
                <span>Administrator Account</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Admin Email *</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourcompany.com"
                    {...register('email')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    {...register('fullName')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-400">{errors.fullName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="CTO, Engineering Manager, etc."
                    {...register('jobTitle')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.jobTitle && (
                    <p className="text-sm text-red-400">{errors.jobTitle.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number *</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-400">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-workbbench-blue">
                <Building className="w-4 h-4" />
                <span>Company Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Corporation"
                    {...register('companyName')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-400">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDomain">Company Domain</Label>
                  <Input
                    id="companyDomain"
                    placeholder="company.com (optional)"
                    {...register('companyDomain')}
                    className="bg-gray-800 border-gray-600"
                  />
                  <p className="text-xs text-gray-500">
                    We'll use this to suggest team member email addresses
                  </p>
                </div>
              </div>
            </div>

            {/* Communication Preferences */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4" />
                <span>Communication Preferences</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="productUpdates"
                    {...register('productUpdates')}
                  />
                  <Label htmlFor="productUpdates" className="text-sm cursor-pointer">
                    Send me product updates and new feature announcements
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newsletter"
                    {...register('newsletterOptIn')}
                  />
                  <Label htmlFor="newsletter" className="text-sm cursor-pointer">
                    Send me AI development tips, industry insights, and company newsletters
                  </Label>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  {...register('agreeToTerms')}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms" className="text-workbbench-purple hover:underline" target="_blank">
                    Terms of Service
                  </a>,{' '}
                  <a href="/privacy" className="text-workbbench-purple hover:underline" target="_blank">
                    Privacy Policy
                  </a>, and{' '}
                  <a href="/enterprise-agreement" className="text-workbbench-purple hover:underline" target="_blank">
                    Enterprise Service Agreement
                  </a>{' '}
                  on behalf of my company *
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-red-400">{errors.agreeToTerms.message}</p>
              )}
              <p className="text-xs text-gray-500">
                As an administrator, you're authorized to accept these terms for your organization
              </p>
            </div>

            {/* Admin Privileges Notice */}
            <div className="bg-workbbench-orange/10 border border-workbbench-orange/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Crown className="w-5 h-5 text-workbbench-orange flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-workbbench-orange">Administrator Privileges</h4>
                  <p className="text-xs text-gray-300">
                    This account will have full administrative access including:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 mt-2">
                    <li>• Manage team members and permissions</li>
                    <li>• Control billing and subscription settings</li>
                    <li>• Configure company-wide settings and policies</li>
                    <li>• Access usage analytics and reports</li>
                    <li>• Manage integrations and API access</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="bg-workbbench-purple hover:bg-workbbench-purple/90"
              >
                {isSubmitting ? 'Creating Admin Account...' : 'Create Admin Account'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyRegistrationForm;