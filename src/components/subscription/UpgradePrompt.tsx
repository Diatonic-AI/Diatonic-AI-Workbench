import React from 'react';
import { Lock, Sparkles, Crown, Rocket, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { PricingUtils, type PlanId, PRICING } from '@/lib/pricing';
import { UserRole, PermissionUtils } from '@/lib/permissions';
import { useStripe } from '@/hooks/useStripe';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  feature: string;
  requiredPlan: PlanId;
  description: string;
  benefits?: string[];
  className?: string;
}

// Plan icons mapping
const PLAN_ICONS = {
  free: Sparkles,
  basic: Sparkles,
  pro: Crown,
  extreme: Rocket,
  enterprise: Building2
} as const;

// Plan colors for theming
const PLAN_COLORS = {
  free: 'text-green-500 bg-green-500/10 border-green-500/20',
  basic: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  pro: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  extreme: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  enterprise: 'text-red-500 bg-red-500/10 border-red-500/20'
} as const;

export function UpgradePrompt({ 
  feature, 
  requiredPlan, 
  description, 
  benefits = [], 
  className 
}: UpgradePromptProps) {
  const { user } = useAuth();
  const { upgradeToplan, loading: stripeLoading } = useStripe();
  const currentRole = user?.role || 'anonymous' as UserRole;
  const plan = PricingUtils.getPlan(requiredPlan);
  const PlanIcon = PLAN_ICONS[requiredPlan];
  const planColorClasses = PLAN_COLORS[requiredPlan];
  
  // Calculate if this is an upgrade (not a sidegrade)
  const isUpgrade = PermissionUtils.isRoleAtLeast(currentRole, requiredPlan as UserRole);
  
  const handleUpgrade = async () => {
    if (requiredPlan === 'enterprise') {
      // For enterprise, redirect to contact
      const contactUrl = `/contact?plan=${requiredPlan}&feature=${encodeURIComponent(feature)}`;
      window.location.href = contactUrl;
      return;
    }
    
    // Use Stripe integration for direct checkout
    await upgradeToplan(requiredPlan, 'monthly', feature);
  };
  
  const handleContactSales = () => {
    // For enterprise plans, redirect to contact
    const contactUrl = `/contact?plan=${requiredPlan}&feature=${encodeURIComponent(feature)}`;
    window.location.href = contactUrl;
  };
  
  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-6', className)}>
      <Card className={cn('max-w-lg w-full border-2', planColorClasses)}>
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <PlanIcon className={cn('h-6 w-6', planColorClasses.split(' ')[0])} />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              Unlock {feature}
            </CardTitle>
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          </div>
          
          <Badge 
            variant="secondary" 
            className={cn('text-sm font-medium', planColorClasses)}
          >
            {plan.name} Plan Required
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current vs Required Plan */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Plan:</span>
              <Badge variant="outline">
                {PermissionUtils.getRoleDisplayName(currentRole)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Required Plan:</span>
              <Badge className={planColorClasses}>
                {plan.name}
              </Badge>
            </div>
          </div>
          
          {/* Benefits */}
          {benefits.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">What you'll get:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          
          {/* Pricing */}
          <div className="space-y-4">
            <Separator />
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">
                {plan.price.monthly.amount === 0 ? (
                  'Custom Pricing'
                ) : (
                  <>
                    {PricingUtils.formatPrice(plan.price.monthly.amount)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </>
                )}
              </div>
              {requiredPlan !== 'enterprise' && plan.price.yearly.originalAmount && (
                <div className="text-sm text-green-600">
                  Save {PricingUtils.getYearlySavingsPercent(requiredPlan)}% with yearly billing
                </div>
              )}
            </div>
            
            {/* CTA Buttons */}
            <div className="space-y-2">
              {requiredPlan === 'enterprise' ? (
                <Button 
                  onClick={handleContactSales}
                  className="w-full"
                  size="lg"
                  disabled={stripeLoading}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Contact Sales
                </Button>
              ) : (
                <Button 
                  onClick={handleUpgrade}
                  className="w-full"
                  size="lg"
                  disabled={stripeLoading}
                >
                  {stripeLoading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlanIcon className="h-4 w-4 mr-2" />
                      Upgrade to {plan.name}
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/pricing'}
                className="w-full"
              >
                Compare All Plans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UpgradePrompt;