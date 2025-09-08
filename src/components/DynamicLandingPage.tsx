import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, CheckCircle, ArrowRight, Play, Users, Award, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  LandingPage, 
  PageSection, 
  Feature, 
  Testimonial, 
  SEOMetadata
} from '@/lib/dynamodb-config';
import { MockContentService } from '@/lib/mock-content-service';
import SEOHead from '@/components/SEOHead';
import Navbar from '@/components/Navbar';

interface DynamicLandingPageProps {
  pageId: string;
  fallbackData?: {
    title: string;
    subtitle: string;
    description: string;
    ctaText: string;
    ctaUrl: string;
  };
}

const DynamicLandingPage: React.FC<DynamicLandingPageProps> = ({ pageId, fallbackData }) => {
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setIsLoading(true);
        
        // Use mock service for development (replace with ContentService for production)
        const ContentServiceToUse = MockContentService;
        
        // Fetch all data concurrently
        const [pageData, sectionsData, featuresData, testimonialsData, seoData] = await Promise.all([
          ContentServiceToUse.getLandingPage(pageId),
          ContentServiceToUse.getPageSections(pageId),
          ContentServiceToUse.getFeatures(pageId),
          ContentServiceToUse.getTestimonials(pageId),
          ContentServiceToUse.getSEOMetadata(pageId)
        ]);

        setLandingPage(pageData);
        setSections(sectionsData);
        setFeatures(featuresData);
        setTestimonials(testimonialsData);
        setSeoMetadata(seoData);
        
      } catch (err) {
        console.error('Error fetching page data:', err);
        setError('Failed to load page content');
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

  // Error state
  if (error && !fallbackData) {
    return (
      <div className="min-h-screen bg-workbbench-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback data if database content is not available
  const pageData = landingPage || {
    title: fallbackData?.title || 'AI Nexus Service',
    subtitle: fallbackData?.subtitle || 'Advanced AI Development Platform',
    description: fallbackData?.description || 'Build and deploy AI solutions with ease.',
    ctaText: fallbackData?.ctaText || 'Get Started',
    ctaUrl: fallbackData?.ctaUrl || '/auth/signup'
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
              {pageData.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              {pageData.subtitle}
            </p>
            
            <p className="text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
              {pageData.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link to={pageData.ctaUrl}>
              <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/80 text-white px-8 py-3 text-lg">
                {pageData.ctaText}
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
    if (features.length === 0) return null;

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
            {features.map((feature, index) => (
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
                        {feature.benefits.map((benefit, idx) => (
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
    if (testimonials.length === 0) return null;

    return (
      <section className="py-24 bg-workbbench-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join thousands of developers who trust Diatonic AI for their AI development needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.slice(0, 6).map((testimonial, index) => (
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
                      {testimonial.customerAvatar && (
                        <img 
                          src={testimonial.customerAvatar} 
                          alt={testimonial.customerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{testimonial.customerName}</p>
                          {testimonial.isVerified && (
                            <CheckCircle className="h-4 w-4 text-workbbench-cyan" />
                          )}
                        </div>
                        {testimonial.customerTitle && (
                          <p className="text-sm text-gray-400">
                            {testimonial.customerTitle}
                            {testimonial.customerCompany && ` at ${testimonial.customerCompany}`}
                          </p>
                        )}
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
            Join thousands of developers building the future with Diatonic AI.
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
        metadata={seoMetadata} 
        defaultTitle={`${pageData.title} - Diatonic AI`}
        defaultDescription={pageData.description}
      />
      <Navbar />
      {renderHeroSection()}
      {renderFeaturesSection()}
      {renderTestimonialsSection()}
      {renderCTASection()}
    </div>
  );
};

export default DynamicLandingPage;
