import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Cookie, Settings, Shield, BarChart3, Target, CheckCircle } from 'lucide-react';

const Cookies = () => {
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
    preferences: true
  });

  const lastUpdated = "December 15, 2024";

  const handlePreferenceChange = (category: keyof typeof cookiePreferences) => {
    setCookiePreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const saveCookiePreferences = () => {
    // Here you would save the preferences to localStorage or send to server
    console.log('Saving cookie preferences:', cookiePreferences);
    alert('Cookie preferences saved successfully!');
  };

  const cookieCategories = [
    {
      id: 'essential',
      title: 'Essential Cookies',
      icon: <Shield className="h-6 w-6 text-workbbench-green" />,
      description: 'Required for the website to function properly',
      purpose: 'These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions made by you which amount to a request for services.',
      examples: [
        'User authentication and login status',
        'Security tokens and session management',
        'Shopping cart contents and checkout process',
        'Privacy preference settings',
        'Load balancing and server routing'
      ],
      duration: 'Session or up to 1 year',
      canDisable: false
    },
    {
      id: 'analytics',
      title: 'Analytics Cookies',
      icon: <BarChart3 className="h-6 w-6 text-workbbench-blue" />,
      description: 'Help us understand how visitors interact with our website',
      purpose: 'These cookies collect information about how visitors use our website, such as which pages are most popular and how users navigate through the site.',
      examples: [
        'Google Analytics tracking',
        'Page view counts and bounce rates',
        'User journey and navigation patterns',
        'Feature usage statistics',
        'Performance monitoring'
      ],
      duration: '2 years',
      canDisable: true
    },
    {
      id: 'marketing',
      title: 'Marketing Cookies',
      icon: <Target className="h-6 w-6 text-workbbench-orange" />,
      description: 'Used to deliver personalized advertisements',
      purpose: 'These cookies track your online activity to help advertisers deliver more relevant advertising or to limit how many times you see an ad.',
      examples: [
        'Personalized ad targeting',
        'Social media integration',
        'Cross-site tracking pixels',
        'Remarketing and retargeting',
        'A/B testing for marketing campaigns'
      ],
      duration: '1-2 years',
      canDisable: true
    },
    {
      id: 'preferences',
      title: 'Preference Cookies',
      icon: <Settings className="h-6 w-6 text-workbbench-purple" />,
      description: 'Remember your settings and preferences',
      purpose: 'These cookies allow our website to remember information that changes the way the website behaves or looks, like your preferred language or theme.',
      examples: [
        'Language and region settings',
        'Theme preferences (dark/light mode)',
        'Font size and accessibility options',
        'Dashboard layout customization',
        'Notification preferences'
      ],
      duration: '1 year',
      canDisable: true
    }
  ];

  const thirdPartyServices = [
    {
      service: 'Google Analytics',
      purpose: 'Website analytics and user behavior tracking',
      category: 'Analytics',
      dataShared: 'Usage patterns, page views, device information',
      retention: '26 months',
      privacyPolicy: 'https://policies.google.com/privacy'
    },
    {
      service: 'Google Ads',
      purpose: 'Advertising and remarketing',
      category: 'Marketing',
      dataShared: 'Ad interactions, conversion data',
      retention: '24 months',
      privacyPolicy: 'https://policies.google.com/privacy'
    },
    {
      service: 'Hotjar',
      purpose: 'User experience analysis and heatmaps',
      category: 'Analytics',
      dataShared: 'Mouse movements, clicks, scroll behavior',
      retention: '12 months',
      privacyPolicy: 'https://www.hotjar.com/legal/policies/privacy/'
    },
    {
      service: 'Intercom',
      purpose: 'Customer support and live chat',
      category: 'Essential',
      dataShared: 'Support conversations, user identification',
      retention: 'As long as account exists',
      privacyPolicy: 'https://www.intercom.com/legal/privacy'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Cookie className="h-12 w-12 text-workbbench-purple" />
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
                Cookie Policy
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Learn about how we use cookies and similar technologies to improve your experience 
            on Workbbench and manage your cookie preferences.
          </p>
          
          <Badge className="bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30 px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            Last Updated: {lastUpdated}
          </Badge>
        </div>

        {/* Cookie Manager */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Manage Your Cookie Preferences</h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Control how we use cookies on our website. You can enable or disable different 
                  categories of cookies based on your preferences.
                </p>
              </div>

              <div className="space-y-6">
                {cookieCategories.map((category) => (
                  <Card key={category.id} className="bg-secondary/30 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {category.icon}
                          <div>
                            <h3 className="font-semibold text-lg">{category.title}</h3>
                            <p className="text-gray-300 text-sm">{category.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {category.canDisable ? (
                            <Switch
                              checked={cookiePreferences[category.id as keyof typeof cookiePreferences]}
                              onCheckedChange={() => handlePreferenceChange(category.id as keyof typeof cookiePreferences)}
                            />
                          ) : (
                            <Badge className="bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30 text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-gray-300">
                        <p><strong>Purpose:</strong> {category.purpose}</p>
                        <p><strong>Duration:</strong> {category.duration}</p>
                        
                        <div>
                          <p className="font-medium mb-2">Examples:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {category.examples.map((example, index) => (
                              <li key={index}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button 
                  onClick={saveCookiePreferences}
                  size="lg" 
                  className="bg-workbbench-purple hover:bg-workbbench-purple/90"
                >
                  Save Cookie Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* What Are Cookies */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">What Are Cookies?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-workbbench-purple" />
                  Definition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Cookies are small text files that are stored on your device when you visit a website. 
                  They help websites remember your preferences, login status, and other information to 
                  improve your browsing experience.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-workbbench-blue" />
                  Your Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  You have full control over cookies. You can accept or decline cookies, delete existing 
                  cookies, and set your browser to warn you before accepting cookies. Some website 
                  features may not work properly if you disable cookies.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Third Party Services */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Third-Party Services</h2>
          <p className="text-gray-300 text-center mb-8 max-w-3xl mx-auto">
            We work with trusted third-party services that may also set cookies on your device. 
            Here's information about these services and how they use your data:
          </p>

          <div className="space-y-4">
            {thirdPartyServices.map((service, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                    <div>
                      <h3 className="font-semibold">{service.service}</h3>
                      <Badge className="mt-1 text-xs" variant="outline">
                        {service.category}
                      </Badge>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <p className="text-gray-300 text-sm">{service.purpose}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Data Retention</p>
                      <p className="text-sm">{service.retention}</p>
                    </div>
                    
                    <div>
                      <a 
                        href={service.privacyPolicy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-workbbench-blue hover:underline text-sm"
                      >
                        Privacy Policy
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Browser Instructions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Managing Cookies in Your Browser</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                browser: 'Chrome',
                steps: [
                  'Click the three dots menu → Settings',
                  'Privacy and security → Cookies and other site data',
                  'Choose your preferred cookie settings'
                ]
              },
              {
                browser: 'Firefox',
                steps: [
                  'Click the menu button → Options/Preferences',
                  'Privacy & Security panel',
                  'Cookies and Site Data section'
                ]
              },
              {
                browser: 'Safari',
                steps: [
                  'Safari menu → Preferences',
                  'Privacy tab',
                  'Manage Website Data or Block all cookies'
                ]
              },
              {
                browser: 'Edge',
                steps: [
                  'Click the three dots → Settings',
                  'Site permissions → Cookies and site data',
                  'Adjust your cookie preferences'
                ]
              },
              {
                browser: 'Opera',
                steps: [
                  'Settings → Advanced → Privacy & security',
                  'Site Settings → Cookies and site data',
                  'Configure cookie settings'
                ]
              },
              {
                browser: 'Mobile Browsers',
                steps: [
                  'Open browser settings/preferences',
                  'Look for Privacy or Site Settings',
                  'Find Cookies or Site Data options'
                ]
              }
            ].map((browser, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">{browser.browser}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="text-sm text-gray-300 space-y-2">
                    {browser.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <span className="text-workbbench-purple font-mono">
                          {stepIndex + 1}.
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cookie Types Explanation */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Types of Cookies We Use</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Session Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-3">
                  Temporary cookies that are deleted when you close your browser. They help maintain 
                  your session while navigating through our website.
                </p>
                <div className="text-sm text-gray-400">
                  <strong>Examples:</strong> Login status, shopping cart contents, form data
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Persistent Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-3">
                  Stored on your device for a specific period or until manually deleted. They remember 
                  your preferences across multiple visits.
                </p>
                <div className="text-sm text-gray-400">
                  <strong>Examples:</strong> Language preferences, theme settings, "Remember me" options
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>First-Party Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-3">
                  Set directly by our website (workbbench.ai). We have full control over these cookies 
                  and how they're used.
                </p>
                <div className="text-sm text-gray-400">
                  <strong>Examples:</strong> User preferences, authentication tokens, site functionality
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Third-Party Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-3">
                  Set by external services we use (analytics, advertising, social media). These are 
                  subject to the privacy policies of those services.
                </p>
                <div className="text-sm text-gray-400">
                  <strong>Examples:</strong> Google Analytics, social media widgets, advertising pixels
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Information */}
        <section>
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Questions About Cookies?</h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                If you have any questions about our use of cookies or need help managing your preferences, 
                please don't hesitate to contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Contact Support
                </Button>
                <Button variant="outline">
                  View Privacy Policy
                </Button>
              </div>
              
              <div className="mt-8 text-sm text-gray-400">
                <p>Email: privacy@workbbench.ai</p>
                <p>Or visit our Contact page for more ways to reach us</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Cookies;
