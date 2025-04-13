import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
}

type Task = Database['public']['Tables']['tasks']['Row'];

const UpcomingTasks = () => {
  const [tasks, setTasks] = useState<UpcomingTask[]>([
    {
      id: '1',
      title: 'Physics Lab Report',
      dueDate: '2025-04-13T23:59:59',
      priority: 'high',
      course: 'PHY201'
    },
    {
      id: '2',
      title: 'Literature Essay Draft',
      dueDate: '2025-04-15T23:59:59',
      priority: 'medium',
      course: 'LIT101'
    },
    {
      id: '3',
      title: 'Computer Science Project',
      dueDate: '2025-04-18T23:59:59',
      priority: 'high',
      course: 'CS450'
    }
  ]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('due_date', { ascending: true })
          .limit(5);
        
        if (error) {
          console.error('Error fetching tasks:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedTasks: UpcomingTask[] = data.map((task: Task) => ({
            id: task.id,
            title: task.title,
            dueDate: task.due_date || new Date().toISOString(),
            priority: (task.priority as 'high' | 'medium' | 'low') || 'medium',
            course: task.course || 'N/A'
          }));
          
          setTasks(formattedTasks);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };
    
    fetchTasks();
  }, []);

  const getPriorityBadgeClass = (priority: UpcomingTask['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', urgent: true };
    } else if (diffDays === 0) {
      return { text: 'Due today', urgent: true };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', urgent: true };
    } else if (diffDays < 7) {
      return { text: `Due in ${diffDays} days`, urgent: false };
    } else {
      return { 
        text: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
        urgent: false 
      };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming tasks!</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const dueInfo = formatDueDate(task.dueDate);
              
              return (
                <div 
                  key={task.id}
                  className="p-3 border border-border rounded-md flex items-start gap-3"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full ml-2",
                        getPriorityBadgeClass(task.priority)
                      )}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="flex mt-1 text-xs text-muted-foreground">
                      <span className="bg-secondary px-1.5 py-0.5 rounded">
                        {task.course}
                      </span>
                      <span className={cn(
                        "ml-2 flex items-center gap-1",
                        dueInfo.urgent && "text-red-600"
                      )}>
                        {dueInfo.urgent && <AlertCircle className="h-3 w-3" />}
                        {dueInfo.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;
