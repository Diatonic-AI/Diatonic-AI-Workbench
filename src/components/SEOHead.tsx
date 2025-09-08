import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEOMetadata } from '@/lib/dynamodb-config';

interface SEOHeadProps {
  metadata?: SEOMetadata;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultImage?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({ 
  metadata,
  defaultTitle = "Diatonic AI - Advanced AI Development Platform",
  defaultDescription = "Build, experiment, and deploy AI agents with our comprehensive development platform. Visual tools, cloud infrastructure, and collaborative environment.",
  defaultImage = "/og-image.png"
}) => {
  const title = metadata?.metaTitle || defaultTitle;
  const description = metadata?.metaDescription || defaultDescription;
  const keywords = metadata?.metaKeywords?.join(', ') || 'AI, artificial intelligence, machine learning, development platform, agents, automation';
  const canonicalUrl = metadata?.canonicalUrl || window.location.href;
  const ogTitle = metadata?.ogTitle || title;
  const ogDescription = metadata?.ogDescription || description;
  const ogImage = metadata?.ogImage || defaultImage;
  const twitterTitle = metadata?.twitterTitle || title;
  const twitterDescription = metadata?.twitterDescription || description;
  const twitterImage = metadata?.twitterImage || defaultImage;

  // Generate structured data for better SEO
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Diatonic AI",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "description": description,
    "url": canonicalUrl,
    "publisher": {
      "@type": "Organization",
      "name": "Diatonic AI",
      "url": "https://diatonic-ai.com"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "featureList": [
      "Visual AI Agent Builder",
      "Cloud Experimentation Environment", 
      "Real-time Collaboration",
      "Advanced Analytics",
      "AWS Integration"
    ]
  };

  const structuredDataList = metadata?.structuredData || [defaultStructuredData];

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots Meta */}
      <meta name="robots" content={metadata?.robotsMeta || "index, follow"} />
      
      {/* Language and Region */}
      <meta httpEquiv="content-language" content={metadata?.languageCode || "en-US"} />
      {metadata?.regionCode && <meta name="geo.region" content={metadata.regionCode} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={metadata?.ogType || "website"} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Diatonic AI" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={metadata?.twitterCard || "summary_large_image"} />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={twitterImage} />
      
      {/* Additional Meta Tags for Better SEO */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#6366f1" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      
      {/* Structured Data */}
      {structuredDataList.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data)
          }}
        />
      ))}
      
      {/* Preconnect to External Domains for Performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
    </Helmet>
  );
};

export default SEOHead;
