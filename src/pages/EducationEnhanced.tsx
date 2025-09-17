import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Brain, Star, Clock, ChevronRight, Search, Filter, Settings, Users, TrendingUp } from 'lucide-react';
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
import ModuleManagerSimple from '@/components/education/ModuleManagerSimple';

const EducationEnhanced = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  
  // Mock user role - in real app, get from auth context
  const userRole = 'instructor'; // 'basic' | 'instructor' | 'admin'
  const canManageModules = ['instructor', 'admin'].includes(userRole);

  const courses = [
    {
      id: 1,
      title: 'AI Fundamentals',
      description: 'Learn the core concepts and terminology of artificial intelligence.',
      level: 'Beginner',
      duration: '2 hours',
      rating: 4.8,
      category: 'fundamentals',
      image: '/api/placeholder/400/300',
      enrolled: 1250,
      lessons: 12
    },
    {
      id: 2,
      title: 'Machine Learning Basics',
      description: 'Understand the principles of machine learning algorithms and applications.',
      level: 'Beginner',
      duration: '4 hours',
      rating: 4.5,
      category: 'machine-learning',
      image: '/api/placeholder/400/300',
      enrolled: 950,
      lessons: 18
    },
    {
      id: 3,
      title: 'Building LLM Applications',
      description: 'Create powerful applications with large language models.',
      level: 'Intermediate',
      duration: '6 hours',
      rating: 4.9,
      category: 'machine-learning',
      image: '/api/placeholder/400/300',
      enrolled: 675,
      lessons: 24
    },
    {
      id: 4,
      title: 'Advanced Neural Networks',
      description: 'Dive deep into neural network architectures and optimization techniques.',
      level: 'Advanced',
      duration: '8 hours',
      rating: 4.7,
      category: 'advanced',
      image: '/api/placeholder/400/300',
      enrolled: 450,
      lessons: 30
    },
    {
      id: 5,
      title: 'Agent Building Workshop',
      description: 'Learn how to build, test, and deploy AI agents using modern tools.',
      level: 'Intermediate',
      duration: '5 hours',
      rating: 4.6,
      category: 'advanced',
      image: '/api/placeholder/400/300',
      enrolled: 325,
      lessons: 20
    },
    {
      id: 6,
      title: 'AI Ethics and Responsibility',
      description: 'Understand the ethical considerations and responsible use of AI.',
      level: 'All Levels',
      duration: '3 hours',
      rating: 4.7,
      category: 'fundamentals',
      image: '/api/placeholder/400/300',
      enrolled: 800,
      lessons: 15
    },
  ];

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalCourses: courses.length,
    totalEnrollments: courses.reduce((sum, course) => sum + course.enrolled, 0),
    averageRating: (courses.reduce((sum, course) => sum + course.rating, 0) / courses.length).toFixed(1),
    totalLessons: courses.reduce((sum, course) => sum + course.lessons, 0)
  };

  const CourseCard = ({ course }: { course: any }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <div className="relative overflow-hidden rounded-t-lg">
        <div className="w-full h-40 bg-secondary/20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2 text-primary">
              {course.category === 'fundamentals' && <BookOpen />}
              {course.category === 'machine-learning' && <Brain />}
              {course.category === 'advanced' && <Code />}
            </div>
            <p className="text-sm text-muted-foreground">Course Thumbnail</p>
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <Badge variant="secondary">
            {course.level}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded">
            <Star className="h-3 w-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium">{course.rating}</span>
          </div>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription>
          {course.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{course.lessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{course.enrolled.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span>{course.rating}/5</span>
          </div>
        </div>
        
        <Button className="w-full">
          Start Learning
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              AI Education Hub
            </h1>
            <p className="text-muted-foreground">
              Master artificial intelligence with comprehensive courses, interactive modules, and hands-on projects designed for all skill levels.
            </p>
          </div>
          
          {canManageModules && (
            <Button 
              onClick={() => setActiveTab('manage')}
              variant={activeTab === 'manage' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage Modules
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{stats.totalCourses}</p>
                </div>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments.toLocaleString()}</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating}/5</p>
                </div>
                <Star className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Lessons</p>
                  <p className="text-2xl font-bold">{stats.totalLessons}</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse">Browse Courses</TabsTrigger>
            <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
            <TabsTrigger value="machine-learning">Machine Learning</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            {canManageModules && <TabsTrigger value="manage">Manage Modules</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses, topics, or instructors..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            {/* All Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms or browse by category.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fundamentals" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">AI Fundamentals</h2>
              <p className="text-muted-foreground">Start your AI journey with essential concepts and terminology.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(c => c.category === 'fundamentals').map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="machine-learning" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Machine Learning</h2>
              <p className="text-muted-foreground">Dive into algorithms, data science, and predictive modeling.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(c => c.category === 'machine-learning').map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Advanced Topics</h2>
              <p className="text-muted-foreground">Master complex AI concepts and cutting-edge techniques.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(c => c.category === 'advanced').map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>

          {canManageModules && (
            <TabsContent value="manage" className="mt-6">
              <ModuleManagerSimple />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EducationEnhanced;