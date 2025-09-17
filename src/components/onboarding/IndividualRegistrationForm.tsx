import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Mail, Phone, User, Briefcase, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const individualRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name is required'),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  useCaseInterest: z.array(z.string()).min(1, 'Please select at least one use case'),
  aiExperienceLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Please select your AI experience level'
  }),
  newsletterOptIn: z.boolean().default(false),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type IndividualRegistrationForm = z.infer<typeof individualRegistrationSchema>;

const IndividualRegistrationForm: React.FC = () => {
  const { state, setFormData, nextStep, prevStep } = useOnboarding();
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<IndividualRegistrationForm>({
    resolver: zodResolver(individualRegistrationSchema),
    defaultValues: {
      ...state.formData,
      useCaseInterest: state.formData.useCaseInterest || [],
      newsletterOptIn: state.formData.newsletterOptIn || false,
      agreeToTerms: false,
    },
    mode: 'onChange'
  });

  const watchedUseCases = watch('useCaseInterest') || [];

  const useCaseOptions = [
    { id: 'automation', label: 'Business Process Automation' },
    { id: 'chatbots', label: 'Chatbots & Virtual Assistants' },
    { id: 'content', label: 'Content Generation' },
    { id: 'analytics', label: 'Data Analytics & Insights' },
    { id: 'vision', label: 'Computer Vision' },
    { id: 'nlp', label: 'Natural Language Processing' },
    { id: 'recommendation', label: 'Recommendation Systems' },
    { id: 'prediction', label: 'Predictive Analytics' },
    { id: 'research', label: 'Research & Experimentation' },
    { id: 'education', label: 'Learning & Education' },
    { id: 'other', label: 'Other' },
  ];

  const handleUseCaseChange = (useCaseId: string, checked: boolean) => {
    const current = watchedUseCases;
    if (checked) {
      setValue('useCaseInterest', [...current, useCaseId]);
    } else {
      setValue('useCaseInterest', current.filter(id => id !== useCaseId));
    }
  };

  const onSubmit = async (data: IndividualRegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Store form data in onboarding context
      setFormData(data);

      // Create Cognito account
      await signUp({
        email: data.email,
        password: data.password,
        attributes: {
          name: data.fullName,
          'custom:user_type': 'individual',
          'custom:job_title': data.jobTitle || '',
          'custom:company_name': data.companyName || '',
          phone_number: data.phone || '',
        }
      });

      // Proceed to next step (success/verification)
      nextStep();
    } catch (error) {
      console.error('Registration failed:', error);
      // Error handling would go here (toast notification, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Personal Information</h2>
        <p className="text-gray-400">
          Tell us about yourself to personalize your AI development experience
        </p>
      </div>

      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Create Your Account</span>
          </CardTitle>
          <CardDescription>
            This information will be used to set up your personalized AI development workspace
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Account Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Address *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  {...register('email')}
                  className="bg-gray-800 border-gray-600"
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Full Name *</span>
                </Label>
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

            {/* Password Fields */}
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

            {/* Professional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Job Title</span>
                </Label>
                <Input
                  id="jobTitle"
                  placeholder="Software Developer"
                  {...register('jobTitle')}
                  className="bg-gray-800 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Company Name</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Optional"
                  {...register('companyName')}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Phone Number</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register('phone')}
                className="bg-gray-800 border-gray-600"
              />
            </div>

            {/* AI Experience Level */}
            <div className="space-y-2">
              <Label>AI Experience Level *</Label>
              <Select onValueChange={(value) => setValue('aiExperienceLevel', value as any)}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select your AI experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    Beginner - New to AI development
                  </SelectItem>
                  <SelectItem value="intermediate">
                    Intermediate - Some AI experience
                  </SelectItem>
                  <SelectItem value="advanced">
                    Advanced - Experienced AI developer
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.aiExperienceLevel && (
                <p className="text-sm text-red-400">{errors.aiExperienceLevel.message}</p>
              )}
            </div>

            {/* Use Case Interests */}
            <div className="space-y-4">
              <Label>What are you most interested in building? *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {useCaseOptions.map((useCase) => (
                  <div key={useCase.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={useCase.id}
                      checked={watchedUseCases.includes(useCase.id)}
                      onCheckedChange={(checked) => 
                        handleUseCaseChange(useCase.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={useCase.id}
                      className="text-sm cursor-pointer"
                    >
                      {useCase.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.useCaseInterest && (
                <p className="text-sm text-red-400">{errors.useCaseInterest.message}</p>
              )}
            </div>

            {/* Newsletter Opt-in */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="newsletter"
                {...register('newsletterOptIn')}
              />
              <Label htmlFor="newsletter" className="text-sm cursor-pointer">
                Send me product updates, AI development tips, and occasional newsletters
              </Label>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                {...register('agreeToTerms')}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                I agree to the{' '}
                <a href="/terms" className="text-workbbench-purple hover:underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-workbbench-purple hover:underline" target="_blank">
                  Privacy Policy
                </a>{' '}
                *
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-400">{errors.agreeToTerms.message}</p>
            )}

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
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndividualRegistrationForm;