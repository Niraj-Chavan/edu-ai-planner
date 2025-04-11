
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Brain } from 'lucide-react';

const WelcomeCard = () => {
  const userName = "Student";
  const currentHour = new Date().getHours();
  
  let greeting;
  if (currentHour < 12) {
    greeting = "Good morning";
  } else if (currentHour < 18) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  const getMotivationalQuote = () => {
    const quotes = [
      "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing.",
      "The beautiful thing about learning is that no one can take it away from you.",
      "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
      "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
      "The expert in anything was once a beginner."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  return (
    <Card className="bg-gradient-to-r from-accent to-primary overflow-hidden relative">
      <CardContent className="p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">{greeting}, {userName}!</h2>
            <p className="opacity-90 mb-4 max-w-[80%]">
              Your AI learning assistant is here to help you achieve your academic goals.
            </p>
            <blockquote className="italic opacity-80 text-sm max-w-[80%]">
              "{getMotivationalQuote()}"
            </blockquote>
          </div>
          <Brain className="h-16 w-16 opacity-20 absolute right-6 top-6" />
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
