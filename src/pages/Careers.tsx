import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  Heart, 
  Coffee, 
  Zap, 
  Globe,
  GraduationCap,
  Shield,
  ArrowRight 
} from 'lucide-react';

const Careers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  const departments = ['All', 'Engineering', 'Product', 'AI Research', 'Design', 'Sales', 'Marketing', 'Operations'];
  const locations = ['All', 'Remote', 'San Francisco', 'New York', 'London', 'Berlin', 'Singapore'];

  const openPositions = [
    {
      id: 1,
      title: "Senior AI Research Scientist",
      department: "AI Research",
      location: "San Francisco",
      type: "Full-time",
      level: "Senior",
      description: "Lead cutting-edge AI research in large language models, multimodal AI, and agent architectures.",
      requirements: ["PhD in AI/ML/CS", "5+ years research experience", "Published papers in top venues"],
      salary: "$200k - $350k",
      posted: "3 days ago"
    },
    {
      id: 2,
      title: "Full Stack Engineer - Platform",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      level: "Mid-Senior",
      description: "Build and scale our core platform infrastructure serving millions of AI developers worldwide.",
      requirements: ["5+ years full-stack experience", "React, Node.js, AWS", "System design experience"],
      salary: "$140k - $220k",
      posted: "1 week ago"
    },
    {
      id: 3,
      title: "Product Manager - AI Tools",
      department: "Product",
      location: "San Francisco",
      type: "Full-time",
      level: "Mid-Senior",
      description: "Drive product strategy for our AI development tools and agent builder platform.",
      requirements: ["3+ years product management", "B2B SaaS experience", "Technical background"],
      salary: "$150k - $250k",
      posted: "2 days ago"
    },
    {
      id: 4,
      title: "Senior UX Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      level: "Senior",
      description: "Design intuitive experiences for complex AI workflows and educational content.",
      requirements: ["5+ years UX design", "B2B product experience", "Design systems expertise"],
      salary: "$130k - $200k",
      posted: "5 days ago"
    },
    {
      id: 5,
      title: "DevOps Engineer",
      department: "Engineering",
      location: "London",
      type: "Full-time",
      level: "Mid-Senior",
      description: "Scale our infrastructure to support global AI workloads and ensure platform reliability.",
      requirements: ["4+ years DevOps experience", "Kubernetes, AWS", "CI/CD expertise"],
      salary: "£80k - £130k",
      posted: "1 week ago"
    },
    {
      id: 6,
      title: "Enterprise Sales Executive",
      department: "Sales",
      location: "New York",
      type: "Full-time",
      level: "Senior",
      description: "Drive enterprise adoption of our AI platform with Fortune 500 companies.",
      requirements: ["5+ years enterprise sales", "B2B SaaS experience", "AI/ML market knowledge"],
      salary: "$120k - $180k + commission",
      posted: "4 days ago"
    }
  ];

  const benefits = [
    {
      icon: <Heart className="h-8 w-8 text-workbbench-purple" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, dental, vision, and mental health support"
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-workbbench-blue" />,
      title: "Learning & Development",
      description: "Annual learning budget, conference attendance, and internal training programs"
    },
    {
      icon: <Coffee className="h-8 w-8 text-workbbench-orange" />,
      title: "Work-Life Balance",
      description: "Flexible hours, unlimited PTO, and home office stipend for remote workers"
    },
    {
      icon: <Zap className="h-8 w-8 text-workbbench-green" />,
      title: "Equity & Compensation",
      description: "Competitive salary, equity package, and performance-based bonuses"
    },
    {
      icon: <Globe className="h-8 w-8 text-workbbench-purple" />,
      title: "Global Community",
      description: "Work with talented people worldwide, annual team retreats, and cultural exchange"
    },
    {
      icon: <Shield className="h-8 w-8 text-workbbench-blue" />,
      title: "Security & Stability",
      description: "401k matching, life insurance, disability coverage, and job security"
    }
  ];

  const values = [
    {
      title: "Innovation First",
      description: "We push boundaries and aren't afraid to tackle hard problems that matter.",
      icon: "🚀"
    },
    {
      title: "Inclusive Culture",
      description: "We celebrate diversity and create an environment where everyone thrives.",
      icon: "🤝"
    },
    {
      title: "Rapid Growth",
      description: "Join us in scaling from startup to global AI platform leader.",
      icon: "📈"
    },
    {
      title: "Impact Driven",
      description: "Your work directly impacts millions of developers and learners worldwide.",
      icon: "🌍"
    }
  ];

  const filteredPositions = openPositions.filter(position => {
    const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'All' || position.department === selectedDepartment;
    const matchesLocation = selectedLocation === 'All' || position.location === selectedLocation;
    return matchesSearch && matchesDepartment && matchesLocation;
  });

  const JobCard = ({ job }) => (
    <Card className="bg-secondary/30 border-white/10 hover:border-white/30 transition-all group cursor-pointer">
      <CardHeader>
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {job.department}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {job.level}
            </Badge>
          </div>
          <div className="text-gray-400 text-sm">{job.posted}</div>
        </div>
        
        <CardTitle className="group-hover:text-workbbench-purple transition-colors">
          {job.title}
        </CardTitle>
        
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {job.location}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {job.type}
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {job.salary}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-300 mb-4">{job.description}</p>
        
        <div className="mb-4">
          <h4 className="font-medium text-sm mb-2">Key Requirements:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            {job.requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-workbbench-purple mt-1">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
        
        <Button className="w-full bg-workbbench-purple hover:bg-workbbench-purple/90">
          Apply Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
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
              Join Our Mission
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Help us democratize AI and build the future of artificial intelligence education. 
            Join a team of world-class engineers, researchers, and innovators who are passionate 
            about making AI accessible to everyone.
          </p>
        </div>

        {/* Why Work Here */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why Workbbench?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 text-center">
                <CardHeader>
                  <div className="text-4xl mb-3">{value.icon}</div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    {benefit.icon}
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Open Positions</h2>
          
          {/* Search and Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary/30 border-white/10 text-white placeholder:text-gray-400"
                />
              </div>
              
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 bg-secondary/30 border border-white/10 rounded-md text-white"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept} className="bg-black">{dept}</option>
                ))}
              </select>
              
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 bg-secondary/30 border border-white/10 rounded-md text-white"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc} className="bg-black">{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jobs Grid */}
          {filteredPositions.length === 0 ? (
            <Card className="bg-secondary/30 border-white/10 text-center py-12">
              <CardContent>
                <p className="text-gray-300 text-lg mb-4">
                  No positions found matching your criteria.
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDepartment('All');
                    setSelectedLocation('All');
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredPositions.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* Team Stats */}
        <section className="mb-20">
          <Card className="bg-gradient-to-r from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold text-center mb-8">Our Growing Team</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-workbbench-purple mb-2">150+</div>
                  <div className="text-gray-300">Team Members</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-blue mb-2">25+</div>
                  <div className="text-gray-300">Countries</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-orange mb-2">40%</div>
                  <div className="text-gray-300">Women in Tech</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-workbbench-green mb-2">95%</div>
                  <div className="text-gray-300">Employee NPS</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Application Process */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Application Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Apply",
                description: "Submit your application with resume and cover letter"
              },
              {
                step: "02", 
                title: "Screen",
                description: "Initial phone/video screening with our recruiting team"
              },
              {
                step: "03",
                title: "Interview",
                description: "Technical and behavioral interviews with team members"
              },
              {
                step: "04",
                title: "Offer",
                description: "Reference checks, offer discussion, and onboarding"
              }
            ].map((phase, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 text-center">
                <CardHeader>
                  <div className="text-4xl font-bold text-workbbench-purple mb-2">{phase.step}</div>
                  <CardTitle>{phase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">{phase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Culture & Values */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Culture</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Users className="h-6 w-6 text-workbbench-purple mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Collaborative Environment</h3>
                    <p className="text-gray-300">We believe the best ideas come from diverse teams working together. Our flat organizational structure encourages open communication and rapid decision-making.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Zap className="h-6 w-6 text-workbbench-blue mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Move Fast & Learn</h3>
                    <p className="text-gray-300">We iterate quickly, learn from failures, and continuously improve. We're not afraid to experiment and take calculated risks to achieve breakthroughs.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Heart className="h-6 w-6 text-workbbench-orange mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Purpose Driven</h3>
                    <p className="text-gray-300">Every team member understands how their work contributes to our mission of democratizing AI education and empowering the next generation of AI builders.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 border-white/10 h-full">
                <CardContent className="py-12 text-center">
                  <div className="text-8xl mb-6">🌟</div>
                  <h3 className="text-2xl font-bold mb-4">Ready to Make an Impact?</h3>
                  <p className="text-gray-300 mb-6">
                    Join us in building the future of AI education and development. 
                    Your work will directly impact millions of learners and developers worldwide.
                  </p>
                  <Button size="lg" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                    View All Positions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <Card className="bg-secondary/30 border-white/10">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Don't See the Right Role?</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                We're always looking for exceptional talent. Send us your resume and 
                let us know how you'd like to contribute to our mission.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-workbbench-blue hover:bg-workbbench-blue/90">
                  Send Your Resume
                </Button>
                <Button size="lg" variant="outline">
                  careers@workbbench.ai
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Careers;
