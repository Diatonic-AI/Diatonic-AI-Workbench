import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, ExternalLink, CheckCircle, Code, Zap, Shield } from 'lucide-react';

const Licenses = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Frontend', 'Backend', 'Development Tools', 'AI/ML', 'Database', 'Infrastructure'];

  const openSourceLicenses = [
    {
      name: "React",
      version: "18.3.1",
      category: "Frontend",
      license: "MIT",
      description: "A JavaScript library for building user interfaces",
      url: "https://reactjs.org/",
      licenseUrl: "https://github.com/facebook/react/blob/main/LICENSE",
      maintainer: "Meta (Facebook)",
      usage: "Core frontend framework for the entire application"
    },
    {
      name: "TypeScript",
      version: "5.5.3",
      category: "Development Tools",
      license: "Apache 2.0",
      description: "TypeScript is JavaScript with syntax for types",
      url: "https://www.typescriptlang.org/",
      licenseUrl: "https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt",
      maintainer: "Microsoft",
      usage: "Type safety and enhanced development experience"
    },
    {
      name: "Vite",
      version: "5.4.1",
      category: "Development Tools",
      license: "MIT",
      description: "Next generation frontend tooling",
      url: "https://vitejs.dev/",
      licenseUrl: "https://github.com/vitejs/vite/blob/main/LICENSE",
      maintainer: "Evan You",
      usage: "Build tool and development server"
    },
    {
      name: "Tailwind CSS",
      version: "3.4.11",
      category: "Frontend",
      license: "MIT",
      description: "A utility-first CSS framework",
      url: "https://tailwindcss.com/",
      licenseUrl: "https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE",
      maintainer: "Tailwind Labs",
      usage: "Styling and responsive design system"
    },
    {
      name: "React Router DOM",
      version: "6.26.2",
      category: "Frontend",
      license: "MIT",
      description: "Declarative routing for React",
      url: "https://reactrouter.com/",
      licenseUrl: "https://github.com/remix-run/react-router/blob/main/LICENSE.md",
      maintainer: "Remix Software",
      usage: "Client-side routing and navigation"
    },
    {
      name: "React Query",
      version: "5.56.2",
      category: "Frontend",
      license: "MIT",
      description: "Data fetching and caching library",
      url: "https://tanstack.com/query/latest",
      licenseUrl: "https://github.com/TanStack/query/blob/main/LICENSE",
      maintainer: "TanStack",
      usage: "Server state management and data fetching"
    },
    {
      name: "React Flow",
      version: "12.6.0",
      category: "Frontend",
      license: "MIT",
      description: "Library for building interactive node-based UIs",
      url: "https://reactflow.dev/",
      licenseUrl: "https://github.com/wbkd/react-flow/blob/main/LICENSE",
      maintainer: "webkid GmbH",
      usage: "Visual agent builder and flow-based interfaces"
    },
    {
      name: "Lucide React",
      version: "0.462.0",
      category: "Frontend",
      license: "ISC",
      description: "Beautiful & consistent icon toolkit",
      url: "https://lucide.dev/",
      licenseUrl: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
      maintainer: "Lucide Contributors",
      usage: "Icons and visual elements throughout the UI"
    },
    {
      name: "Radix UI",
      version: "1.1.0",
      category: "Frontend",
      license: "MIT",
      description: "Low-level UI primitives with accessibility",
      url: "https://www.radix-ui.com/",
      licenseUrl: "https://github.com/radix-ui/primitives/blob/main/LICENSE",
      maintainer: "WorkOS",
      usage: "Accessible UI components foundation"
    },
    {
      name: "AWS Amplify",
      version: "6.15.5",
      category: "Backend",
      license: "Apache 2.0",
      description: "Full-stack development platform",
      url: "https://aws.amazon.com/amplify/",
      licenseUrl: "https://github.com/aws-amplify/amplify-js/blob/main/LICENSE",
      maintainer: "Amazon Web Services",
      usage: "Authentication, API, and AWS service integration"
    },
    {
      name: "AWS SDK for JavaScript",
      version: "3.883.0",
      category: "Backend",
      license: "Apache 2.0",
      description: "Official AWS SDK for JavaScript",
      url: "https://aws.amazon.com/sdk-for-javascript/",
      licenseUrl: "https://github.com/aws/aws-sdk-js-v3/blob/main/LICENSE",
      maintainer: "Amazon Web Services",
      usage: "AWS service integration (Cognito, DynamoDB, S3)"
    },
    {
      name: "Recharts",
      version: "2.12.7",
      category: "Frontend",
      license: "MIT",
      description: "Redefined chart library built with React and D3",
      url: "https://recharts.org/",
      licenseUrl: "https://github.com/recharts/recharts/blob/master/LICENSE",
      maintainer: "Recharts Group",
      usage: "Data visualization and charts in Observatory"
    },
    {
      name: "React Hook Form",
      version: "7.53.0",
      category: "Frontend",
      license: "MIT",
      description: "Performant forms with easy validation",
      url: "https://react-hook-form.com/",
      licenseUrl: "https://github.com/react-hook-form/react-hook-form/blob/master/LICENSE",
      maintainer: "Bill Luo",
      usage: "Form handling and validation"
    },
    {
      name: "Zod",
      version: "3.23.8",
      category: "Development Tools",
      license: "MIT",
      description: "TypeScript-first schema validation",
      url: "https://zod.dev/",
      licenseUrl: "https://github.com/colinhacks/zod/blob/master/LICENSE",
      maintainer: "Colin McDonnell",
      usage: "Schema validation and type safety"
    },
    {
      name: "ESLint",
      version: "9.9.0",
      category: "Development Tools",
      license: "MIT",
      description: "JavaScript linter for code quality",
      url: "https://eslint.org/",
      licenseUrl: "https://github.com/eslint/eslint/blob/main/LICENSE",
      maintainer: "OpenJS Foundation",
      usage: "Code linting and quality assurance"
    },
    {
      name: "PostCSS",
      version: "8.4.47",
      category: "Development Tools",
      license: "MIT",
      description: "Tool for transforming CSS with JavaScript",
      url: "https://postcss.org/",
      licenseUrl: "https://github.com/postcss/postcss/blob/main/LICENSE",
      maintainer: "Andrey Sitnik",
      usage: "CSS processing and optimization"
    }
  ];

  const proprietaryLicenses = [
    {
      name: "Workbbench Platform",
      category: "Platform",
      license: "Proprietary",
      description: "Core platform code and proprietary algorithms",
      usage: "Main application logic and AI agent processing",
      restrictions: [
        "Commercial use restricted to licensed customers",
        "Modification and distribution prohibited",
        "Reverse engineering not permitted",
        "Source code access limited to authorized developers"
      ]
    },
    {
      name: "AI Model Integrations",
      category: "AI/ML",
      license: "Third-Party",
      description: "Licensed AI models and API integrations",
      usage: "Language models, image processing, and AI capabilities",
      restrictions: [
        "Subject to individual model provider terms",
        "Usage limits apply per subscription tier",
        "Commercial use restrictions may apply",
        "Data processing governed by provider policies"
      ]
    }
  ];

  const filteredLicenses = openSourceLicenses.filter(license => {
    const matchesSearch = license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         license.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || license.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'MIT': return 'bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30';
      case 'Apache 2.0': return 'bg-workbbench-blue/20 text-workbbench-blue border-workbbench-blue/30';
      case 'ISC': return 'bg-workbbench-purple/20 text-workbbench-purple border-workbbench-purple/30';
      case 'Proprietary': return 'bg-workbbench-orange/20 text-workbbench-orange border-workbbench-orange/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FileText className="h-12 w-12 text-workbbench-purple" />
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
                Licenses & Attribution
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Workbbench is built on top of amazing open-source software. We're grateful to the 
            developers and communities who make these tools possible.
          </p>
        </div>

        {/* License Summary Cards */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Code className="h-8 w-8 text-workbbench-green mx-auto mb-2" />
                <CardTitle className="text-lg">Open Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-workbbench-green mb-2">
                  {openSourceLicenses.length}
                </div>
                <p className="text-gray-300 text-sm">
                  Dependencies with permissive licenses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Shield className="h-8 w-8 text-workbbench-blue mx-auto mb-2" />
                <CardTitle className="text-lg">MIT Licensed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-workbbench-blue mb-2">
                  {openSourceLicenses.filter(l => l.license === 'MIT').length}
                </div>
                <p className="text-gray-300 text-sm">
                  Most permissive open source licenses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Zap className="h-8 w-8 text-workbbench-orange mx-auto mb-2" />
                <CardTitle className="text-lg">Apache 2.0</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-workbbench-orange mb-2">
                  {openSourceLicenses.filter(l => l.license === 'Apache 2.0').length}
                </div>
                <p className="text-gray-300 text-sm">
                  Patent-protective open source licenses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <FileText className="h-8 w-8 text-workbbench-purple mx-auto mb-2" />
                <CardTitle className="text-lg">Proprietary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-workbbench-purple mb-2">
                  {proprietaryLicenses.length}
                </div>
                <p className="text-gray-300 text-sm">
                  Platform-specific components
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-secondary/30 border border-white/10 rounded-md text-white"
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-black">{category}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Open Source Licenses */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Open Source Dependencies</h2>
          <p className="text-gray-300 mb-8">
            These open-source libraries and frameworks power various parts of our platform. 
            We're committed to giving back to the open-source community that makes our work possible.
          </p>
          
          <div className="space-y-4">
            {filteredLicenses.map((license, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{license.name}</h3>
                        <Badge className={getLicenseColor(license.license)}>
                          {license.license}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          v{license.version}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {license.category}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-300 mb-3">{license.description}</p>
                      
                      <div className="text-sm text-gray-400 mb-3">
                        <strong>Usage:</strong> {license.usage}
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        <strong>Maintained by:</strong> {license.maintainer}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(license.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Project
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(license.licenseUrl, '_blank')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View License
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLicenses.length === 0 && (
            <Card className="bg-secondary/30 border-white/10 text-center py-12">
              <CardContent>
                <p className="text-gray-300 text-lg">
                  No licenses found matching your search criteria.
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                  }}
                  className="mt-4"
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Proprietary Components */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Proprietary Components</h2>
          <p className="text-gray-300 mb-8">
            These components are proprietary to Workbbench and subject to our Terms of Service. 
            They include our core platform logic, AI algorithms, and licensed third-party integrations.
          </p>
          
          <div className="space-y-4">
            {proprietaryLicenses.map((component, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{component.name}</h3>
                        <Badge className={getLicenseColor(component.license)}>
                          {component.license}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {component.category}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-300 mb-3">{component.description}</p>
                      
                      <div className="text-sm text-gray-400 mb-3">
                        <strong>Usage:</strong> {component.usage}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">License Restrictions:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {component.restrictions.map((restriction, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-workbbench-orange mt-1">•</span>
                          {restriction}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* License Compliance */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">License Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-workbbench-green" />
                  Our Commitments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                    <span>We respect all open-source license requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                    <span>We provide proper attribution to all projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                    <span>We maintain accurate license documentation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                    <span>We regularly audit our dependencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                    <span>We contribute back to open-source projects when possible</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-workbbench-blue" />
                  Reporting Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  If you notice any license compliance issues or have questions about 
                  our use of open-source software, please contact us:
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Legal Team:</strong> legal@workbbench.ai
                  </div>
                  <div>
                    <strong>Open Source:</strong> opensource@workbbench.ai
                  </div>
                  <div>
                    <strong>Security:</strong> security@workbbench.ai
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Attribution */}
        <section>
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Thank You, Open Source Community</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Workbbench wouldn't be possible without the incredible work of open-source developers 
                around the world. We're committed to supporting and contributing back to the 
                community that makes innovation possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  View Our Open Source Projects
                </Button>
                <Button variant="outline">
                  Contribute to Open Source
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Licenses;
