
import React from 'react';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import UserMenu from '../auth/UserMenu';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppHeaderProps {
  toggleSidebar: () => void;
}

const AppHeader = ({ toggleSidebar }: AppHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <header className="border-b sticky top-0 z-30 bg-background">
      <div className="flex h-16 items-center px-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 font-medium ml-2">Student AI Planner</div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
