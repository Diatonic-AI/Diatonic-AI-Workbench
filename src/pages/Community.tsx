
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
import { MessageSquare, ThumbsUp, ThumbsDown, User, Users, Plus } from "lucide-react";

// Mock data for posts
const POSTS = [
  {
    id: 1,
    author: "Maria Chen",
    role: "AI Researcher",
    content: "Just published my new tutorial on fine-tuning LLMs for domain-specific tasks. Check it out and let me know what you think!",
    time: "2 hours ago",
    likes: 24,
    comments: 5
  },
  {
    id: 2,
    author: "Alex Johnson",
    role: "Data Scientist",
    content: "Has anyone experimented with the new OpenAI embeddings? I'm seeing some interesting results when combined with traditional clustering algorithms.",
    time: "5 hours ago",
    likes: 13,
    comments: 7
  },
  {
    id: 3,
    author: "Sam Rodriguez",
    role: "ML Engineer",
    content: "Just hit 95% accuracy on my image classification model! The key was a proper data augmentation pipeline. Happy to share my approach if anyone's interested.",
    time: "1 day ago",
    likes: 46,
    comments: 12
  },
  {
    id: 4,
    author: "Jamie Taylor",
    role: "Student",
    content: "I'm new to Workbbench and AI in general. Any recommendations for good starting resources? Currently going through the beginner tutorials.",
    time: "1 day ago",
    likes: 8,
    comments: 4
  },
];

// Mock data for community groups
const GROUPS = [
  {
    id: 1,
    name: "NLP Enthusiasts",
    members: 1243,
    posts: 56,
    joined: true
  },
  {
    id: 2,
    name: "Computer Vision Research",
    members: 879,
    posts: 32,
    joined: false
  },
  {
    id: 3,
    name: "Beginner AI Study Group",
    members: 2567,
    posts: 128,
    joined: false
  },
];

const Community = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nexus</h1>
            <p className="text-muted-foreground">
              Connect with the AI community
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Community Feed</CardTitle>
                <CardDescription>
                  See what others are sharing and discussing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {POSTS.map((post) => (
                  <div key={post.id} className="border-b border-border/20 pb-4 last:border-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="bg-secondary h-10 w-10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{post.author}</p>
                          <span className="text-xs text-muted-foreground">• {post.role}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{post.time}</p>
                      </div>
                    </div>
                    <p className="mb-3">{post.content}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments} comments</span>
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Groups</CardTitle>
                <CardDescription>
                  Join groups to connect with like-minded people
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {GROUPS.map((group) => (
                  <div key={group.id} className="p-3 border border-border/20 rounded-md hover:border-border transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {group.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{group.members} members</span>
                      <span>{group.posts} posts</span>
                    </div>
                    <Button 
                      variant={group.joined ? "outline" : "default"} 
                      className="w-full text-sm h-8"
                    >
                      {group.joined ? "Joined" : "Join Group"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["#LLMFinetuning", "#ComputerVision", "#AIEthics", "#PromptEngineering", "#NeuralNetworks"].map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-primary hover:underline cursor-pointer">{topic}</span>
                      <span className="text-xs text-muted-foreground">{Math.floor(Math.random() * 100) + 10} posts</span>
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

export default Community;
