
import React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, BookOpen, Users, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data for recent projects
const RECENT_PROJECTS = [
  {
    id: 1,
    name: "Sentiment Analysis",
    description: "Neural network for sentiment classification",
    lastModified: "2 hours ago",
  },
  {
    id: 2,
    name: "Customer Support Bot",
    description: "LLM-based chatbot for support queries",
    lastModified: "1 day ago",
  },
  {
    id: 3,
    name: "Image Recognition",
    description: "CNN for recognizing objects in images",
    lastModified: "3 days ago",
  },
];

// Mock data for activity feed
const ACTIVITY_FEED = [
  {
    id: 1,
    type: "project",
    message: "Your experiment 'Training Run 3' has completed with 92% accuracy",
    time: "1 hour ago",
  },
  {
    id: 2,
    type: "community",
    message: "NLP Enthusiasts group has 5 new posts",
    time: "3 hours ago",
  },
  {
    id: 3,
    type: "tutorial",
    message: "New tutorial: 'Advanced Prompt Engineering' is now available",
    time: "1 day ago",
  },
];

// Mock data for recommendations
const RECOMMENDATIONS = [
  {
    id: 1,
    title: "Intro to Neural Networks",
    type: "tutorial",
    icon: BookOpen,
  },
  {
    id: 2,
    title: "NLP Enthusiasts",
    type: "group",
    icon: Users,
  },
  {
    id: 3,
    title: "Data Visualization Basics",
    type: "tutorial",
    icon: BarChart2,
  },
];

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's a summary of your recent activity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>
                  Pick up where you left off
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {RECENT_PROJECTS.map((project) => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last modified: {project.lastModified}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Link to="/toolset">
                    <Button variant="outline" className="w-full">
                      <Code className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  </Link>
                  <Link to="/community">
                    <Button variant="outline" className="w-full">
                      <Users className="mr-2 h-4 w-4" />
                      Join Community
                    </Button>
                  </Link>
                  <Link to="/education">
                    <Button variant="outline" className="w-full">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Start Learning
                    </Button>
                  </Link>
                  <Link to="/observatory">
                    <Button variant="outline" className="w-full">
                      <BarChart2 className="mr-2 h-4 w-4" />
                      Visualize Data
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>AI Basics</span>
                        <span>2/5 completed</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full">
                        <div className="h-2 bg-primary rounded-full w-[40%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Prompt Engineering</span>
                        <span>1/3 completed</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full">
                        <div className="h-2 bg-primary rounded-full w-[33%]"></div>
                      </div>
                    </div>
                    <Link to="/education">
                      <Button variant="link" className="p-0">
                        View all courses
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ACTIVITY_FEED.map((activity) => (
                    <div key={activity.id} className="text-sm border-b border-border/20 pb-2 last:border-0">
                      <p>{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>For You</CardTitle>
                <CardDescription>Recommended based on your activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {RECOMMENDATIONS.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-3 p-2 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="bg-primary/20 p-2 rounded-md">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type === "tutorial" ? "Tutorial" : "Community Group"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
