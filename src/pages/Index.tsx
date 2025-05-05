import { Link } from 'react-router-dom';
import { Book, Code, Sparkles, Users, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Navbar from '@/components/Navbar';
import FeatureCard from '@/components/FeatureCard';
import NodeFlowExample from '@/components/NodeFlowExample';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                The Ultimate <span className="text-gradient bg-gradient-to-r from-workbbench-purple via-workbbench-blue to-workbbench-orange">AI Ecosystem</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Build, learn, experiment, and connect with the AI community in one powerful platform.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/20">
                  Tour the Features
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-10">
              <div className="relative glass-morphism rounded-xl p-4">
                <div className="absolute top-4 right-4 flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-workbbench-red"></div>
                  <div className="w-3 h-3 rounded-full bg-workbbench-orange"></div>
                  <div className="w-3 h-3 rounded-full bg-workbbench-green"></div>
                </div>
                <NodeFlowExample />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Core Pillars Section */}
      <section className="py-16 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Four Core Pillars</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Workbbench combines education, powerful tools, experimentation and community to provide a complete AI ecosystem.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Book className="h-6 w-6 text-white" />}
              title="AI Education"
              description="Learn AI concepts through guided paths and interactive content designed for all skill levels."
              color="bg-workbbench-purple/20"
            />
            <FeatureCard 
              icon={<Code className="h-6 w-6 text-white" />}
              title="AI Toolset"
              description="Build powerful AI agents with our intuitive drag-and-drop interface and professional-grade tools."
              color="bg-workbbench-blue/20"
            />
            <FeatureCard 
              icon={<Sparkles className="h-6 w-6 text-white" />}
              title="AI Lab"
              description="Experiment with models, datasets, and simulations in a secure cloud environment."
              color="bg-workbbench-green/20"
            />
            <FeatureCard 
              icon={<Users className="h-6 w-6 text-white" />}
              title="Community Hub"
              description="Connect with AI enthusiasts, share your projects, and collaborate with experts."
              color="bg-workbbench-orange/20"
            />
          </div>
        </div>
      </section>
      
      {/* Features Highlight */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Workbbench combines the best of AI tools with a vibrant social platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-morphism rounded-xl p-6">
              <div className="text-workbbench-purple mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Intuitive Interface</h3>
              <p className="text-gray-300 mb-4">
                A Flowise.ai-inspired drag-and-drop interface that makes building AI agents simple and visual.
              </p>
              <Link to="/toolset" className="text-workbbench-purple flex items-center hover:underline">
                Explore the Interface
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            <div className="glass-morphism rounded-xl p-6">
              <div className="text-workbbench-blue mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional Tools</h3>
              <p className="text-gray-300 mb-4">
                DaVinci Resolve-inspired professional-grade tools for serious AI development and experimentation.
              </p>
              <Link to="/toolset" className="text-workbbench-blue flex items-center hover:underline">
                See the Tools
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            <div className="glass-morphism rounded-xl p-6">
              <div className="text-workbbench-orange mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Social Collaboration</h3>
              <p className="text-gray-300 mb-4">
                TikTok-style micro-learning videos, Reddit-like discussions, and powerful collaboration features.
              </p>
              <Link to="/community" className="text-workbbench-orange flex items-center hover:underline">
                Join the Community
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join the AI Revolution?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Start your journey with Workbbench today and become part of the global AI community.
            </p>
            <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 bg-workbbench-dark-purple">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-md mr-2 bg-gradient-flow animate-flow"></div>
                <span className="font-bold text-xl text-white">Workbbench</span>
              </div>
              <p className="text-gray-400 max-w-md">
                The comprehensive AI ecosystem for education, development, experimentation, and community.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4">Platform</h4>
                <ul className="space-y-2">
                  <li><Link to="/education" className="text-gray-400 hover:text-white">Education</Link></li>
                  <li><Link to="/toolset" className="text-gray-400 hover:text-white">Toolset</Link></li>
                  <li><Link to="/lab" className="text-gray-400 hover:text-white">AI Lab</Link></li>
                  <li><Link to="/community" className="text-gray-400 hover:text-white">Community</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Tutorials</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">API Reference</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Status</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Cookies</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Licenses</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400">© 2025 Workbbench. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
