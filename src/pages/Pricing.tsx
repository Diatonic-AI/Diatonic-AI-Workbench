import { Link } from 'react-router-dom';
import { Check, X, Star, Zap, Crown, Building2, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from '@/components/Navbar';

const PricingTier = ({
  name,
  price,
  period,
  description,
  features,
  notIncluded = [],
  isPopular = false,
  isEnterprise = false,
  icon: Icon,
  ctaText,
  ctaVariant = "default" as const
}) => (
  <Card className={`relative h-full ${isPopular ? 'border-workbbench-purple shadow-lg scale-105' : 'border-border/50'} ${isEnterprise ? 'border-workbbench-orange shadow-lg' : ''}`}>
    {isPopular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <Badge className="bg-workbbench-purple text-white px-4 py-1">
          Most Popular
        </Badge>
      </div>
    )}
    {isEnterprise && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <Badge className="bg-workbbench-orange text-white px-4 py-1">
          Premium
        </Badge>
      </div>
    )}
    <CardHeader className="text-center pb-6">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
        name === 'Free' ? 'bg-gray-500/20' : 
        name === 'Basic' ? 'bg-workbbench-blue/20' :
        name === 'Pro' ? 'bg-workbbench-purple/20' :
        name === 'Extreme' ? 'bg-workbbench-green/20' :
        'bg-workbbench-orange/20'
      }`}>
        <Icon className={`w-8 h-8 ${
          name === 'Free' ? 'text-gray-400' : 
          name === 'Basic' ? 'text-workbbench-blue' :
          name === 'Pro' ? 'text-workbbench-purple' :
          name === 'Extreme' ? 'text-workbbench-green' :
          'text-workbbench-orange'
        }`} />
      </div>
      <CardTitle className="text-2xl font-bold">{name}</CardTitle>
      <CardDescription className="text-gray-400 mb-4">{description}</CardDescription>
      <div className="text-center">
        <span className="text-4xl font-bold">{price}</span>
        {period && <span className="text-gray-400 ml-1">{period}</span>}
      </div>
    </CardHeader>
    <CardContent className="flex flex-col h-full">
      <div className="flex-grow">
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-workbbench-green mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
          {notIncluded.map((feature, index) => (
            <li key={index} className="flex items-start opacity-50">
              <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-400 line-through">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button 
        className={`w-full ${
          ctaVariant === 'default' ? 'bg-workbbench-purple hover:bg-workbbench-purple/90' :
          ctaVariant === 'outline' ? 'border-workbbench-purple text-workbbench-purple hover:bg-workbbench-purple hover:text-white' :
          ctaVariant === 'secondary' ? 'bg-workbbench-orange hover:bg-workbbench-orange/90' :
          'bg-workbbench-blue hover:bg-workbbench-blue/90'
        }`}
        variant={ctaVariant === 'outline' ? 'outline' : 'default'}
        size="lg"
      >
        {ctaText}
      </Button>
    </CardContent>
  </Card>
);

const Pricing = () => {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started with AI',
      icon: Star,
      ctaText: 'Get Started Free',
      ctaVariant: 'outline' as const,
      features: [
        '3 AI agents per month',
        'Basic visual builder',
        'Community support',
        'Public project sharing',
        'Basic templates library',
        '1 GB cloud storage',
        'Standard execution time'
      ],
      notIncluded: [
        'Advanced AI models',
        'Team collaboration',
        'Priority support'
      ]
    },
    {
      name: 'Basic',
      price: '$29',
      period: '/month',
      description: 'Ideal for individual developers and hobbyists',
      icon: Zap,
      ctaText: 'Start Basic Plan',
      ctaVariant: 'primary' as const,
      features: [
        '25 AI agents per month',
        'Advanced visual builder',
        'Email support',
        'Private projects',
        'Premium templates library',
        '10 GB cloud storage',
        'Extended execution time',
        'Basic analytics',
        'Export functionality',
        'API access (100 calls/day)'
      ],
      notIncluded: [
        'Team collaboration',
        'Custom integrations'
      ]
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/month',
      description: 'Best for professionals and small teams',
      icon: Crown,
      ctaText: 'Upgrade to Pro',
      ctaVariant: 'default' as const,
      isPopular: true,
      features: [
        '100 AI agents per month',
        'Full visual builder suite',
        'Priority support',
        'Team collaboration (5 members)',
        'Custom templates',
        '100 GB cloud storage',
        'Maximum execution time',
        'Advanced analytics & insights',
        'Multi-format export',
        'API access (1000 calls/day)',
        'Custom integrations',
        'Version control',
        'Advanced debugging tools'
      ]
    },
    {
      name: 'Extreme',
      price: '$299',
      period: '/month',
      description: 'For power users and growing teams',
      icon: Zap,
      ctaText: 'Go Extreme',
      ctaVariant: 'secondary' as const,
      features: [
        'Unlimited AI agents',
        'Professional builder suite',
        '24/7 priority support',
        'Team collaboration (20 members)',
        'Custom template creation',
        '500 GB cloud storage',
        'Unlimited execution time',
        'Real-time analytics dashboard',
        'White-label export options',
        'Unlimited API access',
        'Advanced integrations',
        'Git integration',
        'Professional debugging suite',
        'Custom model training',
        'A/B testing capabilities',
        'Advanced security features'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: null,
      description: 'Tailored for large organizations',
      icon: Building2,
      ctaText: 'Contact Sales',
      ctaVariant: 'secondary' as const,
      isEnterprise: true,
      features: [
        'Unlimited everything',
        'Enterprise builder platform',
        'Dedicated support team',
        'Unlimited team members',
        'Custom development',
        'Unlimited cloud storage',
        'On-premises deployment',
        'Enterprise analytics',
        'Custom branding & export',
        'Enterprise API access',
        'Custom integrations',
        'Enterprise Git integration',
        'Enterprise debugging suite',
        'Dedicated model training',
        'Enterprise testing suite',
        'Enterprise security & compliance',
        'SLA guarantees',
        'Custom training & onboarding',
        'Dedicated account manager'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Choose Your <span className="text-gradient bg-gradient-to-r from-workbbench-purple via-workbbench-blue to-workbbench-orange">AI Journey</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              From hobbyist to enterprise, we have the perfect plan to accelerate your AI development
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-7xl mx-auto">
            {tiers.map((tier, index) => (
              <PricingTier key={index} {...tier} />
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
              <Link to="/auth/signup">
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-white/20">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
