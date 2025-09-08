import React from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Lightbulb, Zap, Globe, Shield, Heart, Award } from 'lucide-react';

const About = () => {
  const team = [
    {
      name: "Dr. Sarah Chen",
      role: "Co-Founder & CEO",
      bio: "Former AI researcher at Stanford, leading the vision for accessible AI education",
      avatar: "👩‍💼",
      expertise: ["AI Strategy", "Education", "Leadership"]
    },
    {
      name: "Alex Rodriguez",
      role: "Co-Founder & CTO",
      bio: "Ex-Google engineer with 15 years in distributed systems and machine learning",
      avatar: "👨‍💻",
      expertise: ["Architecture", "ML Engineering", "Scalability"]
    },
    {
      name: "Dr. Michael Zhang",
      role: "Head of AI Research",
      bio: "PhD in Machine Learning, published researcher with 50+ papers in top conferences",
      avatar: "👨‍🔬",
      expertise: ["Research", "Deep Learning", "NLP"]
    },
    {
      name: "Emma Thompson",
      role: "Head of Product",
      bio: "Former product manager at Microsoft Azure, passionate about developer experience",
      avatar: "👩‍💼",
      expertise: ["Product Strategy", "UX Design", "Developer Tools"]
    },
    {
      name: "David Kim",
      role: "VP of Engineering",
      bio: "Previously led engineering teams at AWS, expert in cloud-native architectures",
      avatar: "👨‍💻",
      expertise: ["Engineering", "Cloud Architecture", "DevOps"]
    },
    {
      name: "Dr. Lisa Wang",
      role: "Head of Education",
      bio: "Former professor at MIT, dedicated to making AI accessible to everyone",
      avatar: "👩‍🏫",
      expertise: ["Curriculum Design", "Pedagogy", "AI Ethics"]
    }
  ];

  const values = [
    {
      icon: <Heart className="h-8 w-8 text-workbbench-purple" />,
      title: "Accessibility First",
      description: "We believe AI should be accessible to everyone, regardless of technical background or resources."
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-workbbench-blue" />,
      title: "Innovation",
      description: "We push the boundaries of what's possible in AI education and development tools."
    },
    {
      icon: <Users className="h-8 w-8 text-workbbench-orange" />,
      title: "Community",
      description: "We foster a supportive community where learners and experts collaborate and grow together."
    },
    {
      icon: <Shield className="h-8 w-8 text-workbbench-green" />,
      title: "Ethics & Safety",
      description: "We are committed to responsible AI development and education with strong ethical foundations."
    },
    {
      icon: <Zap className="h-8 w-8 text-workbbench-purple" />,
      title: "Performance",
      description: "We build high-performance tools that scale with our users' growing needs and ambitions."
    },
    {
      icon: <Globe className="h-8 w-8 text-workbbench-blue" />,
      title: "Global Impact",
      description: "We aim to democratize AI education and create positive impact worldwide."
    }
  ];

  const milestones = [
    {
      year: "2023",
      title: "Company Founded",
      description: "Workbbench was founded with a vision to democratize AI education and development"
    },
    {
      year: "2024",
      title: "Platform Launch",
      description: "Launched our comprehensive AI ecosystem with education, tools, lab, and community features"
    },
    {
      year: "2024",
      title: "10K Users",
      description: "Reached our first 10,000 active users building AI agents and taking courses"
    },
    {
      year: "2024",
      title: "Series A",
      description: "Closed $15M Series A funding to accelerate platform development and global expansion"
    },
    {
      year: "2025",
      title: "Enterprise Launch",
      description: "Launched enterprise features for organizations building AI at scale"
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
              About Workbbench
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            We're building the world's most comprehensive AI ecosystem, combining education, 
            powerful development tools, experimentation platforms, and a vibrant community 
            to make artificial intelligence accessible to everyone.
          </p>
        </div>

        {/* Mission & Vision */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-8 w-8 text-workbbench-purple" />
                  <CardTitle className="text-2xl">Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  To democratize artificial intelligence by creating the most intuitive, 
                  comprehensive, and accessible platform for AI education and development. 
                  We believe that everyone should have the tools and knowledge to participate 
                  in the AI revolution, regardless of their background or experience level.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="h-8 w-8 text-workbbench-blue" />
                  <CardTitle className="text-2xl">Our Vision</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  A world where AI technology empowers human creativity and potential, 
                  where anyone can learn, build, and deploy AI solutions that make a 
                  positive impact. We envision a future where the barriers between 
                  idea and implementation are minimal, and innovation flourishes.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/20 transition-all">
                <CardHeader className="text-center">
                  {value.icon}
                  <CardTitle className="mt-4">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Journey</h2>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-workbbench-purple to-workbbench-orange rounded-full"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <Card className="bg-secondary/30 border-white/10">
                      <CardHeader>
                        <Badge className="w-fit bg-workbbench-purple/20 text-workbbench-purple border-workbbench-purple/30">
                          {milestone.year}
                        </Badge>
                        <CardTitle>{milestone.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300">{milestone.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Timeline Dot */}
                  <div className="w-4 h-4 bg-gradient-to-r from-workbbench-purple to-workbbench-blue rounded-full border-4 border-black z-10"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/20 transition-all">
                <CardHeader className="text-center">
                  <div className="text-6xl mb-4">{member.avatar}</div>
                  <CardTitle>{member.name}</CardTitle>
                  <CardDescription className="text-workbbench-blue font-medium">
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center mb-4">{member.bio}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {member.expertise.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-20">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
            <CardContent className="py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-workbbench-purple mb-2">50K+</div>
                  <div className="text-gray-300">Active Users</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-blue mb-2">500+</div>
                  <div className="text-gray-300">Courses</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-orange mb-2">1M+</div>
                  <div className="text-gray-300">AI Agents Built</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-green mb-2">150+</div>
                  <div className="text-gray-300">Countries</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Awards & Recognition */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Awards & Recognition</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                award: "Best AI Education Platform",
                organization: "EdTech Awards 2024",
                icon: "🏆"
              },
              {
                award: "Innovation in AI Tools",
                organization: "TechCrunch Disrupt 2024",
                icon: "🚀"
              },
              {
                award: "Top 10 AI Startups",
                organization: "VentureBeat 2024",
                icon: "⭐"
              },
              {
                award: "Best Developer Experience",
                organization: "Developer Choice Awards 2024",
                icon: "💎"
              }
            ].map((recognition, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">{recognition.icon}</div>
                  <CardTitle className="text-lg">{recognition.award}</CardTitle>
                  <CardDescription>{recognition.organization}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20 border-white/10">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Ready to be part of the AI revolution? Join thousands of learners, 
                builders, and innovators who are shaping the future with Workbbench.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Get Started Today
                </Button>
                <Button size="lg" variant="outline">
                  View Open Positions
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default About;
