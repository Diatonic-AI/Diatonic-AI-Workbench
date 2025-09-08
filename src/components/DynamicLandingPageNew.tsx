import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, CheckCircle, ArrowRight, Play, Users, Award, Zap, Shield, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  contentService, 
  fallbackContent,
  type ServicePageContent,
  type ServiceFeature,
  type ServiceTestimonial,
  type SEOMetadata 
} from '@/lib/content-service';
import SEOHead from '@/components/SEOHead';
import Navbar from '@/components/Navbar';

interface DynamicLandingPageProps {
  pageId: string;
}

interface PageData {
  page: ServicePageContent | null;
  features: ServiceFeature[];
  testimonials: ServiceTestimonial[];
  seo: SEOMetadata | null;
  isOnline: boolean;
  error: string | null;
}

const DynamicLandingPage: React.FC<DynamicLandingPageProps> = ({ pageId }) => {
  const [pageData, setPageData] = useState<PageData>({
    page: null,
    features: [],
    testimonials: [],
    seo: null,
    isOnline: true,
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all data concurrently
        const [page, features, testimonials, seo] = await Promise.all([
          contentService.getServicePageContent(pageId),
          contentService.getServiceFeatures(pageId),
          contentService.getServiceTestimonials(pageId, 6),
          contentService.getSEOMetadata(pageId)
        ]);

        // Check connection status
        const connectionStatus = await contentService.healthCheck();

        setPageData({
          page,
          features,
          testimonials,
          seo,
          isOnline: connectionStatus,
          error: null
        });
        
      } catch (err) {
        console.error('Error fetching page data:', err);
        
        // Use fallback data
        const fallback = (fallbackContent as any)[pageId];
        if (fallback) {
          setPageData({
            page: {
              pageId,
              tenantId: 'default',
              title: fallback.title,
              subtitle: fallback.subtitle,
              description: fallback.description,
              ctaText: fallback.ctaText,
              ctaUrl: fallback.ctaUrl,
              status: 'published',
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
              updatedBy: 'system'
            },
            features: [],
            testimonials: [],
            seo: null,
            isOnline: false,
            error: 'Using offline data - some features may be limited'
          });
        } else {
          setPageData(prev => ({ ...prev, error: 'Failed to load page content' }));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [pageId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-workbbench-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-workbbench-purple mx-auto"></div>
            <p className="text-white mt-4">Loading page content...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state with no fallback data
  if (!pageData.page && pageData.error) {
    return (
      <div className="min-h-screen bg-workbbench-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Page Not Available</h1>
            <p className="text-gray-400 mb-6">{pageData.error}</p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const page = pageData.page!;

  const renderOfflineBanner = () => {
    if (pageData.isOnline) return null;

    return (
      <div className="bg-yellow-600/20 border-b border-yellow-600/30 px-4 py-2">
        <div className="container mx-auto flex items-center justify-center gap-2 text-yellow-200">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Using offline data - some content may be limited</span>
        </div>
      </div>
    );
  };

  const renderHeroSection = () => (
    <section className="relative min-h-screen bg-gradient-to-br from-workbbench-dark via-workbbench-dark-purple to-workbbench-dark overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-workbbench-purple/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-workbbench-cyan/20 rounded-full blur-3xl"></div>
      
      <div className="relative container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="outline" className="mb-6 bg-workbbench-purple/20 text-workbbench-cyan border-workbbench-purple/50">
              {pageId.toUpperCase()} PLATFORM
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {page.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              {page.subtitle}
            </p>
            
            <p className="text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
              {page.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link to={page.ctaUrl}>
              <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/80 text-white px-8 py-3 text-lg">
                {page.ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Button variant="outline" size="lg" className="border-workbbench-purple/50 text-workbbench-purple hover:bg-workbbench-purple/10 px-8 py-3 text-lg">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-400"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>10,000+ Developers</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>ISO 27001 Certified</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );

  const renderFeaturesSection = () => {
    if (pageData.features.length === 0) {
      return (
        <section className="py-24 bg-workbbench-dark-purple/50">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                Everything you need to build, test, and deploy AI solutions at scale.
              </p>
              <div className="text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Feature details are being loaded...</p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="py-24 bg-workbbench-dark-purple/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Everything you need to build, test, and deploy AI solutions at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pageData.features.map((feature, index) => (
              <motion.div
                key={feature.featureId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-workbbench-dark border-workbbench-purple/20 hover:border-workbbench-purple/50 transition-all duration-300 h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-workbbench-purple/20 rounded-lg">
                        <Zap className="h-6 w-6 text-workbbench-purple" />
                      </div>
                      {feature.isHighlighted && (
                        <Badge variant="secondary" className="bg-workbbench-cyan/20 text-workbbench-cyan">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {feature.benefits.length > 0 && (
                      <ul className="space-y-2">
                        {feature.benefits.slice(0, 4).map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle className="h-4 w-4 text-workbbench-cyan flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderTestimonialsSection = () => {
    if (pageData.testimonials.length === 0) return null;

    return (
      <section className="py-24 bg-workbbench-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join thousands of developers who trust AI Nexus for their AI development needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pageData.testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.testimonialId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-workbbench-dark-purple border-workbbench-purple/20 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < testimonial.rating 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-600'
                          }`} 
                        />
                      ))}
                    </div>
                    
                    <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                    
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{testimonial.customerName}</p>
                          {testimonial.isVerified && (
                            <CheckCircle className="h-4 w-4 text-workbbench-cyan" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {testimonial.customerTitle}
                          {testimonial.customerCompany && ` at ${testimonial.customerCompany}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderCTASection = () => (
    <section className="py-24 bg-gradient-to-r from-workbbench-purple to-workbbench-cyan">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of developers building the future with AI Nexus Workbench.
            Start your free trial today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" variant="secondary" className="bg-white text-workbbench-purple hover:bg-gray-100 px-8 py-3 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg">
                Contact Sales
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-workbbench-dark">
      <SEOHead 
        metadata={pageData.seo} 
        defaultTitle={`${page.title} - AI Nexus Workbench`}
        defaultDescription={page.description}
      />
      {renderOfflineBanner()}
      <Navbar />
      {renderHeroSection()}
      {renderFeaturesSection()}
      {renderTestimonialsSection()}
      {renderCTASection()}
    </div>
  );
};

export default DynamicLandingPage;
