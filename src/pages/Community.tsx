
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from '@/hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  User, 
  Users, 
  Plus, 
  Lock, 
  UserPlus, 
  Calendar, 
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Crown,
  Star,
  Zap,
  TrendingUp
} from "lucide-react";

// Enhanced mock data for posts with more realistic content
const POSTS = [
  {
    id: 1,
    author: {
      name: "Dr. Maria Chen",
      role: "AI Researcher at Stanford",
      avatar: "/avatars/maria-chen.jpg",
      verified: true,
      level: "Expert"
    },
    content: "🚀 Just published my comprehensive tutorial on fine-tuning LLMs for domain-specific tasks! After 6 months of research, I'm excited to share practical techniques that improved our model performance by 34%. The key insights: proper data preprocessing, strategic learning rate scheduling, and layer-wise fine-tuning.\n\nWhat strategies have worked best for your domain adaptation projects?",
    time: "2 hours ago",
    likes: 124,
    comments: 18,
    shares: 7,
    bookmarks: 42,
    tags: ["#LLMFinetuning", "#MachineLearning", "#Tutorial"],
    attachments: [{
      type: "link",
      title: "Fine-tuning LLMs: A Comprehensive Guide",
      url: "/tutorials/llm-fine-tuning"
    }]
  },
  {
    id: 2,
    author: {
      name: "Alex Johnson",
      role: "Senior Data Scientist at Google",
      avatar: "/avatars/alex-johnson.jpg",
      verified: false,
      level: "Professional"
    },
    content: "Has anyone experimented with the new OpenAI embeddings API? I'm seeing some fascinating results when combining them with traditional clustering algorithms like DBSCAN and hierarchical clustering.\n\nPreliminary results show 23% better semantic grouping compared to previous embedding models. Still running more tests, but the improved contextual understanding is impressive!",
    time: "5 hours ago",
    likes: 89,
    comments: 31,
    shares: 12,
    bookmarks: 28,
    tags: ["#Embeddings", "#OpenAI", "#Clustering"],
    attachments: []
  },
  {
    id: 3,
    author: {
      name: "Sam Rodriguez",
      role: "ML Engineer at Tesla",
      avatar: "/avatars/sam-rodriguez.jpg",
      verified: true,
      level: "Expert"
    },
    content: "🎉 Breakthrough moment! Just achieved 97.3% accuracy on our autonomous driving vision model! The secret sauce was a carefully crafted data augmentation pipeline combined with progressive resizing and mixup techniques.\n\nFor anyone working on computer vision tasks, here are the key techniques that made the difference:\n\n1. Progressive image resizing during training\n2. Advanced augmentation (cutmix, mixup, autoaugment)\n3. Test-time augmentation for inference\n4. Ensemble of 5 models with different architectures\n\nHappy to share more details in the comments!",
    time: "1 day ago",
    likes: 267,
    comments: 45,
    shares: 23,
    bookmarks: 98,
    tags: ["#ComputerVision", "#AutonomousDriving", "#DeepLearning"],
    attachments: [{
      type: "image",
      title: "Model Performance Comparison",
      url: "/images/model-performance.png"
    }]
  },
  {
    id: 4,
    author: {
      name: "Jamie Taylor",
      role: "CS Student at MIT",
      avatar: "/avatars/jamie-taylor.jpg",
      verified: false,
      level: "Beginner"
    },
    content: "Hey everyone! 👋 I'm completely new to Diatonic AI and the world of machine learning in general. The amount of information out there is both exciting and overwhelming!\n\nI've started with the beginner tutorials here, but I'd love some guidance on:\n- Best learning path for someone with a CS background\n- Must-read papers for AI fundamentals\n- Recommended practical projects to build a portfolio\n\nAny mentorship or study group recommendations would be amazing! Thanks in advance to this incredible community! 🙏",
    time: "1 day ago",
    likes: 156,
    comments: 38,
    shares: 5,
    bookmarks: 22,
    tags: ["#Beginner", "#Learning", "#StudyGroup"],
    attachments: []
  },
  {
    id: 5,
    author: {
      name: "Dr. Aisha Patel",
      role: "Research Director at DeepMind",
      avatar: "/avatars/aisha-patel.jpg",
      verified: true,
      level: "Expert"
    },
    content: "Excited to announce our latest research on ethical AI frameworks! 🌟\n\nAfter 18 months of interdisciplinary research, we've developed a comprehensive framework for evaluating AI bias across different domains. Key contributions:\n\n📊 Novel bias detection metrics\n🔍 Cross-domain evaluation protocols\n⚖️ Fairness-aware training algorithms\n🛡️ Privacy-preserving audit techniques\n\nPaper will be presented at NeurIPS 2024. Looking forward to community feedback and collaboration opportunities!",
    time: "2 days ago",
    likes: 342,
    comments: 67,
    shares: 41,
    bookmarks: 156,
    tags: ["#AIEthics", "#Research", "#NeurIPS"],
    attachments: [{
      type: "pdf",
      title: "Ethical AI Framework Preprint",
      url: "/papers/ethical-ai-framework.pdf"
    }]
  }
];

