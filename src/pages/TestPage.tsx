import { useDevAuth } from "@/contexts/DevAuthContext";
import { PRICING, PricingUtils, type PlanId, type PlanTier } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function TestPage() {
  const { user, isAuthenticated, tenantId } = useDevAuth();
  const isPlanId = (value: any): value is PlanId => (
    value === 'free' || value === 'basic' || value === 'pro' || value === 'extreme' || value === 'enterprise'
  );
  const plan: PlanTier | undefined = isPlanId(user?.plan_id) ? PRICING[user!.plan_id] : undefined;
  const usage = user?.subscription?.usage;
  const createdAt = user?.created_at ? new Date(user.created_at) : undefined;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Development Panel Test Page</h1>
        <p className="text-muted-foreground">
          This page displays current user information and pricing tier details to test the development panel integration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Authentication Status
              {isAuthenticated ? (
                <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-2">
                <div><strong>Name:</strong> {user.name}</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Role:</strong> <Badge variant="outline">{user.role}</Badge></div>
                <div><strong>Tenant:</strong> {tenantId}</div>
                <div><strong>Permissions:</strong> {user.permissions?.length || 0}</div>
                {createdAt && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Created:</strong> {createdAt.toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">No user authenticated</div>
            )}
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <strong>Plan:</strong> 
                    <Badge variant="secondary">{plan.name}</Badge>
                  </div>
                  <div>
                    <strong>Price:</strong> {PricingUtils.formatPrice(plan.price.monthly.amount || 0)}/month
                  </div>
                  <div><strong>Description:</strong> {plan.description}</div>
                </div>
                
                <Separator />
                
                {/* Plan Limits */}
                {plan.limits && (
                  <div className="space-y-2">
                    <strong>Plan Limits:</strong>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(plan.limits!).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Usage Information */}
                {usage && (
                  <div className="space-y-2">
                    <strong>Current Usage:</strong>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Agents:</span><span className="font-mono">{usage.agents}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API Calls:</span><span className="font-mono">{usage.api_calls}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span>Storage:</span><span className="font-mono">{usage.storage_used}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                {/* Features List */}
                <div className="space-y-2">
                  <strong>Plan Features:</strong>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {plan.features.slice(0, 8).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {plan.features.length > 8 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        +{plan.features.length - 8} more features...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No plan assigned</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Look for the <strong>"Development Panel"</strong> in the bottom-right corner of the screen</li>
            <li>Click to expand it if it's collapsed</li>
            <li>Use the <strong>"Pricing Tier"</strong> dropdown to switch between: Free, Basic, Pro, Extreme, Enterprise</li>
            <li>Use the <strong>"User Role"</strong> dropdown to switch between: Admin, User, Viewer</li>
            <li>Watch how the user information and plan details update on this page in real-time</li>
            <li>Test the usage limits and feature availability for different tiers</li>
            <li>Use the "Refresh" and "Clear" buttons to test cache management</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default TestPage;
