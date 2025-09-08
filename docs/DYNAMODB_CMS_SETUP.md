# DynamoDB CMS Setup Guide

## Overview

This guide explains how to set up and use the DynamoDB-powered Content Management System (CMS) for AI Nexus Workbench landing pages.

## Architecture

The CMS uses a multi-table DynamoDB design optimized for content management and SEO:

### Tables

1. **Landing Pages** - Main page content and metadata
2. **Page Sections** - Flexible content sections within pages
3. **SEO Metadata** - SEO optimization data for each page
4. **Features** - Feature lists for each service
5. **Testimonials** - Customer testimonials and reviews

### Key Features

- **Multi-tenant support** - Each tenant can have separate content
- **Version control** - Track content changes over time
- **SEO optimization** - Comprehensive meta tags and structured data
- **Dynamic content** - Real-time content updates without deployments
- **Fallback system** - Static fallback data when database is unavailable

## Development Setup

### Prerequisites

- Node.js 18+ 
- AWS CLI configured (for production)
- LocalStack (for local development)

### Local Development with LocalStack

1. **Install LocalStack**:
```bash
pip install localstack
```

2. **Start LocalStack**:
```bash
localstack start
```

3. **Create Tables and Seed Data**:
```bash
cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench
chmod +x scripts/setup-dynamodb.js
node scripts/setup-dynamodb.js
```

4. **Verify Setup**:
```bash
# List tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Check table contents
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name dev-ai-nexus-landing-pages
```

## Production Setup

### 1. Environment Variables

Set these environment variables in your production environment:

```bash
export NODE_ENV=production
export VITE_AWS_REGION=us-east-2
export VITE_AWS_ACCESS_KEY_ID=your-access-key
export VITE_AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 2. Create Production Tables

```bash
NODE_ENV=production node scripts/setup-dynamodb.js
```

### 3. IAM Permissions

Your application needs the following DynamoDB permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:*:table/prod-ai-nexus-*"
      ]
    }
  ]
}
```

## Content Management

### Page Structure

Each landing page consists of:

```typescript
interface LandingPage {
  pageId: string;        // 'toolset', 'lab', 'observatory', etc.
  tenantId: string;      // Multi-tenancy support
  title: string;         // Main headline
  subtitle: string;      // Supporting headline  
  description: string;   // Page description
  ctaText: string;       // Call-to-action button text
  ctaUrl: string;        // CTA destination
  status: 'draft' | 'published' | 'archived';
  version: number;       // Version control
  // ... timestamps and metadata
}
```

### SEO Metadata

```typescript
interface SEOMetadata {
  pageId: string;
  metaTitle: string;           // <title> tag
  metaDescription: string;     // Meta description
  metaKeywords: string[];      // Keywords array
  canonicalUrl?: string;       // Canonical URL
  ogTitle?: string;            // Open Graph title
  ogDescription?: string;      // OG description
  ogImage?: string;           // OG image URL
  twitterCard?: string;       // Twitter card type
  structuredData?: object[];  // JSON-LD structured data
  // ... additional meta tags
}
```

### Features System

```typescript
interface Feature {
  featureId: string;
  pageId: string;           // Associated page
  title: string;            // Feature name
  description: string;      // Feature description
  icon: string;            // Icon identifier
  benefits: string[];      // List of benefits
  category: string;        // Feature category
  order: number;           // Display order
  isHighlighted: boolean;  // Featured status
  isVisible: boolean;      // Visibility toggle
}
```

## API Usage

### Fetching Page Content

```typescript
import { ContentService } from '@/lib/dynamodb-config';

// Get landing page
const page = await ContentService.getLandingPage('toolset');

// Get page sections
const sections = await ContentService.getPageSections('toolset');

// Get SEO metadata
const seoData = await ContentService.getSEOMetadata('toolset');

// Get features
const features = await ContentService.getFeatures('toolset');

// Get testimonials
const testimonials = await ContentService.getTestimonials('toolset');
```

### Creating/Updating Content

