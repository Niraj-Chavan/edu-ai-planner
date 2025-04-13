
import React from 'react';
import { CalendarDays, BookOpen, BarChart2, MessageSquare, Settings, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  
  const navItems = [
    { icon: MessageSquare, label: 'Chat', path: '/' },
    { icon: CalendarDays, label: 'Planner', path: '/planner' },
    { icon: BarChart2, label: 'Progress', path: '/progress' },
    { icon: BookOpen, label: 'Study', path: '/study' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside 
      className={cn(
        "bg-secondary h-screen flex flex-col border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <Brain className="h-6 w-6 text-accent" />
          {!collapsed && <span className="font-bold text-xl">EduBuddy</span>}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)} 
          className={cn("h-8 w-8", collapsed && "hidden")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={index}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    collapsed ? "justify-center px-2" : "px-3"
                  )}
                  asChild
                >
                  <Link to={item.path}>
                    <item.icon className={cn("h-5 w-5", isActive && "text-accent")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {collapsed && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)} 
          className="mx-auto mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </aside>
  );
};

// Add the missing chevron icons
const ChevronLeft = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default Sidebar;
