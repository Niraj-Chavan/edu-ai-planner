
import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, ExternalLink, ThumbsUp, ThumbsDown, Youtube, FileText, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// Mock resources data - in a real app, this would come from an API or database
const resourcesData = [
  {
    id: 1,
    title: "Introduction to Calculus",
    description: "Comprehensive guide to calculus fundamentals",
    type: "article",
    source: "Khan Academy",
    url: "https://www.khanacademy.org/math/calculus-1",
    relevance: 95,
    icon: FileText
  },
  {
    id: 2,
    title: "Linear Algebra Explained",
    description: "Video series on linear algebra concepts",
    type: "video",
    source: "YouTube",
    url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    relevance: 88,
    icon: Youtube
  },
  {
    id: 3,
    title: "Physics Mechanics Tutorial",
    description: "In-depth tutorial on mechanical physics",
    type: "course",
    source: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/courses/physics/",
    relevance: 76,
    icon: Globe
  },
  {
    id: 4,
    title: "Computer Science Algorithms",
    description: "Guide to common CS algorithms and data structures",
    type: "article",
    source: "GeeksforGeeks",
    url: "https://www.geeksforgeeks.org/fundamentals-of-algorithms/",
    relevance: 92,
    icon: FileText
  },
  {
    id: 5,
    title: "Chemistry Basics",
    description: "Introductory chemistry concepts explained",
    type: "video",
    source: "YouTube",
    url: "https://www.youtube.com/watch?v=FSyAehMdpyI",
    relevance: 84,
    icon: Youtube
  },
  {
    id: 6,
    title: "Biology Cell Structure",
    description: "Detailed exploration of cell biology",
    type: "course",
    source: "Coursera",
    url: "https://www.coursera.org/learn/cell-biology",
    relevance: 79,
    icon: Globe
  }
];

const Study = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [savedResources, setSavedResources] = useState<number[]>([]);
  
  // Filter resources based on search query and active tab
  const filteredResources = resourcesData.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
                         
    const matchesTab = activeTab === 'all' || resource.type === activeTab;
    
    return matchesSearch && matchesTab;
  });
  
  const toggleSavedResource = (id: number) => {
    if (savedResources.includes(id)) {
      setSavedResources(savedResources.filter(resourceId => resourceId !== id));
    } else {
      setSavedResources([...savedResources, id]);
    }
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold">Study Resources</h1>
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-1/2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="article">Articles</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="course">Courses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  isSaved={savedResources.includes(resource.id)} 
                  onToggleSave={() => toggleSavedResource(resource.id)} 
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="article" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources
                .filter(resource => resource.type === 'article')
                .map(resource => (
                  <ResourceCard 
                    key={resource.id} 
                    resource={resource} 
                    isSaved={savedResources.includes(resource.id)} 
                    onToggleSave={() => toggleSavedResource(resource.id)} 
                  />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources
                .filter(resource => resource.type === 'video')
                .map(resource => (
                  <ResourceCard 
                    key={resource.id} 
                    resource={resource} 
                    isSaved={savedResources.includes(resource.id)} 
                    onToggleSave={() => toggleSavedResource(resource.id)} 
                  />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="course" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources
                .filter(resource => resource.type === 'course')
                .map(resource => (
                  <ResourceCard 
                    key={resource.id} 
                    resource={resource} 
                    isSaved={savedResources.includes(resource.id)} 
                    onToggleSave={() => toggleSavedResource(resource.id)} 
                  />
                ))
              }
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Recent Study Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StudySessionCard
              title="Calculus Fundamentals"
              duration="1.5 hours"
              date="Today"
              progress={80}
            />
            <StudySessionCard
              title="Physics Mechanics"
              duration="2 hours"
              date="Yesterday"
              progress={65}
            />
            <StudySessionCard
              title="Database Systems"
              duration="1 hour"
              date="2 days ago"
              progress={45}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

interface ResourceCardProps {
  resource: any;
  isSaved: boolean;
  onToggleSave: () => void;
}

const ResourceCard = ({ resource, isSaved, onToggleSave }: ResourceCardProps) => {
  const ResourceIcon = resource.icon;
  
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="mb-2">
            {resource.type}
          </Badge>
          <ResourceIcon className="h-6 w-6 text-accent" />
        </div>
        <CardTitle className="text-lg">{resource.title}</CardTitle>
        <CardDescription>{resource.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <span>Source: {resource.source}</span>
        </div>
        <div className="flex items-center mt-2">
          <span className="text-sm mr-2">Relevance:</span>
          <Progress value={resource.relevance} className="h-2 flex-grow" />
          <span className="text-sm ml-2">{resource.relevance}%</span>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
            Visit <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSave}
            className={isSaved ? "text-accent" : ""}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

interface StudySessionCardProps {
  title: string;
  duration: string;
  date: string;
  progress: number;
}

const StudySessionCard = ({ title, duration, date, progress }: StudySessionCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm text-muted-foreground mb-3">
          <span>{date}</span>
          <span>{duration}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Completion</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full">Resume Session</Button>
      </CardFooter>
    </Card>
  );
};

export default Study;
