
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, FileText, Book, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'pdf';
  url: string;
  relevance: number; // 1-100
}

const ResourceSuggestions = () => {
  const [resources, setResources] = React.useState<Resource[]>([
    {
      id: '1',
      title: 'Advanced Calculus Explained Simply',
      type: 'video',
      url: '#',
      relevance: 95
    },
    {
      id: '2',
      title: 'Understanding Neural Networks',
      type: 'article',
      url: '#',
      relevance: 87
    },
    {
      id: '3',
      title: 'Physics Fundamentals: Chapter 7 Notes',
      type: 'pdf',
      url: '#',
      relevance: 82
    },
    {
      id: '4',
      title: 'Data Structures and Algorithms',
      type: 'book',
      url: '#',
      relevance: 75
    }
  ]);

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'book':
        return <Book className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 90) return 'text-green-600';
    if (relevance >= 80) return 'text-blue-600';
    if (relevance >= 70) return 'text-amber-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource) => (
            <div 
              key={resource.id}
              className="p-3 border border-border rounded-md hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  resource.type === 'video' && "bg-red-100 text-red-700",
                  resource.type === 'article' && "bg-blue-100 text-blue-700",
                  resource.type === 'book' && "bg-purple-100 text-purple-700",
                  resource.type === 'pdf' && "bg-orange-100 text-orange-700"
                )}>
                  {getResourceIcon(resource.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                    <span className={cn(
                      "ml-2 text-xs font-semibold",
                      getRelevanceColor(resource.relevance)
                    )}>
                      {resource.relevance}%
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs capitalize text-muted-foreground">
                      {resource.type}
                    </span>
                    <a 
                      href={resource.url} 
                      className="ml-auto text-xs text-accent flex items-center gap-1 hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceSuggestions;
