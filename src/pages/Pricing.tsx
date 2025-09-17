import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Navbar from '@/components/Navbar';

import { useMemo, useState } from 'react';
import PlanCard from '@/components/billing/PlanCard';
import { PlanToggle } from '@/components/billing/PlanToggle';
import { PRICING, type BillingInterval, type PlanId } from '@/lib/pricing';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useBillingPortal } from '@/hooks/useBillingPortal';
import { useSubscription } from '@/hooks/useSubscription';
import EnterpriseInquiryModal from '@/components/pricing/EnterpriseInquiryModal';

const Pricing = () => {
// Use centralized PRICING model
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const { data: sub, isLoading: subLoading } = useSubscription();
  const checkout = useStripeCheckout();
  const portal = useBillingPortal();

  const tiers = useMemo(() => Object.values(PRICING), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      {/* Hero Section */}
<section className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
<div className="text-center mb-10 md:mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Choose Your <span className="text-gradient bg-gradient-to-r from-workbbench-purple via-workbbench-blue to-workbbench-orange">AI Journey</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              From hobbyist to enterprise, we have the perfect plan to accelerate your AI development
</p>
            <div className="mt-6"><PlanToggle value={interval} onChange={setInterval} /></div>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                No setup fees
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Cancel anytime
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                14-day free trial
              </div>
            </div>
          </div>
          
{/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto auto-rows-fr">
{tiers.map((tier) => (
              <PlanCard
                key={tier.id}
                tier={tier as any}
                interval={interval}
                isCurrent={sub?.planId === tier.id}
                disabled={checkout.isLoading || subLoading}
                onSelect={async (planId) => {
                  if (tier.cta === 'contact') {
                    // Show enterprise inquiry modal to capture lead info
                    setShowEnterpriseModal(true);
                    return;
                  }
                  if (tier.cta === 'free') {
                    // Route free plan signups through onboarding for better data capture
                    window.location.href = '/onboarding';
                    return;
                  }
                  const successUrl = window.location.origin + '/dashboard';
                  const cancelUrl = window.location.href;
                  checkout.mutate({ planId, interval, successUrl, cancelUrl });
                }}
                onManage={() => portal.mutate()}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-300">Everything you need to know about our pricing</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-gray-300">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing accordingly.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">What happens if I exceed my limits?</h3>
                <p className="text-gray-300">We'll notify you before you reach your limits. You can either upgrade your plan or wait for the next billing cycle to reset.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-gray-300">Yes, we offer a 30-day money-back guarantee on all paid plans. No questions asked.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Is there a setup fee?</h3>
                <p className="text-gray-300">No, there are no setup fees or hidden costs. You only pay the monthly subscription for your chosen plan.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Can I get a custom plan?</h3>
                <p className="text-gray-300">Yes! Our Enterprise plan is fully customizable. Contact our sales team to discuss your specific requirements.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-300">We accept all major credit cards, PayPal, and for Enterprise plans, we can arrange invoicing and wire transfers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build the Future?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join thousands of developers already building amazing AI applications with Workbbench
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/onboarding">
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Start Free Trial
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20"
                onClick={() => setShowEnterpriseModal(true)}
              >
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Inquiry Modal */}
      <EnterpriseInquiryModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        onSuccess={(leadId) => {
          console.log('Enterprise inquiry submitted:', leadId);
          // Optionally track successful lead creation
          if (typeof gtag !== 'undefined') {
            gtag('event', 'enterprise_lead_created', {
              event_category: 'pricing',
              event_label: 'talk_to_sales_cta',
              value: 1,
            });
          }
        }}
      />
    </div>
  );
};

export default Pricing;
