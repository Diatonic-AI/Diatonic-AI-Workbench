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
import { ArrowLeft, ArrowRight, Building, Users, DollarSign, Briefcase, Globe, Target } from 'lucide-react';

const companyDetailsSchema = z.object({
  // Company Details
  industry: z.string().min(1, 'Please select your industry'),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+'], {
    required_error: 'Please select your company size'
  }),
  location: z.string().min(2, 'Please enter your company location'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  
  // Project & Budget Information
  currentAIProjects: z.enum(['none', '1-3', '4-10', '10+'], {
    required_error: 'Please select your current AI projects'
  }),
  monthlyBudget: z.enum(['under-1k', '1k-5k', '5k-20k', '20k-50k', '50k+', 'enterprise'], {
    required_error: 'Please select your monthly budget range'
  }),
  primaryUseCase: z.string().min(1, 'Please select your primary use case'),
  urgency: z.enum(['immediate', '1-3-months', '3-6-months', '6-12-months'], {
    required_error: 'Please select your timeline urgency'
  }),
  
  // Team & Technical Info
  teamSize: z.enum(['solo', '2-5', '6-15', '16-50', '50+'], {
    required_error: 'Please select your team size'
  }),
  technicalExpertise: z.enum(['beginner', 'intermediate', 'advanced', 'expert'], {
    required_error: 'Please select your team\'s technical expertise level'
  }),
  currentTools: z.array(z.string()).optional(),
  
  // Requirements & Goals
  specificRequirements: z.string().optional(),
  successMetrics: z.array(z.string()).min(1, 'Please select at least one success metric'),
  
  // Sales Preferences
  salesContact: z.boolean().default(false),
  consultationInterest: z.boolean().default(false),
  priorityOnboarding: z.boolean().default(false),
});

type CompanyDetailsForm = z.infer<typeof companyDetailsSchema>;