// Enhanced mock data for community groups
const GROUPS = [
  {
    id: 1,
    name: "NLP & Language Models",
    description: "Discussing the latest in Natural Language Processing, from transformers to GPT and beyond",
    members: 12847,
    posts: 2156,
    activeMembers: 324,
    category: "Research",
    privacy: "public",
    joined: false,
    moderators: ["Dr. Maria Chen", "Prof. James Liu"],
    recentActivity: "5 minutes ago"
  },
  {
    id: 2,
    name: "Computer Vision Masters",
    description: "Advanced computer vision techniques, object detection, image segmentation, and visual AI",
    members: 8934,
    posts: 1432,
    activeMembers: 187,
    category: "Technical",
    privacy: "public",
    joined: false,
    moderators: ["Sam Rodriguez", "Dr. Yi Zhang"],
    recentActivity: "12 minutes ago"
  },
  {
    id: 3,
    name: "AI Beginners Circle",
    description: "Welcoming space for AI newcomers to learn, ask questions, and grow together",
    members: 25673,
    posts: 4521,
    activeMembers: 892,
    category: "Learning",
    privacy: "public",
    joined: false,
    moderators: ["Sarah Kim", "Mike Thompson"],
    recentActivity: "2 minutes ago"
  },
  {
    id: 4,
    name: "Ethics in AI",
    description: "Exploring responsible AI development, bias, fairness, and societal impact",
    members: 6789,
    posts: 892,
    activeMembers: 145,
    category: "Discussion",
    privacy: "public",
    joined: false,
    moderators: ["Dr. Aisha Patel"],
    recentActivity: "8 minutes ago"
  },
  {
    id: 5,
    name: "Diatonic AI Pro Users",
    description: "Exclusive group for Pro and Enterprise subscribers to share advanced techniques",
    members: 1247,
    posts: 187,
    activeMembers: 67,
    category: "Premium",
    privacy: "private",
    joined: false,
    moderators: ["Diatonic Team"],
    recentActivity: "1 hour ago"
  }
];

// Mock trending topics with more context
const TRENDING_TOPICS = [
  { tag: "#LLMFinetuning", posts: 342, trend: "up", growth: "+12%" },
  { tag: "#ComputerVision", posts: 287, trend: "up", growth: "+8%" },
  { tag: "#AIEthics", posts: 156, trend: "hot", growth: "+34%" },
  { tag: "#PromptEngineering", posts: 234, trend: "up", growth: "+15%" },
  { tag: "#NeuralNetworks", posts: 198, trend: "stable", growth: "+3%" },
  { tag: "#AutoML", posts: 127, trend: "new", growth: "New!" },
  { tag: "#Transformers", posts: 389, trend: "up", growth: "+6%" }
];

