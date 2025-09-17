import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, User, Clock, ArrowRight, TrendingUp } from 'lucide-react';

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    'AI Research', 
    'Product Updates',
    'Tutorials',
    'Industry Insights',
    'Company News',
    'Technical Deep Dives'
  ];

  const featuredPost = {
    id: 1,
    title: "The Future of AI Education: Building Tomorrow's Workforce Today",
    excerpt: "Exploring how AI education platforms are revolutionizing skill development and preparing professionals for an AI-driven future.",
    content: "As artificial intelligence continues to reshape industries worldwide, the demand for AI literacy has never been higher...",
    author: "Dr. Sarah Chen",
    authorRole: "CEO & Co-Founder",
    authorAvatar: "👩‍💼",
    publishDate: "2024-12-15",
    readTime: "8 min read",
    category: "Industry Insights",
    tags: ["AI Education", "Future of Work", "Skills Development"],
    featured: true,
    image: "🎯"
  };

  const posts = [
    {
      id: 2,
      title: "Introducing Multi-Modal Agent Builder: Visual + Text AI Made Simple",
      excerpt: "Our latest feature allows you to create agents that understand both images and text, opening up new possibilities for AI applications.",
      author: "Alex Rodriguez",
      authorRole: "CTO",
      authorAvatar: "👨‍💻",
      publishDate: "2024-12-12",
      readTime: "6 min read",
      category: "Product Updates",
      tags: ["Product Release", "Multi-Modal AI", "Agent Builder"],
      image: "🤖"
    },
    {
      id: 3,
      title: "Building Your First RAG Agent: A Complete Guide",
      excerpt: "Step-by-step tutorial on creating a Retrieval-Augmented Generation agent using our platform's tools and integrations.",
      author: "Dr. Michael Zhang",
      authorRole: "Head of AI Research",
      authorAvatar: "👨‍🔬",
      publishDate: "2024-12-10",
      readTime: "12 min read",
      category: "Tutorials",
      tags: ["RAG", "Tutorial", "Agent Development"],
      image: "📚"
    },
    {
      id: 4,
      title: "How Fortune 500 Companies Are Scaling AI with Workbbench Enterprise",
      excerpt: "Case studies and insights from enterprise customers who are successfully deploying AI solutions at scale.",
      author: "Emma Thompson",
      authorRole: "Head of Product",
      authorAvatar: "👩‍💼",
      publishDate: "2024-12-08",
      readTime: "10 min read",
      category: "Company News",
      tags: ["Enterprise", "Case Studies", "AI Adoption"],
      image: "🏢"
    },
    {
      id: 5,
      title: "Understanding Transformer Architecture: From Attention to Applications",
      excerpt: "Deep dive into the transformer architecture that powers modern AI, with practical examples and implementation tips.",
      author: "Dr. Lisa Wang",
      authorRole: "Head of Education",
      authorAvatar: "👩‍🏫",
      publishDate: "2024-12-05",
      readTime: "15 min read",
      category: "Technical Deep Dives",
      tags: ["Transformers", "Deep Learning", "Architecture"],
      image: "⚙️"
    },
    {
      id: 6,
      title: "AI Safety and Ethics: Building Responsible AI Systems",
      excerpt: "Exploring the principles and practices for developing AI systems that are safe, fair, and beneficial for society.",
      author: "Dr. Sarah Chen",
      authorRole: "CEO & Co-Founder",
      authorAvatar: "👩‍💼",
      publishDate: "2024-12-03",
      readTime: "9 min read",
      category: "AI Research",
      tags: ["AI Safety", "Ethics", "Responsible AI"],
      image: "🛡️"
    },
    {
      id: 7,
      title: "Community Spotlight: Amazing AI Projects from Our Users",
      excerpt: "Showcasing innovative AI projects built by our community members, from creative applications to business solutions.",
      author: "David Kim",
      authorRole: "VP of Engineering",
      authorAvatar: "👨‍💻",
      publishDate: "2024-12-01",
      readTime: "7 min read",
      category: "Company News",
      tags: ["Community", "Showcase", "User Projects"],
      image: "⭐"
    },
    {
      id: 8,
      title: "The Rise of Agent-Based AI: Why Every Developer Needs to Know This",
      excerpt: "Agent-based AI is transforming how we build applications. Learn what it means and why it matters for developers.",
      author: "Alex Rodriguez",
      authorRole: "CTO",
      authorAvatar: "👨‍💻",
      publishDate: "2024-11-28",
      readTime: "11 min read",
      category: "Industry Insights",
      tags: ["Agent AI", "Development", "Future Tech"],
      image: "🚀"
    }
  ];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const PostCard = ({ post, featured = false }) => (
    <Card className={`${
      featured 
        ? 'bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/20' 
        : 'bg-secondary/30 border-white/10'
    } hover:border-white/30 transition-all group cursor-pointer`}>
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            {post.category}
          </Badge>
          <div className="flex items-center text-gray-400 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(post.publishDate).toLocaleDateString()}
          </div>
        </div>
        
        {featured && (
          <div className="text-6xl text-center mb-4">{post.image}</div>
        )}
        
        <CardTitle className={`${featured ? 'text-2xl md:text-3xl' : 'text-xl'} group-hover:text-workbbench-purple transition-colors`}>
          {post.title}
        </CardTitle>
        
        <CardDescription className={`${featured ? 'text-base' : 'text-sm'} text-gray-300`}>
          {post.excerpt}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{post.authorAvatar}</div>
            <div>
              <div className="font-medium text-sm">{post.author}</div>
              <div className="text-gray-400 text-xs">{post.authorRole}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
              Workbbench Blog
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Insights, updates, and deep dives into AI technology, education, and the future of 
            artificial intelligence from our team of experts and industry leaders.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`${
                  selectedCategory === category 
                    ? 'bg-workbbench-purple hover:bg-workbbench-purple/90' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-workbbench-purple" />
            <h2 className="text-2xl font-bold">Featured Article</h2>
          </div>
          <PostCard post={featuredPost} featured={true} />
        </section>

        {/* Recent Posts */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Recent Articles</h2>
          
          {filteredPosts.length === 0 ? (
            <Card className="bg-secondary/30 border-white/10 text-center py-12">
              <CardContent>
                <p className="text-gray-300 text-lg">
                  No articles found matching your search criteria.
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Signup */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Get the latest insights, product updates, and AI research delivered 
                directly to your inbox. Join thousands of AI practitioners and enthusiasts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <Input
                  placeholder="Enter your email"
                  className="bg-black/30 border-white/20 text-white placeholder:text-gray-400"
                />
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Subscribe
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                No spam, unsubscribe at any time. We respect your privacy.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Archive & Categories */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Popular Topics */}
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Popular Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { topic: "Agent Development", count: 24 },
                    { topic: "AI Safety", count: 18 },
                    { topic: "Product Updates", count: 15 },
                    { topic: "Machine Learning", count: 12 },
                    { topic: "Community Projects", count: 10 }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                      <span className="text-gray-300">{item.topic}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.count} articles
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Updates */}
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "New GPT-4 Vision Integration",
                      date: "Dec 15, 2024",
                      type: "Feature Release"
                    },
                    {
                      title: "Community Challenge Winners",
                      date: "Dec 12, 2024",
                      type: "Community"
                    },
                    {
                      title: "Enterprise Security Update",
                      date: "Dec 10, 2024",
                      type: "Security"
                    },
                    {
                      title: "API v2.1 Documentation",
                      date: "Dec 8, 2024",
                      type: "Documentation"
                    }
                  ].map((update, index) => (
                    <div key={index} className="border-b border-white/10 pb-3 last:border-0">
                      <div className="font-medium text-sm text-white mb-1">{update.title}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">{update.date}</span>
                        <Badge variant="outline" className="text-xs">
                          {update.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Blog;
