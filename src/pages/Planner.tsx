
import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ListPlus, PlusCircle } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { DayClickEventHandler } from 'react-day-picker';
import DailySchedule from '@/components/smart-planner/DailySchedule';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Planner = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    course: '',
    dueDate: new Date(),
    priority: 'medium' as 'high' | 'medium' | 'low'
  });
  
  const handleDayClick: DayClickEventHandler = (day) => {
    setSelectedDate(day);
  };
  
  const handleAddTask = async () => {
    if (!user) return;
    
    if (!newTask.title) {
      toast.error("Please enter a task title");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          course: newTask.course || 'General',
          due_date: newTask.dueDate.toISOString(),
          priority: newTask.priority,
          user_id: user.id,
          completed: false
        });
      
      if (error) {
        console.error('Error adding task:', error);
        toast.error("Couldn't add task");
        return;
      }
      
      toast.success("Task added successfully!");
      setIsAddTaskDialogOpen(false);
      setNewTask({
        title: '',
        course: '',
        dueDate: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error("Couldn't add task");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Planner</h1>
          <Button 
            onClick={() => setIsAddTaskDialogOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Task
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendar View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onDayClick={handleDayClick}
                    className="rounded-md border w-full"
                  />
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-3">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  {/* Here we could display tasks for selected date */}
                  <p className="text-muted-foreground text-sm">
                    Select a date to view or add scheduled activities for that day.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <DailySchedule />
          </div>
        </div>
      </div>
      
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task or assignment with due date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input 
                id="title" 
                value={newTask.title} 
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="e.g., Math Assignment" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="course">Course</Label>
              <Input 
                id="course" 
                value={newTask.course} 
                onChange={(e) => setNewTask({...newTask, course: e.target.value})}
                placeholder="e.g., MATH101" 
              />
            </div>
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Calendar
                mode="single"
                selected={newTask.dueDate}
                onSelect={(date) => date && setNewTask({...newTask, dueDate: date})}
                className="border rounded-md p-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <select 
                id="priority" 
                value={newTask.priority} 
                onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'high' | 'medium' | 'low'})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Planner;
