
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Brain, Star, Clock, ChevronRight, Search, Filter } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Education = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const courses = [
    {
      id: 1,
      title: 'AI Fundamentals',
      description: 'Learn the core concepts and terminology of artificial intelligence.',
      level: 'Beginner',
      duration: '2 hours',
      rating: 4.8,
      category: 'fundamentals',
      image: 'public/lovable-uploads/95416f57-99c0-4be8-bfd4-44a922488a0a.png'
    },
    {
      id: 2,
      title: 'Machine Learning Basics',
      description: 'Understand the principles of machine learning algorithms and applications.',
      level: 'Beginner',
      duration: '4 hours',
      rating: 4.5,
      category: 'machine-learning',
      image: 'public/lovable-uploads/9ddbcf91-609c-4db0-ab51-a05eedd5dda2.png'
    },
    {
      id: 3,
      title: 'Building LLM Applications',
      description: 'Create powerful applications with large language models.',
      level: 'Intermediate',
      duration: '6 hours',
      rating: 4.9,
      category: 'llm',
      image: 'public/lovable-uploads/1da0c7b6-e40c-4882-b3c6-b6046acc9c88.png'
    },
    {
      id: 4,
      title: 'Advanced Neural Networks',
      description: 'Dive deep into neural network architectures and optimization techniques.',
      level: 'Advanced',
      duration: '8 hours',
      rating: 4.7,
      category: 'machine-learning',
      image: 'public/lovable-uploads/949d23c1-3063-43d6-b587-d07020362e8a.png'
    },
    {
      id: 5,
      title: 'Agent Building Workshop',
      description: 'Learn how to build, test, and deploy AI agents using Workbbench tools.',
      level: 'Intermediate',
      duration: '5 hours',
      rating: 4.6,
      category: 'agent-modeling',
      image: 'public/lovable-uploads/b5ddb0a2-0693-49ef-94d7-b3877e7027b6.png'
    },
    {
      id: 6,
      title: 'AI Ethics and Responsibility',
      description: 'Understand the ethical considerations and responsible use of AI.',
      level: 'All Levels',
      duration: '3 hours',
      rating: 4.7,
      category: 'fundamentals',
      image: 'public/lovable-uploads/142d686d-da35-4bff-b2fa-603c878586c2.png'
    },
  ];

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-blue">AI Education Hub</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Master AI concepts through interactive courses, guided learning paths, and bite-sized video tutorials.
            </p>
            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-secondary/60 border border-white/10 text-white block w-full pl-10 pr-3 py-3 rounded-md"
                placeholder="Search for courses, tutorials, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Learning Paths */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8">Learning Paths</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-purple">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-workbbench-purple/20 mr-4">
                  <BookOpen className="h-6 w-6 text-workbbench-purple" />
                </div>
                <h3 className="text-xl font-semibold">AI Fundamentals</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Start your AI journey with the fundamental concepts, terminology, and applications.
              </p>
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>12 hours</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>6 courses</span>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-between">
                Start Learning
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-blue">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-workbbench-blue/20 mr-4">
                  <Code className="h-6 w-6 text-workbbench-blue" />
                </div>
                <h3 className="text-xl font-semibold">Machine Learning</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Learn machine learning algorithms, data preparation, and model training techniques.
              </p>
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>20 hours</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>10 courses</span>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-between">
                Start Learning
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-orange">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-workbbench-orange/20 mr-4">
                  <Brain className="h-6 w-6 text-workbbench-orange" />
                </div>
                <h3 className="text-xl font-semibold">Agent Building</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Master the art of building, testing, and deploying AI agents for various applications.
              </p>
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>15 hours</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>8 courses</span>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-between">
                Start Learning
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Courses */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Courses & Tutorials</h2>
            <div className="flex items-center mt-4 md:mt-0">
              <Button variant="outline" size="sm" className="mr-2">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort by: Popular
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" className="mb-8">
            <TabsList className="bg-secondary/50 mb-6">
              <TabsTrigger value="all">All Courses</TabsTrigger>
              <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
              <TabsTrigger value="machine-learning">Machine Learning</TabsTrigger>
              <TabsTrigger value="llm">LLMs</TabsTrigger>
              <TabsTrigger value="agent-modeling">Agent Modeling</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <Card key={course.id} className="bg-secondary/50 border-white/10 hover:border-white/20 transition-all">
                    <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{course.title}</CardTitle>
                          <CardDescription className="text-gray-400 mt-1">{course.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-gray-400 mb-2">
                        <div className="flex items-center mr-4">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          <span>{course.rating}</span>
                        </div>
                      </div>
                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-workbbench-purple/20 text-workbbench-purple">
                        {course.level}
                      </span>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Enroll Now</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="fundamentals">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses
                  .filter(course => course.category === 'fundamentals')
                  .map((course) => (
                    <Card key={course.id} className="bg-secondary/50 border-white/10 hover:border-white/20 transition-all">
                      <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
                        <img 
                          src={course.image} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{course.title}</CardTitle>
                            <CardDescription className="text-gray-400 mt-1">{course.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-gray-400 mb-2">
                          <div className="flex items-center mr-4">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-1 text-yellow-500" />
                            <span>{course.rating}</span>
                          </div>
                        </div>
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-workbbench-purple/20 text-workbbench-purple">
                          {course.level}
                        </span>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full">Enroll Now</Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            </TabsContent>
            
            {/* Similar TabsContent sections for other categories */}
          </Tabs>
          
          <div className="mt-8 text-center">
            <Button variant="outline" size="lg">
              Load More Courses
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 bg-workbbench-dark-purple border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 Workbbench. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Education;