```typescript
// Create or update landing page
const success = await ContentService.createOrUpdateLandingPage({
  pageId: 'toolset',
  tenantId: 'default',
  title: 'AI Toolset',
  subtitle: 'Visual Agent Builder',
  description: 'Build AI agents with drag-and-drop...',
  ctaText: 'Start Building',
  ctaUrl: '/toolset',
  status: 'published',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'admin',
  updatedBy: 'admin'
});
```

## Landing Page Components

### DynamicLandingPage

The main component that renders landing pages:

```tsx
import DynamicLandingPage from '@/components/DynamicLandingPage';

const ToolsetLanding = () => {
  const fallbackData = {
    title: 'AI Toolset',
    subtitle: 'Visual Agent Builder for Everyone',
    description: 'Create powerful AI agents...',
    ctaText: 'Start Building Agents',
    ctaUrl: '/toolset'
  };

  return (
    <DynamicLandingPage 
      pageId="toolset" 
      fallbackData={fallbackData}
    />
  );
};
```

### SEOHead Component

Automatic SEO optimization:

```tsx
import SEOHead from '@/components/SEOHead';

<SEOHead 
  metadata={seoMetadata} 
  defaultTitle="AI Nexus Workbench"
  defaultDescription="Advanced AI development platform"
/>
```

## Service Landing Pages

The following service landing pages are available:

1. **AI Toolset** (`/services/toolset`) - Visual agent builder
2. **AI Lab** (`/services/lab`) - Experimentation environment  
3. **Observatory** (`/services/observatory`) - Analytics platform
4. **Community Hub** (`/services/community`) - Developer community
5. **Education Hub** (`/services/education`) - Learning platform

Each page includes:
- Hero section with dynamic content
- Features showcase
- Customer testimonials
- Call-to-action sections
- SEO optimization
- Mobile responsiveness

## Admin Dashboard (Future)

The CMS is designed to support a future admin dashboard with:

- Visual content editor
- SEO optimization tools
- A/B testing capabilities
- Analytics integration
- User management
- Version control
- Content scheduling
- Multi-language support

## Monitoring and Analytics

### Performance Monitoring

- DynamoDB CloudWatch metrics
- Page load performance
- SEO ranking tracking
- Conversion rate monitoring

### Content Analytics

- Page view tracking
- User engagement metrics
- CTA conversion rates
- SEO performance

## Troubleshooting

### Common Issues

1. **Tables not found**: Ensure setup script ran successfully
2. **Permission denied**: Check IAM permissions
3. **Empty content**: Verify data seeding completed
4. **Slow loading**: Check DynamoDB provisioned capacity

### Debugging

```bash
# Check table status
aws dynamodb describe-table --table-name dev-ai-nexus-landing-pages

# View logs
cat /var/log/dynamodb-setup.log

# Test connectivity
node -e "
const { ContentService } = require('./src/lib/dynamodb-config.js');
ContentService.getLandingPage('toolset').then(console.log);
"
```

## Security Considerations

1. **Data encryption**: Enable encryption at rest and in transit
2. **Access control**: Use IAM roles with minimal permissions
3. **Input validation**: Sanitize all user inputs
4. **Rate limiting**: Implement request throttling
5. **Audit logging**: Track all content changes
6. **Backup strategy**: Regular automated backups

## Scaling and Performance

### Optimization Tips

1. **Use GSI effectively**: Query by status and date ranges
2. **Batch operations**: Group multiple operations
3. **Caching**: Implement Redis caching layer
4. **CDN**: Use CloudFront for static assets
5. **Connection pooling**: Reuse DynamoDB connections

### Cost Management

1. **On-demand billing**: For variable workloads
2. **Reserved capacity**: For predictable traffic
3. **Data archiving**: Move old versions to cheaper storage
4. **Query optimization**: Minimize scan operations

## Migration Guide

### From Static to Dynamic

1. Export existing content to JSON
2. Transform to CMS data structure
3. Import using bulk operations
4. Update components to use dynamic data
5. Test fallback mechanisms
6. Deploy with feature flags

## Support

For technical support:
- Check troubleshooting section
- Review CloudWatch logs
- Contact development team
- File GitHub issues

---

This CMS provides a solid foundation for managing dynamic content while maintaining excellent performance and SEO optimization.
