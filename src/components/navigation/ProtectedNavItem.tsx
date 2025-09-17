import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Crown, Rocket, Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission, UserRole, PlanId, PermissionUtils } from '@/lib/permissions';
import { PricingUtils, PRICING } from '@/lib/pricing';
import { useStripe } from '@/hooks/useStripe';
import { NavItem } from '@/lib/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ProtectedNavItemProps {
  item: NavItem;
  requiredPlan?: PlanId;
  feature?: string;
  upgradeDescription?: string;
  benefits?: string[];
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
  free: 'text-green-500',
  basic: 'text-blue-500',
  pro: 'text-purple-500',
  extreme: 'text-orange-500',
  enterprise: 'text-red-500'
} as const;

/**
 * ProtectedNavItem Component
 * 
 * Navigation item that shows upgrade dialog for locked features
 * instead of navigating to the route.
 */
export function ProtectedNavItem({
  item,
  requiredPlan,
  feature,
  upgradeDescription,
  benefits = []
}: ProtectedNavItemProps) {
  const location = useLocation();
  const { hasPermission, hasRole, user } = usePermissions();
  const { upgradeToplan, loading: stripeLoading } = useStripe();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const currentRole = user?.role || 'anonymous' as UserRole;
  const isActive = location.pathname === item.path;
  
  // Check if user has access
  const hasAccess = () => {
    // Check permission if specified
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return false;
    }
    
    // Check required plan if specified
    if (requiredPlan && !hasRole(requiredPlan as UserRole)) {
      return false;
    }
    
    return true;
  };
  
  const canAccess = hasAccess();
  
  // If user has access, render normal nav item
  if (canAccess) {
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/20 text-primary"
            : "hover:bg-secondary/60 text-foreground"
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  }
  
  // User doesn't have access - show locked item with upgrade dialog
  const plan = requiredPlan ? PricingUtils.getPlan(requiredPlan) : null;
  const PlanIcon = requiredPlan ? PLAN_ICONS[requiredPlan] : Crown;
  const planColor = requiredPlan ? PLAN_COLORS[requiredPlan] : 'text-purple-500';
  
  const handleUpgrade = async () => {
    if (!requiredPlan) return;
    
    if (requiredPlan === 'enterprise') {
      handleContactSales();
      return;
    }
    
    // Use Stripe integration for direct checkout
    await upgradeToplan(requiredPlan, 'monthly', feature || item.label);
    setIsDialogOpen(false);
  };
  
  const handleContactSales = () => {
    // For enterprise plans, redirect to contact
    const contactUrl = `/contact?plan=${requiredPlan}&feature=${encodeURIComponent(feature || item.label)}`;
    window.location.href = contactUrl;
    setIsDialogOpen(false);
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left",
            "hover:bg-secondary/30 text-muted-foreground cursor-pointer",
            "group relative"
          )}
        >
          <div className="relative">
            <item.icon className="h-5 w-5 opacity-50" />
            <Lock className="h-3 w-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground/70" />
          </div>
          
          <span className="flex-1 opacity-50">{item.label}</span>
          
          {requiredPlan && (
            <Badge 
              variant="outline" 
              className={cn('text-xs opacity-70 group-hover:opacity-100 transition-opacity', planColor)}
            >
              {plan?.name}
            </Badge>
          )}
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <PlanIcon className={cn('h-6 w-6', planColor)} />
          </div>
          
          <DialogTitle className="text-xl">
            Unlock {feature || item.label}
          </DialogTitle>
          
          <DialogDescription className="text-base">
            {upgradeDescription || 
             item.description || 
             `Access to ${item.label} requires a higher subscription plan.`}
          </DialogDescription>
          
          {requiredPlan && plan && (
            <Badge className={cn('mx-auto', planColor, 'bg-current/10 text-current border-current/20')}>
              {plan.name} Plan Required
            </Badge>
          )}
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current vs Required Plan */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Plan:</span>
              <Badge variant="outline">
                {PermissionUtils.getRoleDisplayName(currentRole)}
              </Badge>
            </div>
            {requiredPlan && plan && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Required Plan:</span>
                <Badge className={cn(planColor, 'bg-current/10 text-current border-current/20')}>
                  {plan.name}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Benefits */}
          {benefits.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">What you'll get:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className={cn('h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0', planColor, 'bg-current')} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          
          {/* Pricing */}
          {requiredPlan && plan && (
            <>
              <Separator />
              <div className="text-center space-y-2">
                <div className="text-lg font-semibold">
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
                  <div className="text-xs text-green-600">
                    Save {PricingUtils.getYearlySavingsPercent(requiredPlan)}% with yearly billing
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* CTA Buttons */}
          <div className="space-y-2">
            {requiredPlan === 'enterprise' ? (
              <Button 
                onClick={handleContactSales} 
                className="w-full"
                disabled={stripeLoading}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Contact Sales
              </Button>
            ) : requiredPlan && plan ? (
              <Button 
                onClick={handleUpgrade} 
                className="w-full"
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
            ) : (
              <Button 
                onClick={() => window.location.href = '/pricing'} 
                className="w-full"
                disabled={stripeLoading}
              >
                View Pricing Plans
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
      </DialogContent>
    </Dialog>
  );
}

export default ProtectedNavItem;