const CompanyDetailsForm: React.FC = () => {
  const { state, setFormData, nextStep, prevStep, completeOnboarding } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<CompanyDetailsForm>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      ...state.formData,
      currentTools: state.formData.currentTools || [],
      successMetrics: state.formData.successMetrics || [],
      salesContact: false,
      consultationInterest: false,
      priorityOnboarding: false,
    },
    mode: 'onChange'
  });

  const watchedTools = watch('currentTools') || [];
  const watchedMetrics = watch('successMetrics') || [];

  const industryOptions = [
    'Technology/Software',
    'Financial Services',
    'Healthcare/Life Sciences',
    'Manufacturing',
    'Retail/E-commerce',
    'Education',
    'Media/Entertainment',
    'Transportation/Logistics',
    'Real Estate',
    'Government/Public Sector',
    'Consulting',
    'Non-profit',
    'Other'
  ];

  const useCaseOptions = [
    'Customer Service Automation',
    'Data Analytics & Business Intelligence',
    'Content Generation & Marketing',
    'Process Automation',
    'Predictive Analytics',
    'Computer Vision Applications',
    'Natural Language Processing',
    'Recommendation Systems',
    'Research & Development',
    'Quality Assurance & Testing',
    'Security & Risk Management',
    'Other'
  ];

  const currentToolsOptions = [
    'OpenAI GPT',
    'Microsoft Azure AI',
    'Google Cloud AI',
    'AWS ML Services',
    'Anthropic Claude',
    'Hugging Face',
    'TensorFlow',
    'PyTorch',
    'Jupyter/Python',
    'R/RStudio',
    'Custom ML Infrastructure',
    'No current AI tools'
  ];

  const successMetricsOptions = [
    'Cost Reduction',
    'Time Savings',
    'Improved Accuracy',
    'Enhanced Customer Experience',
    'Increased Revenue',
    'Better Decision Making',
    'Process Efficiency',
    'Innovation & Competitive Advantage',
    'Risk Mitigation',
    'Scalability Improvements'
  ];

  const handleToolChange = (toolId: string, checked: boolean) => {
    const current = watchedTools;
    if (checked) {
      setValue('currentTools', [...current, toolId]);
    } else {
      setValue('currentTools', current.filter(id => id !== toolId));
    }
  };

  const handleMetricChange = (metricId: string, checked: boolean) => {
    const current = watchedMetrics;
    if (checked) {
      setValue('successMetrics', [...current, metricId]);
    } else {
      setValue('successMetrics', current.filter(id => id !== metricId));
    }
  };

  const onSubmit = async (data: CompanyDetailsForm) => {
    setIsSubmitting(true);
    try {
      // Combine all form data
      const completeData = {
        ...state.formData,
        ...data,
        submittedAt: new Date().toISOString(),
      };
      
      setFormData(completeData);

      // Here you would typically:
      // 1. Save to your leads/companies database
      // 2. Create tenant/organization in your system
      // 3. Send notification to sales team
      // 4. Set up initial workspace

      // For now, we'll complete the onboarding
      completeOnboarding();
      
      // In a real implementation, you might redirect to:
      // - A "Thank you" page with next steps
      // - The dashboard with welcome tour
      // - A calendar booking for sales consultation

    } catch (error) {
      console.error('Failed to save company details:', error);
      // Error handling would go here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Company Details & Requirements</h2>
        <p className="text-gray-400">
          Help us understand your business needs to provide the best AI development experience
        </p>
      </div>

      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Business Information</span>
          </CardTitle>
          <CardDescription>
            This information helps us customize your workspace and connect you with the right solutions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-workbbench-blue">
                <Building className="w-4 h-4" />
                <span>Company Profile</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Select onValueChange={(value) => setValue('industry', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.industry && (
                    <p className="text-sm text-red-400">{errors.industry.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Company Size *</Label>
                  <Select onValueChange={(value) => setValue('companySize', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Number of employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.companySize && (
                    <p className="text-sm text-red-400">{errors.companySize.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="City, State/Country"
                    {...register('location')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.location && (
                    <p className="text-sm text-red-400">{errors.location.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Company Website</span>
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.company.com"
                    {...register('website')}
                    className="bg-gray-800 border-gray-600"
                  />
                  {errors.website && (
                    <p className="text-sm text-red-400">{errors.website.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Project & Budget */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-workbbench-orange">
                <Target className="w-4 h-4" />
                <span>Project Requirements</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current AI Projects *</Label>
                  <Select onValueChange={(value) => setValue('currentAIProjects', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="How many AI projects are you running?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None yet</SelectItem>
                      <SelectItem value="1-3">1-3 projects</SelectItem>
                      <SelectItem value="4-10">4-10 projects</SelectItem>
                      <SelectItem value="10+">10+ projects</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.currentAIProjects && (
                    <p className="text-sm text-red-400">{errors.currentAIProjects.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Monthly Budget Range *</span>
                  </Label>
                  <Select onValueChange={(value) => setValue('monthlyBudget', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Expected monthly spending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-1k">Under $1,000</SelectItem>
                      <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
                      <SelectItem value="5k-20k">$5,000 - $20,000</SelectItem>
                      <SelectItem value="20k-50k">$20,000 - $50,000</SelectItem>
                      <SelectItem value="50k+">$50,000+</SelectItem>
                      <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.monthlyBudget && (
                    <p className="text-sm text-red-400">{errors.monthlyBudget.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Use Case *</Label>
                  <Select onValueChange={(value) => setValue('primaryUseCase', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="What's your main AI use case?" />
                    </SelectTrigger>
                    <SelectContent>
                      {useCaseOptions.map((useCase) => (
                        <SelectItem key={useCase} value={useCase}>{useCase}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.primaryUseCase && (
                    <p className="text-sm text-red-400">{errors.primaryUseCase.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Timeline Urgency *</Label>
                  <Select onValueChange={(value) => setValue('urgency', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="When do you need to start?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                      <SelectItem value="1-3-months">1-3 months</SelectItem>
                      <SelectItem value="3-6-months">3-6 months</SelectItem>
                      <SelectItem value="6-12-months">6-12 months</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.urgency && (
                    <p className="text-sm text-red-400">{errors.urgency.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Team Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-workbbench-purple">
                <Users className="w-4 h-4" />
                <span>Team & Technical Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Development Team Size *</Label>
                  <Select onValueChange={(value) => setValue('teamSize', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="How many developers?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo developer</SelectItem>
                      <SelectItem value="2-5">2-5 developers</SelectItem>
                      <SelectItem value="6-15">6-15 developers</SelectItem>
                      <SelectItem value="16-50">16-50 developers</SelectItem>
                      <SelectItem value="50+">50+ developers</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.teamSize && (
                    <p className="text-sm text-red-400">{errors.teamSize.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Technical Expertise *</Label>
                  <Select onValueChange={(value) => setValue('technicalExpertise', value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Team's AI/ML experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - New to AI/ML</SelectItem>
                      <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                      <SelectItem value="advanced">Advanced - Experienced team</SelectItem>
                      <SelectItem value="expert">Expert - AI/ML specialists</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.technicalExpertise && (
                    <p className="text-sm text-red-400">{errors.technicalExpertise.message}</p>
                  )}
                </div>
              </div>

              {/* Current Tools */}
              <div className="space-y-2">
                <Label>Current AI/ML Tools (Select all that apply)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentToolsOptions.map((tool) => (
                    <div key={tool} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool}
                        checked={watchedTools.includes(tool)}
                        onCheckedChange={(checked) => 
                          handleToolChange(tool, checked as boolean)
                        }
                      />
                      <Label htmlFor={tool} className="text-sm cursor-pointer">
                        {tool}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success Metrics */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Success Metrics *</Label>
                <p className="text-sm text-gray-500">What metrics will you use to measure AI project success?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {successMetricsOptions.map((metric) => (
                    <div key={metric} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric}
                        checked={watchedMetrics.includes(metric)}
                        onCheckedChange={(checked) => 
                          handleMetricChange(metric, checked as boolean)
                        }
                      />
                      <Label htmlFor={metric} className="text-sm cursor-pointer">
                        {metric}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.successMetrics && (
                  <p className="text-sm text-red-400">{errors.successMetrics.message}</p>
                )}
              </div>
            </div>

            {/* Additional Requirements */}
            <div className="space-y-2">
              <Label htmlFor="requirements">Specific Requirements or Challenges</Label>
              <Textarea
                id="requirements"
                placeholder="Tell us about any specific requirements, technical challenges, or constraints we should know about..."
                {...register('specificRequirements')}
                className="bg-gray-800 border-gray-600 min-h-[80px]"
              />
              <p className="text-xs text-gray-500">
                This helps our team prepare better solutions for your use case
              </p>
            </div>

            {/* Sales Preferences */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                <Briefcase className="w-4 h-4" />
                <span>Sales & Support Preferences</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="salesContact"
                    {...register('salesContact')}
                  />
                  <Label htmlFor="salesContact" className="text-sm cursor-pointer">
                    Have our sales team contact me to discuss enterprise solutions
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consultationInterest"
                    {...register('consultationInterest')}
                  />
                  <Label htmlFor="consultationInterest" className="text-sm cursor-pointer">
                    I'm interested in a free consultation to discuss our AI strategy
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="priorityOnboarding"
                    {...register('priorityOnboarding')}
                  />
                  <Label htmlFor="priorityOnboarding" className="text-sm cursor-pointer">
                    I'd like priority onboarding and technical support
                  </Label>
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
                {isSubmitting ? 'Completing Setup...' : 'Complete Company Setup'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyDetailsForm;