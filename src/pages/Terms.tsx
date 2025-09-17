import React from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Shield, AlertTriangle, Users, CheckCircle } from 'lucide-react';

const Terms = () => {
  const lastUpdated = "December 15, 2024";
  const effectiveDate = "December 15, 2024";

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      content: [
        "By accessing or using Workbbench's services, platform, or website (collectively, the 'Service'), you agree to be bound by these Terms of Service ('Terms').",
        "If you disagree with any part of these terms, you may not access the Service.",
        "We reserve the right to update these Terms at any time. Changes will be effective immediately upon posting on this page."
      ]
    },
    {
      id: "description",
      title: "Description of Service",
      content: [
        "Workbbench provides an AI development and education platform that enables users to build AI agents, take courses, participate in community discussions, and access various AI development tools.",
        "Our Service includes educational content, development tools, community features, and cloud-based infrastructure for AI development.",
        "We may modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice to users."
      ]
    },
    {
      id: "accounts",
      title: "User Accounts",
      content: [
        "You must create an account to access certain features of our Service. You are responsible for maintaining the confidentiality of your account credentials.",
        "You must provide accurate and complete information when creating your account and keep your information up to date.",
        "You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use of your account.",
        "We reserve the right to suspend or terminate accounts that violate these Terms or are used for illegal or harmful activities."
      ]
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use Policy",
      content: [
        "You may use our Service only for lawful purposes and in accordance with these Terms.",
        "You agree not to use the Service to create, share, or distribute content that is illegal, harmful, threatening, abusive, defamatory, or violates any third-party rights.",
        "You shall not attempt to gain unauthorized access to any part of the Service, other user accounts, or connected systems.",
        "You shall not use the Service to develop AI systems that could cause harm to individuals or society, including but not limited to systems designed for surveillance, discrimination, or manipulation.",
        "Commercial use of educational content requires explicit permission. AI agents created using our platform may be used commercially subject to usage limits and subscription terms."
      ]
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property Rights",
      content: [
        "The Service and its original content, features, and functionality are owned by Workbbench and are protected by international copyright, trademark, and other intellectual property laws.",
        "You retain ownership of content you create using our platform, subject to our license to host and distribute such content as necessary to provide the Service.",
        "By uploading content to our platform, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and distribute your content for the purpose of operating and improving the Service.",
        "You may not use our trademarks, logos, or brand elements without our prior written consent."
      ]
    },
    {
      id: "user-content",
      title: "User-Generated Content",
      content: [
        "You are solely responsible for all content you submit, post, or display on or through the Service.",
        "You represent and warrant that you have all necessary rights to grant us the licenses described in these Terms.",
        "We reserve the right to remove any content that violates these Terms or that we deem inappropriate, without notice.",
        "We do not endorse or guarantee the accuracy of user-generated content and are not responsible for any harm resulting from such content."
      ]
    },
    {
      id: "privacy",
      title: "Privacy and Data Protection",
      content: [
        "Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information.",
        "By using our Service, you consent to the collection and use of your information as described in our Privacy Policy.",
        "We implement appropriate security measures to protect your personal information, but cannot guarantee absolute security.",
        "For users in the European Union, we comply with GDPR requirements and provide additional data protection rights."
      ]
    },
    {
      id: "payments",
      title: "Payments and Subscriptions",
      content: [
        "Certain features of our Service require payment. All fees are exclusive of taxes unless otherwise stated.",
        "Subscription fees are billed in advance and are non-refundable except as required by law or as explicitly stated in our refund policy.",
        "We may change our pricing at any time. Price changes for existing subscriptions will be communicated at least 30 days in advance.",
        "Your subscription will automatically renew unless you cancel before the renewal date. You may cancel your subscription at any time through your account settings."
      ]
    },
    {
      id: "disclaimers",
      title: "Disclaimers and Limitation of Liability",
      content: [
        "THE SERVICE IS PROVIDED 'AS IS' AND 'AS AVAILABLE' WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED.",
        "We do not warrant that the Service will be uninterrupted, secure, or error-free, or that any defects will be corrected.",
        "To the maximum extent permitted by law, Workbbench shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.",
        "Our total liability to you for any claims arising from these Terms or your use of the Service shall not exceed the amount you paid us in the twelve months preceding the claim."
      ]
    },
    {
      id: "indemnification",
      title: "Indemnification",
      content: [
        "You agree to indemnify and hold harmless Workbbench, its affiliates, officers, agents, and employees from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.",
        "This includes reasonable attorney's fees and costs incurred in defending against such claims.",
        "We reserve the right to assume the exclusive defense and control of any matter subject to indemnification by you."
      ]
    },
    {
      id: "termination",
      title: "Termination",
      content: [
        "You may terminate your account at any time by following the instructions in your account settings.",
        "We may suspend or terminate your account immediately if you violate these Terms or for any other reason at our sole discretion.",
        "Upon termination, your right to access the Service will cease immediately, and we may delete your account and associated data.",
        "Provisions that by their nature should survive termination will remain in effect, including intellectual property rights, disclaimers, and limitation of liability."
      ]
    },
    {
      id: "governing-law",
      title: "Governing Law and Jurisdiction",
      content: [
        "These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States.",
        "Any disputes arising from these Terms or your use of the Service will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.",
        "Notwithstanding the foregoing, we may seek injunctive relief in any court of competent jurisdiction to protect our intellectual property rights."
      ]
    },
    {
      id: "contact",
      title: "Contact Information",
      content: [
        "If you have any questions about these Terms, please contact us:",
        "Email: legal@workbbench.ai",
        "Address: Workbbench Inc., 123 Innovation Drive, San Francisco, CA 94105",
        "Phone: +1 (555) 123-WORK"
      ]
    }
  ];

  const quickNav = [
    { id: "acceptance", title: "Acceptance" },
    { id: "description", title: "Service Description" },
    { id: "accounts", title: "User Accounts" },
    { id: "acceptable-use", title: "Acceptable Use" },
    { id: "intellectual-property", title: "IP Rights" },
    { id: "privacy", title: "Privacy" },
    { id: "payments", title: "Payments" },
    { id: "disclaimers", title: "Disclaimers" },
    { id: "termination", title: "Termination" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <ScrollText className="h-12 w-12 text-workbbench-purple" />
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
                Terms of Service
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            These Terms of Service govern your use of Workbbench's platform and services. 
            Please read them carefully before using our services.
          </p>
          
          {/* Status Banner */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Badge className="bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30 px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Last Updated: {lastUpdated}
            </Badge>
            <Badge className="bg-workbbench-blue/20 text-workbbench-blue border-workbbench-blue/30 px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Effective: {effectiveDate}
            </Badge>
          </div>
        </div>

        {/* Important Notice */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-workbbench-orange/20 to-workbbench-purple/20 border-workbbench-orange/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-workbbench-orange mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Important Notice</h3>
                  <p className="text-gray-300">
                    These terms include important provisions that limit our liability and require 
                    disputes to be resolved through arbitration. Please review all sections carefully. 
                    By using our service, you acknowledge that you have read and agree to these terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Navigation */}
        <section className="mb-16">
          <Card className="bg-secondary/30 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-workbbench-blue" />
                Quick Navigation
              </CardTitle>
              <CardDescription>
                Jump to specific sections of our Terms of Service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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

        {/* Terms Sections */}
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
              {/* Table of Contents */}
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-2">
                    {sections.map((section, index) => (
                      <button
                        key={section.id}
                        onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                        className="flex items-start gap-3 w-full text-left p-2 rounded hover:bg-white/5 transition-colors"
                      >
                        <span className="text-workbbench-purple font-mono text-sm mt-0.5">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-gray-300 text-sm leading-tight">
                          {section.title}
                        </span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>

              {/* Key Points */}
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Key Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">You retain ownership of your content</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-workbbench-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Commercial use of AI agents is permitted</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-workbbench-orange mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Service provided "as is" with limitations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-workbbench-orange mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Disputes resolved through arbitration</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-workbbench-blue mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">30-day notice for subscription changes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Questions?</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Contact our legal team if you have questions about these terms.
                  </p>
                  <div className="text-workbbench-blue text-sm">
                    legal@workbbench.ai
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
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                By creating an account, you agree to these Terms of Service and our Privacy Policy. 
                Join thousands of developers building the future of AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-6 py-3 bg-workbbench-purple hover:bg-workbbench-purple/90 rounded-lg font-medium transition-colors">
                  Create Account
                </button>
                <button className="px-6 py-3 border border-white/20 hover:border-white/40 rounded-lg font-medium transition-colors">
                  View Privacy Policy
                </button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Terms;