// Anonymous User Prompt Component
const AnonymousPrompt: React.FC<{ action: string }> = ({ action }) => {
  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Lock className="h-4 w-4" />
      <AlertTitle>Join the Conversation!</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">Create a free account to {action} and fully participate in our AI community.</p>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/auth/signup">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Free Account
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth/signin">
              Sign In
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Post Component with Enhanced Features
const CommunityPost: React.FC<{ post: typeof POSTS[0], isAuthenticated: boolean }> = ({ post, isAuthenticated }) => {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleInteraction = (action: string) => {
    if (!isAuthenticated) {
      // Show login prompt or scroll to anonymous prompt
      return;
    }
    // Handle authenticated user interactions
    if (action === 'like') {
      setLiked(!liked);
    } else if (action === 'bookmark') {
      setBookmarked(!bookmarked);
    } else if (action === 'comment') {
      setShowComments(!showComments);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
            <AvatarFallback>
              {post.author.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{post.author.name}</h4>
              {post.author.verified && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">✓ Verified</Badge>}
              <Badge variant="outline" className="text-xs">{post.author.level}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{post.author.role}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {post.time}
            </p>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-sm leading-relaxed whitespace-pre-line mb-3">{post.content}</p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Attachments */}
          {post.attachments.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              {post.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <span className="font-medium">{attachment.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleInteraction('like')}
              className={`flex items-center gap-1.5 text-sm transition-colors hover:text-primary ${liked ? 'text-primary' : 'text-muted-foreground'} ${!isAuthenticated ? 'cursor-not-allowed opacity-60' : ''}`}
              disabled={!isAuthenticated}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{post.likes + (liked ? 1 : 0)}</span>
            </button>
            
            <button 
              onClick={() => handleInteraction('comment')}
              className={`flex items-center gap-1.5 text-sm transition-colors hover:text-primary ${!isAuthenticated ? 'cursor-not-allowed opacity-60 text-muted-foreground' : 'text-muted-foreground'}`}
              disabled={!isAuthenticated}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments} comments</span>
            </button>
            
            <button 
              onClick={() => handleInteraction('share')}
              className={`flex items-center gap-1.5 text-sm transition-colors hover:text-primary ${!isAuthenticated ? 'cursor-not-allowed opacity-60 text-muted-foreground' : 'text-muted-foreground'}`}
              disabled={!isAuthenticated}
            >
              <Share2 className="h-4 w-4" />
              <span>{post.shares}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleInteraction('bookmark')}
              className={`p-1.5 rounded-md transition-colors hover:bg-secondary ${bookmarked ? 'text-primary' : 'text-muted-foreground'} ${!isAuthenticated ? 'cursor-not-allowed opacity-60' : ''}`}
              disabled={!isAuthenticated}
            >
              <Bookmark className="h-4 w-4" />
            </button>
            
            <button className="p-1.5 rounded-md transition-colors hover:bg-secondary text-muted-foreground">
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comments Section (only shown if authenticated and expanded) */}
        {isAuthenticated && showComments && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>Y</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea 
                  placeholder="Share your thoughts..." 
                  className="min-h-[60px] resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm">Post Comment</Button>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-center py-2">
              Comments will appear here once you're signed in
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Community = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">
              AI Community
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect, learn, and innovate with the global AI development community
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>47,293 members</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>12,847 discussions</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>892 online now</span>
              </div>
            </div>
          </div>
          
          {isAuthenticated ? (
            <Button size="lg" className="shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Ready to join the conversation?</p>
              <Button asChild size="lg" className="shadow-lg">
                <Link to="/auth/signup">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Community
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Anonymous User Welcome Message */}
        {!isAuthenticated && (
          <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <Star className="h-4 w-4" />
            <AlertTitle>Welcome to the Diatonic AI Community!</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">You're browsing as a guest. You can view all posts and discussions, but you'll need a free account to:</p>
              <ul className="list-disc ml-6 mb-3 space-y-1">
                <li>Create posts and share your insights</li>
                <li>Comment on discussions and help others</li>
                <li>Like, bookmark, and share content</li>
                <li>Join groups and connect with experts</li>
                <li>Get your own community profile page</li>
                <li>Access exclusive member-only content</li>
              </ul>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link to="/auth/signup">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Free Account
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/auth/signin">
                    Sign In
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Community Feed */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Community Feed
                    </CardTitle>
                    <CardDescription>
                      Latest discussions and insights from the AI community
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Live</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Posts */}
            <div className="space-y-0">
              {POSTS.map((post) => (
                <CommunityPost key={post.id} post={post} isAuthenticated={isAuthenticated} />
              ))}
            </div>

            {/* Anonymous Interaction Prompt */}
            {!isAuthenticated && (
              <div className="text-center py-8">
                <AnonymousPrompt action="create posts, comment, and interact" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Profile Card for Authenticated Users */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {user.username?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      <p className="text-sm text-muted-foreground">Community Member</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Posts</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comments</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Likes Received</span>
                      <span className="font-semibold">0</span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <Button variant="outline" className="w-full" size="sm">
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Community Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Community Groups
                </CardTitle>
                <CardDescription>
                  Join specialized communities within our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {GROUPS.slice(0, 4).map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                          {group.name}
                          {group.privacy === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{group.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{group.members.toLocaleString()} members</span>
                          <span>•</span>
                          <span>{group.activeMembers} online</span>
                        </div>
                      </div>
                    </div>
                    
                    {isAuthenticated ? (
                      <Button size="sm" variant="outline" className="w-full">
                        {group.joined ? 'Joined' : 'Join Group'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full opacity-60 cursor-not-allowed">
                        <Lock className="mr-2 h-3 w-3" />
                        Sign in to Join
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button variant="ghost" className="w-full" size="sm">
                  View All Groups →
                </Button>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Trending Topics
                </CardTitle>
                <CardDescription>
                  Popular discussions right now
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {TRENDING_TOPICS.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between hover:bg-secondary/30 rounded p-2 -m-2 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-medium text-sm">{topic.tag}</span>
                        {topic.trend === 'hot' && <Badge variant="destructive" className="text-xs px-1.5 py-0">🔥 Hot</Badge>}
                        {topic.trend === 'new' && <Badge variant="secondary" className="text-xs px-1.5 py-0">✨ New</Badge>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{topic.posts} posts</div>
                        <div className={`text-xs font-medium ${
                          topic.growth.includes('+') ? 'text-green-500' : 'text-muted-foreground'
                        }`}>
                          {topic.growth}
                        </div>
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

export default Community;
