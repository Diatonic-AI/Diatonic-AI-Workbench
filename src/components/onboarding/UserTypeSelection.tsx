import React from 'react';
import { useOnboarding, type UserType } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, ArrowRight, Check } from 'lucide-react';

const UserTypeSelection: React.FC = () => {
  const { state, setUserType, nextStep } = useOnboarding();

  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    nextStep();
  };

  const userTypeOptions = [
    {
      type: 'individual' as UserType,
      icon: User,
      title: 'Individual Developer',
      description: 'Perfect for personal projects, freelancers, and individual developers',
      features: [
        'Personal AI development workspace',
        'Individual project management',
        'Community support',
        'Personal usage tracking',
        'Individual billing and subscriptions'
      ],
      popular: false,
    },
    {
      type: 'company' as UserType,
      icon: Building2,
      title: 'Company/Team',
      description: 'Ideal for businesses, teams, and organizations',
      features: [
        'Team collaboration workspace',
        'Multi-user project management',
        'Priority business support',
        'Advanced analytics and reporting',
        'Enterprise billing and invoicing',
        'Custom integrations',
        'Admin controls and user management'
      ],
      popular: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Welcome to AI Nexus Workbench</h2>
        <p className="text-lg text-gray-300 max-w-2xl">
          Let's get your account set up. Choose the option that best describes how you'll be using our platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {userTypeOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = state.userType === option.type;
          
          return (
            <Card
              key={option.type}
              className={`
                relative cursor-pointer transition-all duration-200 border-2
                ${isSelected 
                  ? 'border-workbbench-purple bg-workbbench-purple/10' 
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50'
                }
              `}
              onClick={() => handleSelectUserType(option.type)}
            >
              {option.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-workbbench-orange text-black text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`
                    p-4 rounded-full transition-colors
                    ${isSelected 
                      ? 'bg-workbbench-purple text-white' 
                      : 'bg-gray-800 text-gray-400'
                    }
                  `}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                </div>
                <CardTitle className="text-xl">{option.title}</CardTitle>
                <CardDescription className="text-gray-400">
                  {option.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`
                        flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                        ${isSelected 
                          ? 'bg-workbbench-purple/20' 
                          : 'bg-gray-800'
                        }
                      `}>
                        <Check className={`
                          w-3 h-3 
                          ${isSelected ? 'text-workbbench-purple' : 'text-gray-500'}
                        `} />
                      </div>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  className={`
                    w-full mt-6 transition-all
                    ${isSelected 
                      ? 'bg-workbbench-purple hover:bg-workbbench-purple/90' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                  onClick={() => handleSelectUserType(option.type)}
                >
                  {isSelected ? 'Selected' : 'Choose This Option'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-gray-400 mt-8">
        <p>
          Don't worry, you can always change these settings later in your account dashboard.
        </p>
      </div>
    </div>
  );
};

export default UserTypeSelection;