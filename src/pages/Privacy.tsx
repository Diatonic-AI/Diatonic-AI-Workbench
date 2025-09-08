import React from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Lock, Database, Globe, CheckCircle, AlertTriangle } from 'lucide-react';

const Privacy = () => {
  const lastUpdated = "December 15, 2024";
  const effectiveDate = "December 15, 2024";

  const sections = [
    {
      id: "overview",
      title: "Privacy Overview",
      content: [
        "This Privacy Policy describes how Workbbench ('we', 'our', or 'us') collects, uses, and shares your personal information when you use our AI development and education platform.",
        "We are committed to protecting your privacy and being transparent about our data practices. This policy applies to all users of our services, regardless of location.",
        "By using our services, you consent to the collection and use of information in accordance with this policy."
      ]
    },
    {
      id: "information-collected",
      title: "Information We Collect",
      content: [
        "Account Information: When you create an account, we collect your name, email address, username, and password. For enterprise accounts, we may also collect company information.",
        "Profile Information: You may choose to provide additional information such as your bio, profile picture, location, and professional background.",
        "Usage Data: We automatically collect information about how you interact with our platform, including pages visited, features used, time spent, and click patterns.",
        "Content Data: We collect and store the content you create, including AI agents, course progress, forum posts, and uploaded files.",
        "Device and Technical Information: We collect information about your device, browser, IP address, operating system, and technical specifications.",
        "Communication Data: When you contact us, we may keep records of your communications with our support team."
      ]
    },
    {
      id: "how-we-use",
      title: "How We Use Your Information",
      content: [
        "Service Provision: To provide, maintain, and improve our platform and services, including personalizing your experience and providing customer support.",
        "Account Management: To create and manage your account, authenticate your identity, and process payments.",
        "Communication: To send you service-related notifications, updates, security alerts, and marketing communications (with your consent).",
        "Analytics and Improvement: To analyze usage patterns, improve our platform, develop new features, and understand user preferences.",
        "Security: To protect our platform and users from fraud, abuse, and security threats.",
        "Legal Compliance: To comply with legal obligations, enforce our terms of service, and protect our rights and interests."
      ]
    },
    {
      id: "information-sharing",
      title: "Information Sharing and Disclosure",
      content: [
        "Service Providers: We may share information with trusted third-party service providers who help us operate our platform, such as cloud hosting, payment processing, and analytics services.",
        "Business Transfers: In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity.",
        "Legal Requirements: We may disclose information if required by law, court order, or government request, or to protect our rights and safety.",
        "Consent: We may share information with your explicit consent or at your direction.",
        "Public Information: Content you choose to make public (such as forum posts or public profiles) may be visible to other users and the general public.",
        "We do not sell your personal information to third parties for their marketing purposes."
      ]
    },
    {
      id: "data-security",
      title: "Data Security",
      content: [
        "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
        "Data Encryption: We use encryption to protect sensitive data both in transit and at rest.",
        "Access Controls: We maintain strict access controls and regularly review who has access to personal information.",
        "Regular Security Audits: We conduct regular security assessments and audits to identify and address potential vulnerabilities.",
        "Incident Response: We have procedures in place to respond to security incidents and will notify affected users as required by law.",
        "While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure."
      ]
    },
    {
      id: "data-retention",
      title: "Data Retention",
      content: [
        "We retain your personal information only as long as necessary to provide our services and fulfill the purposes described in this policy.",
        "Account Data: We retain account information for as long as your account is active or as needed to provide services.",
        "Content Data: User-generated content is retained according to your account settings and our terms of service.",
        "Usage Data: Anonymous usage data may be retained for longer periods for analytics purposes.",
        "Legal Requirements: We may retain information longer if required by law or for legitimate business purposes.",
        "You can request deletion of your account and associated data at any time, subject to certain legal and operational requirements."
      ]
    },
    {
      id: "your-rights",
      title: "Your Privacy Rights",
      content: [
        "Access: You have the right to access the personal information we hold about you.",
        "Correction: You can update or correct your personal information through your account settings.",
        "Deletion: You can request deletion of your account and associated personal information.",
        "Portability: You can request a copy of your data in a structured, machine-readable format.",
        "Restriction: You can request that we limit the processing of your personal information in certain circumstances.",
        "Objection: You can object to the processing of your personal information for marketing purposes.",
        "To exercise these rights, contact us at privacy@workbbench.ai. We will respond to your request within 30 days."
      ]
    },
    {
      id: "cookies-tracking",
      title: "Cookies and Tracking Technologies",
      content: [
        "We use cookies and similar tracking technologies to enhance your experience and collect usage information.",
        "Essential Cookies: Necessary for the platform to function properly, including authentication and security features.",
        "Analytics Cookies: Help us understand how users interact with our platform and improve our services.",
        "Preference Cookies: Remember your settings and preferences to personalize your experience.",
        "Marketing Cookies: Used to deliver relevant advertisements and measure their effectiveness (with your consent).",
        "You can manage your cookie preferences through your browser settings or our cookie consent manager."
      ]
    },
    {
      id: "international-transfers",
      title: "International Data Transfers",
      content: [
        "Our platform operates globally, and your information may be transferred to and processed in countries other than your own.",
        "We ensure that international transfers comply with applicable data protection laws and implement appropriate safeguards.",
        "For EU users, we use Standard Contractual Clauses and other approved transfer mechanisms to protect your data.",
        "We may transfer data to countries with adequate data protection laws or implement additional safeguards where necessary."
      ]
    },
    {
      id: "children-privacy",
      title: "Children's Privacy",
      content: [
        "Our platform is not intended for children under 13 years of age, and we do not knowingly collect personal information from children under 13.",
        "If we become aware that we have collected information from a child under 13, we will take steps to delete such information promptly.",
        "Users between 13 and 18 must have parental consent to use our services.",
        "Parents or guardians can contact us if they believe their child has provided personal information without consent."
      ]
    },
    {
      id: "changes-policy",
      title: "Changes to This Policy",
      content: [
        "We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.",
        "We will notify you of material changes by posting the updated policy on our website and sending you an email notification.",
        "Changes will be effective immediately upon posting, unless otherwise specified.",
        "Your continued use of our services after changes are posted constitutes acceptance of the updated policy."
      ]
    },
    {
      id: "contact-info",
      title: "Contact Information",
      content: [
        "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:",
        "Email: privacy@workbbench.ai",
        "Data Protection Officer: dpo@workbbench.ai",
        "Address: Workbbench Inc., 123 Innovation Drive, San Francisco, CA 94105",
        "Phone: +1 (555) 123-WORK",
        "EU Representative: For EU users, contact our EU representative at eu-rep@workbbench.ai"
      ]
    }
  ];

  const quickNav = [
    { id: "overview", title: "Overview" },
    { id: "information-collected", title: "Data Collection" },
    { id: "how-we-use", title: "Data Usage" },
    { id: "information-sharing", title: "Data Sharing" },
    { id: "data-security", title: "Security" },
    { id: "your-rights", title: "Your Rights" },
    { id: "cookies-tracking", title: "Cookies" },
    { id: "international-transfers", title: "Data Transfers" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="h-12 w-12 text-workbbench-purple" />
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
                Privacy Policy
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Your privacy is important to us. This policy explains how we collect, use, 
            and protect your personal information when you use Workbbench.
          </p>
          
          {/* Status Banner */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Badge className="bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30 px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Last Updated: {lastUpdated}
            </Badge>
            <Badge className="bg-workbbench-blue/20 text-workbbench-blue border-workbbench-blue/30 px-4 py-2">
              <Eye className="h-4 w-4 mr-2" />
              Effective: {effectiveDate}
            </Badge>
          </div>
        </div>

        {/* Privacy Principles */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our Privacy Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Lock className="h-8 w-8 text-workbbench-purple mx-auto mb-2" />
                <CardTitle className="text-lg">Data Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">
                  We use industry-standard security measures to protect your personal information.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Eye className="h-8 w-8 text-workbbench-blue mx-auto mb-2" />
                <CardTitle className="text-lg">Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">
                  We clearly explain what data we collect and how we use it.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Database className="h-8 w-8 text-workbbench-orange mx-auto mb-2" />
                <CardTitle className="text-lg">Data Minimization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">
                  We only collect and retain data that is necessary for our services.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/30 border-white/10 text-center">
              <CardHeader>
                <Globe className="h-8 w-8 text-workbbench-green mx-auto mb-2" />
                <CardTitle className="text-lg">Global Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">
                  We comply with GDPR, CCPA, and other international privacy laws.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Navigation */}
        <section className="mb-16">
          <Card className="bg-secondary/30 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-workbbench-blue" />
                Quick Navigation
              </CardTitle>
              <CardDescription>
                Jump to specific sections of our Privacy Policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {quickNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-left p-3 rounded-lg border border-white/10 hover:border-workbbench-purple/50 hover:bg-workbbench-purple/10 transition-all"
                  >
                    <div className="font-medium text-sm">{item.title}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Privacy Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id}>
                <Card className="bg-secondary/30 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Badge className="bg-workbbench-purple/20 text-workbbench-purple border-workbbench-purple/30">
                        {String(index + 1).padStart(2, '0')}
                      </Badge>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {section.content.map((paragraph, idx) => (
                        <p key={idx} className="text-gray-300 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Key Rights Summary */}
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Your Rights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Access your personal data</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Correct inaccurate information</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Request data deletion</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Export your data</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Opt-out of marketing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Categories */}
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Data We Collect</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 text-workbbench-blue mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Account & profile information</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 text-workbbench-blue mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Usage & interaction data</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 text-workbbench-blue mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Content & creations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 text-workbbench-blue mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Device & technical data</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact DPO */}
              <Card className="bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 text-workbbench-purple mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Data Protection Officer</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Questions about your privacy rights or data processing?
                  </p>
                  <div className="text-workbbench-blue text-sm">
                    dpo@workbbench.ai
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <section className="mt-16">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Questions About Your Privacy?</h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                We're committed to transparency and protecting your privacy. Contact our privacy team 
                if you have any questions or want to exercise your privacy rights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-6 py-3 bg-workbbench-purple hover:bg-workbbench-purple/90 rounded-lg font-medium transition-colors">
                  Contact Privacy Team
                </button>
                <button className="px-6 py-3 border border-white/20 hover:border-white/40 rounded-lg font-medium transition-colors">
                  Manage Cookie Preferences
                </button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
