import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { PlanTier, BillingInterval } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export interface PlanCardProps {
  tier: PlanTier;
  interval: BillingInterval;
  isCurrent?: boolean;
  disabled?: boolean;
  onSelect?: (planId: PlanTier["id"], interval: BillingInterval) => void;
  onManage?: () => void;
}

export function PlanCard({ tier, interval, isCurrent, disabled, onSelect, onManage }: PlanCardProps) {
  const price = tier.price[interval];
  const amount = price?.amount ?? 0;
  const currency = price?.currency ?? "usd";

  const handleSelect = () => {
    if (disabled) return;
    onSelect?.(tier.id, interval);
  };

  return (
    <Card className={cn(
      "relative h-full flex flex-col",
      tier.highlight && "border-workbbench-purple ring-1 ring-workbbench-purple/40 shadow-lg",
    )}>
      {(tier.highlight || tier.id === 'enterprise') && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className={cn(
            tier.highlight ? "bg-workbbench-purple text-white" : "bg-workbbench-orange text-white",
            "px-3 py-1"
          )}>
            {tier.highlight ? "Most Popular" : "Premium"}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
        <CardDescription className="text-muted-foreground mb-2">{tier.description}</CardDescription>
        <div className="text-center">
          {typeof amount === 'number' ? (
            <>
              <span className="text-4xl font-bold">{currency === 'usd' ? '$' : ''}{amount}</span>
              <span className="text-sm text-muted-foreground ml-1">/ {interval}</span>
            </>
          ) : (
            <span className="text-2xl font-semibold">Custom</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3" role="list" aria-label={`${tier.name} plan features`}>
          {tier.features?.map((feature, i) => (
            <li key={i} className="flex items-start">
              <Check className="w-5 h-5 text-workbbench-green mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
          {tier.limits && Object.keys(tier.limits).length > 0 && (
            <li className="pt-1">
              <span className="text-xs text-muted-foreground">Limits apply</span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-2">
        {isCurrent ? (
          <div className="flex w-full gap-2">
            <Button className="flex-1" disabled aria-disabled>
              Current Plan
            </Button>
            <Button variant="outline" className="flex-1" onClick={onManage} aria-label="Manage subscription">
              Manage
            </Button>
          </div>
        ) : (
          <Button
            className="w-full bg-workbbench-purple hover:bg-workbbench-purple/90"
            size="lg"
            onClick={handleSelect}
            disabled={disabled}
            aria-busy={disabled}
            aria-label={tier.cta === 'checkout' ? `Upgrade to ${tier.name} ${interval}` : `Select ${tier.name}`}
          >
            {tier.cta === 'contact' ? 'Contact Sales' : tier.cta === 'free' ? 'Start Free' : `Choose ${tier.name}`}
          </Button>
        )}
        {tier.cta === 'contact' && (
          <p className="text-xs text-muted-foreground text-center">We’ll tailor a plan to your needs.</p>
        )}
      </CardFooter>
    </Card>
  );
}

export default PlanCard;
