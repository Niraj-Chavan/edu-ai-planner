
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Circle, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { DialogTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Task {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  category: 'study' | 'class' | 'assignment' | 'break' | 'personal';
}

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row'];

const DailySchedule = () => {
  const { user } = useAuth();
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    startTime: '',
    endTime: '',
    category: 'study' as Task['category']
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: true });
        
        if (error) {
          console.error('Error fetching schedule:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedTasks: Task[] = data.map((item: ScheduleItem) => ({
            id: item.id,
            title: item.title,
            startTime: item.start_time,
            endTime: item.end_time,
            completed: item.completed || false,
            category: (item.category as Task['category']) || 'study'
          }));
          
          setTodaysTasks(formattedTasks);
        } else {
          setTodaysTasks([]);
        }
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedule();
    
    // Setup a subscription to listen for changes
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_items',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchSchedule();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleTaskCompletion = async (taskId: string) => {
    if (!user) return;
    
    // Find the task to update
    const taskToUpdate = todaysTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    // Optimistic update UI
    setTodaysTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    
    try {
      const { error } = await supabase
        .from('schedule_items')
        .update({ 
          completed: !taskToUpdate.completed,
          user_id: user.id 
        })
        .eq('id', taskId);
        
      if (error) {
        console.error('Error updating task completion:', error);
        // Revert the UI state if there was an error
        setTodaysTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
        ));
        toast.error("Couldn't update schedule status");
      } else {
        toast.success(taskToUpdate.completed ? "Activity marked as incomplete" : "Activity completed!");
      }
    } catch (error) {
      console.error('Failed to update task completion:', error);
      // Revert the UI state if there was an error
      setTodaysTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
      ));
      toast.error("Couldn't update schedule status");
    }
  };

  const handleAddScheduleItem = async () => {
    if (!user) return;
    
    if (!newTask.title || !newTask.startTime || !newTask.endTime) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('schedule_items')
        .insert({
          title: newTask.title,
          start_time: newTask.startTime,
          end_time: newTask.endTime,
          category: newTask.category,
          user_id: user.id,
          completed: false
        });
      
      if (error) {
        console.error('Error adding schedule item:', error);
        toast.error("Couldn't add to schedule");
        return;
      }
      
      toast.success("Added to schedule!");
      setIsAddDialogOpen(false);
      setNewTask({
        title: '',
        startTime: '',
        endTime: '',
        category: 'study'
      });
    } catch (error) {
      console.error('Failed to add schedule item:', error);
      toast.error("Couldn't add to schedule");
    }
  };

  const getCategoryColor = (category: Task['category']) => {
    switch (category) {
      case 'study':
        return 'bg-blue-100 text-blue-800';
      case 'class':
        return 'bg-purple-100 text-purple-800';
      case 'assignment':
        return 'bg-amber-100 text-amber-800';
      case 'break':
        return 'bg-green-100 text-green-800';
      case 'personal':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Today's Schedule
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Schedule</DialogTitle>
                  <DialogDescription>
                    Add a new activity to your daily schedule.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Activity Name</Label>
                    <Input 
                      id="title" 
                      value={newTask.title} 
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                      placeholder="e.g., Math Study Session" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input 
                        id="startTime" 
                        type="time" 
                        value={newTask.startTime} 
                        onChange={(e) => setNewTask({...newTask, startTime: e.target.value})} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input 
                        id="endTime" 
                        type="time" 
                        value={newTask.endTime} 
                        onChange={(e) => setNewTask({...newTask, endTime: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <select 
                      id="category" 
                      value={newTask.category} 
                      onChange={(e) => setNewTask({...newTask, category: e.target.value as Task['category']})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="study">Study</option>
                      <option value="class">Class</option>
                      <option value="assignment">Assignment</option>
                      <option value="break">Break</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddScheduleItem}>Add to Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
          </div>
        ) : todaysTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-2 flex justify-center">
              <Calendar className="h-12 w-12 opacity-20" />
            </div>
            <p>No activities scheduled for today!</p>
            <p className="text-xs mt-1">Add activities or chat with the AI assistant</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysTasks.map((task) => (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-start p-3 rounded-md transition-colors",
                  task.completed ? "bg-secondary/50" : "bg-card hover:bg-secondary/20",
                  task.startTime <= currentTime && task.endTime >= currentTime && !task.completed && "border-l-4 border-accent"
                )}
              >
                <button 
                  onClick={() => toggleTaskCompletion(task.id)}
                  className="mt-0.5 mr-3 flex-shrink-0 outline-none"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center mt-1 gap-2">
                    <span className="text-xs text-muted-foreground">
                      {task.startTime} - {task.endTime}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      getCategoryColor(task.category)
                    )}>
                      {task.category}
                    </span>
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

export default DailySchedule;
