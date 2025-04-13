
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, FileText, Book, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Resource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'pdf';
  url: string;
  relevance: number; // 1-100
  description?: string;
}

const ResourceSuggestions = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchResources = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's active courses/subjects
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('course')
        .eq('user_id', user.id)
        .eq('completed', false);
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      }
      
      const courses = tasksData 
        ? [...new Set(tasksData.map(task => task.course || 'General'))]
        : ['General'];
      
      // Generate resources based on user's active courses
      const generatedResources = generateResourcesForCourses(courses);
      setResources(generatedResources);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      // Fallback to demo data
      setResources(getDemoResources());
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchResources();
  }, [user]);
  
  const refreshResources = async () => {
    setRefreshing(true);
    await fetchResources();
    setRefreshing(false);
  };
  
  const generateResourcesForCourses = (courses: string[]): Resource[] => {
    const allResources: Resource[] = [];
    
    // Enhanced resource templates with more detailed descriptions
    const resourceTemplates = {
      Math: [
        { 
          title: 'Calculus Made Easy', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=calculus+made+easy',
          description: 'Step-by-step video tutorials covering differentiation, integration, and applications'
        },
        { 
          title: 'Advanced Algebra Techniques', 
          type: 'pdf', 
          url: 'https://example.com/algebra',
          description: 'Comprehensive guide to algebraic methods with practice problems'
        },
        { 
          title: 'Statistics for Data Science', 
          type: 'article', 
          url: 'https://towardsdatascience.com/statistics-for-data-scientists-8ef000255d71',
          description: 'Modern statistical concepts applied to data analysis problems'
        }
      ],
      Science: [
        { 
          title: 'Physics Fundamentals', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=physics+fundamentals',
          description: 'Visual explanations of core physics principles with demonstrations'
        },
        { 
          title: 'Chemistry Lab Preparation', 
          type: 'pdf', 
          url: 'https://example.com/chemistry',
          description: 'Laboratory techniques and safety procedures for chemistry experiments'
        },
        { 
          title: 'Biology Study Guide', 
          type: 'book', 
          url: 'https://openstax.org/details/books/biology-2e',
          description: 'Comprehensive textbook covering cellular biology through ecology'
        }
      ],
      Computer: [
        { 
          title: 'Introduction to Algorithms', 
          type: 'book', 
          url: 'https://mitpress.mit.edu/books/introduction-algorithms-third-edition',
          description: 'Classic textbook on algorithm design and analysis with pseudocode'
        },
        { 
          title: 'Web Development Bootcamp', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=web+development+bootcamp',
          description: 'Full course covering HTML, CSS, JavaScript, and modern frameworks'
        },
        { 
          title: 'Machine Learning Foundations', 
          type: 'article', 
          url: 'https://www.kaggle.com/learn/intro-to-machine-learning',
          description: 'Introductory concepts in machine learning with practical examples'
        }
      ],
      History: [
        { 
          title: 'World War II Documentary', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=world+war+ii+documentary',
          description: 'In-depth historical footage and expert analysis of key events'
        },
        { 
          title: 'Ancient Civilizations', 
          type: 'book', 
          url: 'https://example.com/ancient',
          description: 'Comparative study of early human civilizations and their development'
        },
        { 
          title: 'American History Timeline', 
          type: 'pdf', 
          url: 'https://example.com/us-history',
          description: 'Chronological presentation of major events in American history'
        }
      ],
      English: [
        { 
          title: 'Essay Writing Workshop', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=essay+writing+techniques',
          description: 'Techniques for structuring arguments and improving prose style'
        },
        { 
          title: 'Literature Analysis Guide', 
          type: 'pdf', 
          url: 'https://example.com/literature',
          description: 'Methods for close reading and interpretation of literary texts'
        },
        { 
          title: 'Grammar Masterclass', 
          type: 'article', 
          url: 'https://example.com/grammar',
          description: 'Comprehensive coverage of English grammar rules and exceptions'
        }
      ],
      "Data Analysis": [
        { 
          title: 'Data Science with Python', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=data+science+python',
          description: 'Hands-on tutorials using pandas, numpy, and visualization tools'
        },
        { 
          title: 'Statistical Analysis Methods', 
          type: 'article', 
          url: 'https://towardsdatascience.com/statistical-analysis-for-data-science-4d1d0ead0350',
          description: 'Practical guide to applying statistical tests to real-world data'
        },
        { 
          title: 'Data Visualization Techniques', 
          type: 'book', 
          url: 'https://example.com/data-viz',
          description: 'Principles of effective data visualization with code examples'
        }
      ],
      General: [
        { 
          title: 'Effective Study Techniques', 
          type: 'video', 
          url: 'https://www.youtube.com/results?search_query=effective+study+techniques',
          description: 'Research-backed methods to improve retention and understanding'
        },
        { 
          title: 'Note-Taking Strategies', 
          type: 'article', 
          url: 'https://learningcenter.unc.edu/tips-and-tools/effective-note-taking-in-class/',
          description: 'Different systems for capturing and organizing information'
        },
        { 
          title: 'Time Management for Students', 
          type: 'book', 
          url: 'https://example.com/time',
          description: 'Structured approaches to planning and prioritizing academic work'
        }
      ]
    };
    
    // Generate resources based on courses
    for (const course of courses) {
      // Find matching template category
      let templateKey = 'General';
      for (const key of Object.keys(resourceTemplates)) {
        if (course.toLowerCase().includes(key.toLowerCase())) {
          templateKey = key;
          break;
        }
      }
      
      // Special case for data analysis/analytics
      if (course.toLowerCase().includes('data') && 
         (course.toLowerCase().includes('analysis') || course.toLowerCase().includes('analytics'))) {
        templateKey = 'Data Analysis';
      }
      
      // Get resource templates
      const templates = resourceTemplates[templateKey as keyof typeof resourceTemplates];
      
      // Add resources with random relevance scores
      for (const template of templates) {
        // Create a custom title that includes the course name if not General
        let title = template.title;
        if (templateKey === 'General' && course !== 'General') {
          title = `${course}: ${title}`;
        }
        
        allResources.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title,
          type: template.type as Resource['type'],
          url: template.url,
          relevance: Math.floor(Math.random() * 25) + 75, // 75-99% relevance
          description: template.description
        });
      }
    }
    
    // Sort by relevance and limit to top 5
    return allResources
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  };
  
  const getDemoResources = (): Resource[] => {
    return [
      {
        id: '1',
        title: 'Advanced Calculus Explained Simply',
        type: 'video',
        url: 'https://www.youtube.com/results?search_query=advanced+calculus+explained',
        relevance: 95,
        description: 'Visual explanations of complex calculus concepts'
      },
      {
        id: '2',
        title: 'Understanding Neural Networks',
        type: 'article',
        url: 'https://towardsdatascience.com/understanding-neural-networks-19020b758230',
        relevance: 87,
        description: 'From perceptrons to deep learning architectures'
      },
      {
        id: '3',
        title: 'Physics Fundamentals: Chapter 7 Notes',
        type: 'pdf',
        url: 'https://example.com/physics-ch7',
        relevance: 82,
        description: 'Comprehensive notes on electromagnetic theory'
      },
      {
        id: '4',
        title: 'Data Structures and Algorithms',
        type: 'book',
        url: 'https://example.com/dsa',
        relevance: 75,
        description: 'Implementation strategies in multiple programming languages'
      }
    ];
  };

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
    if (relevance >= 90) return 'text-green-600 dark:text-green-400';
    if (relevance >= 80) return 'text-blue-600 dark:text-blue-400';
    if (relevance >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Study Resources</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshResources} 
          disabled={refreshing || loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-2 flex justify-center">
              <Book className="h-12 w-12 opacity-20" />
            </div>
            <p>No resources found</p>
            <p className="text-xs mt-1">Add some courses to get personalized resources</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div 
                key={resource.id}
                className="p-3 border border-border rounded-md hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    resource.type === 'video' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    resource.type === 'article' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    resource.type === 'book' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                    resource.type === 'pdf' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
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
                    
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    
                    <div className="flex items-center mt-1">
                      <span className="text-xs capitalize text-muted-foreground">
                        {resource.type}
                      </span>
                      <a 
                        href={resource.url} 
                        target="_blank"
                        rel="noopener noreferrer"
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
        )}
      </CardContent>
    </Card>
  );
};

export default ResourceSuggestions;
