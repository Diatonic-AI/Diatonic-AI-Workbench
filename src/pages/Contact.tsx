import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  MapPin, 
  Phone, 
  Clock, 
  MessageSquare, 
  Users, 
  Briefcase, 
  HelpCircle,
  Globe,
  Twitter,
  Github,
  Linkedin,
  ArrowRight
} from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      type: 'general'
    });
  };

  const contactTypes = [
    {
      id: 'general',
      label: 'General Inquiry',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Questions about our platform or services'
    },
    {
      id: 'support',
      label: 'Technical Support',
      icon: <HelpCircle className="h-5 w-5" />,
      description: 'Issues with your account or technical problems'
    },
    {
      id: 'sales',
      label: 'Sales & Partnerships',
      icon: <Briefcase className="h-5 w-5" />,
      description: 'Enterprise solutions and partnership opportunities'
    },
    {
      id: 'media',
      label: 'Media & Press',
      icon: <Users className="h-5 w-5" />,
      description: 'Press inquiries and media requests'
    }
  ];

  const offices = [
    {
      city: "San Francisco",
      address: "123 Mission Street, Suite 500",
      country: "United States",
      phone: "+1 (555) 123-4567",
      email: "sf@workbbench.ai",
      hours: "9:00 AM - 6:00 PM PST",
      flag: "🇺🇸"
    },
    {
      city: "New York",
      address: "456 Broadway, Floor 12",
      country: "United States", 
      phone: "+1 (555) 234-5678",
      email: "ny@workbbench.ai",
      hours: "9:00 AM - 6:00 PM EST",
      flag: "🇺🇸"
    },
    {
      city: "London",
      address: "789 King's Cross Road",
      country: "United Kingdom",
      phone: "+44 20 1234 5678",
      email: "london@workbbench.ai", 
      hours: "9:00 AM - 6:00 PM GMT",
      flag: "🇬🇧"
    },
    {
      city: "Singapore",
      address: "101 Marina Bay Drive",
      country: "Singapore",
      phone: "+65 6123 4567",
      email: "sg@workbbench.ai",
      hours: "9:00 AM - 6:00 PM SGT",
      flag: "🇸🇬"
    }
  ];

  const socialLinks = [
    {
      platform: "Twitter",
      icon: <Twitter className="h-5 w-5" />,
      url: "https://twitter.com/workbbench",
      handle: "@workbbench"
    },
    {
      platform: "LinkedIn",
      icon: <Linkedin className="h-5 w-5" />,
      url: "https://linkedin.com/company/workbbench",
      handle: "/company/workbbench"
    },
    {
      platform: "GitHub",
      icon: <Github className="h-5 w-5" />,
      url: "https://github.com/workbbench",
      handle: "/workbbench"
    },
    {
      platform: "Discord",
      icon: <MessageSquare className="h-5 w-5" />,
      url: "https://discord.gg/workbbench",
      handle: "Join our community"
    }
  ];

  const quickActions = [
    {
      title: "Schedule a Demo",
      description: "See our platform in action with a personalized demo",
      action: "Book Demo",
      icon: "📅"
    },
    {
      title: "Join Our Community",
      description: "Connect with thousands of AI developers and educators",
      action: "Join Discord",
      icon: "💬"
    },
    {
      title: "Enterprise Inquiry",
      description: "Learn about our enterprise solutions and pricing",
      action: "Contact Sales",
      icon: "🏢"
    },
    {
      title: "Technical Support",
      description: "Get help with technical issues or account problems",
      action: "Get Support",
      icon: "🔧"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
              Get in Touch
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Have questions about our platform? Want to partner with us? Or just want to say hello? 
            We'd love to hear from you. Our team is here to help you succeed with AI.
          </p>
        </div>

        {/* Quick Actions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/30 transition-all group cursor-pointer">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-3">{action.icon}</div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-workbbench-purple hover:bg-workbbench-purple/90 group-hover:scale-105 transition-transform">
                    {action.action}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Send Us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">What can we help you with?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contactTypes.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.type === type.id 
                            ? 'border-workbbench-purple bg-workbbench-purple/10' 
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type.id}
                          checked={formData.type === type.id}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        {type.icon}
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-gray-400 text-xs">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2">
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
                    placeholder="Tell us more about what you need help with..."
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-workbbench-purple hover:bg-workbbench-purple/90"
                >
                  Send Message
                  <Mail className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Other Ways to Reach Us</h2>
              
              {/* General Contact */}
              <Card className="bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/10 mb-8">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">General Contact</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-workbbench-purple" />
                      <span>hello@workbbench.ai</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-workbbench-blue" />
                      <span>+1 (555) 123-WORK</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-workbbench-orange" />
                      <span>Mon-Fri, 9:00 AM - 6:00 PM PST</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Department Contacts */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold">Department Contacts</h3>
                {[
                  { dept: "Sales", email: "sales@workbbench.ai", desc: "Enterprise solutions and pricing" },
                  { dept: "Support", email: "support@workbbench.ai", desc: "Technical support and troubleshooting" },
                  { dept: "Partnerships", email: "partners@workbbench.ai", desc: "Business partnerships and integrations" },
                  { dept: "Press", email: "press@workbbench.ai", desc: "Media inquiries and press releases" }
                ].map((contact, index) => (
                  <Card key={index} className="bg-secondary/30 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{contact.dept}</div>
                          <div className="text-gray-400 text-sm">{contact.desc}</div>
                        </div>
                        <div className="text-workbbench-blue text-sm">{contact.email}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map((social, index) => (
                    <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/30 transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {social.icon}
                          <div>
                            <div className="font-medium text-sm">{social.platform}</div>
                            <div className="text-gray-400 text-xs">{social.handle}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Offices */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Global Offices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offices.map((office, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/30 transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{office.flag}</span>
                    <CardTitle className="text-lg">{office.city}</CardTitle>
                  </div>
                  <CardDescription className="text-gray-300">
                    {office.country}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-workbbench-purple mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{office.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-workbbench-blue flex-shrink-0" />
                      <span className="text-gray-300">{office.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-workbbench-orange flex-shrink-0" />
                      <span className="text-gray-300">{office.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-workbbench-green flex-shrink-0" />
                      <span className="text-gray-300">{office.hours}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  question: "How quickly can I expect a response?",
                  answer: "We typically respond to general inquiries within 24 hours during business days. For technical support, we aim to respond within 4 hours for priority issues."
                },
                {
                  question: "Do you offer phone support?",
                  answer: "Phone support is available for Enterprise customers. All other users can reach us via email, chat, or through our community Discord."
                },
                {
                  question: "Can I schedule a demo of the platform?",
                  answer: "Absolutely! Click the 'Schedule a Demo' button above or email sales@workbbench.ai to book a personalized demonstration of our platform."
                },
                {
                  question: "How do I report a security issue?",
                  answer: "Please email security@workbbench.ai for any security-related concerns. We take security seriously and will respond promptly to all reports."
                },
                {
                  question: "Do you have a bug bounty program?",
                  answer: "Yes! We have an active bug bounty program. Visit our security page or email security@workbbench.ai for more information about our responsible disclosure process."
                }
              ].map((faq, index) => (
                <Card key={index} className="bg-secondary/30 border-white/10">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">{faq.question}</h3>
                    <p className="text-gray-300">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join thousands of developers, educators, and organizations who are building 
                the future of AI with Workbbench. Start your journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Start Free Trial
                </Button>
                <Button size="lg" variant="outline">
                  Schedule Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Contact;
