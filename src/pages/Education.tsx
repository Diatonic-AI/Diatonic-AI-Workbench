
import React, { useState } from 'react';
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Brain, Star, Clock, ChevronRight, Search, Filter, Users, TrendingUp, Award, GraduationCap } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const Education = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      description: 'Learn how to build, test, and deploy AI agents using Diatonic tools.',
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">
              AI Education Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Master AI concepts through interactive courses, guided learning paths, and tutorials
            </p>
          </div>
          <Button size="lg" className="shadow-lg">
            <BookOpen className="mr-2 h-4 w-4" />
            Browse Catalog
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">
                Available courses
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4,450</div>
              <p className="text-xs text-muted-foreground">
                Student enrollments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.7/5</div>
              <p className="text-xs text-muted-foreground">
                Course quality rating
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">119</div>
              <p className="text-xs text-muted-foreground">
                Learning modules
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search courses, tutorials, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Learning Paths */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Learning Paths
                </CardTitle>
                <CardDescription>
                  Structured learning journeys to master AI concepts
                </CardDescription>
              </div>
              <Badge variant="secondary">3 Paths</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">AI Fundamentals</CardTitle>
                      <CardDescription>Start your AI journey</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>12 hours</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>6 courses</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Start Learning
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Code className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Machine Learning</CardTitle>
                      <CardDescription>Build intelligent models</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>20 hours</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>10 courses</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Start Learning
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <Brain className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Agent Building</CardTitle>
                      <CardDescription>Create AI agents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>15 hours</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>8 courses</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Start Learning
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Courses and Tutorials */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              <BookOpen className="mr-2 h-4 w-4" />
              All Courses
            </TabsTrigger>
            <TabsTrigger value="fundamentals">
              Fundamentals
            </TabsTrigger>
            <TabsTrigger value="machine-learning">
              Machine Learning
            </TabsTrigger>
            <TabsTrigger value="llm">
              LLMs
            </TabsTrigger>
            <TabsTrigger value="agent-modeling">
              Agent Modeling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
                    <img 
                      src={course.image} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{course.rating}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="mb-4">
                      {course.level}
                    </Badge>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Enroll Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fundamentals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses
                .filter(course => course.category === 'fundamentals')
                .map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{course.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="mb-4">
                        {course.level}
                      </Badge>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Enroll Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Add similar TabsContent for other categories */}
          <TabsContent value="machine-learning" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses
                .filter(course => course.category === 'machine-learning')
                .map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{course.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {course.level}
                      </Badge>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Enroll Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="llm" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses
                .filter(course => course.category === 'llm')
                .map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{course.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {course.level}
                      </Badge>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Enroll Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="agent-modeling" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses
                .filter(course => course.category === 'agent-modeling')
                .map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{course.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {course.level}
                      </Badge>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Enroll Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Education;
