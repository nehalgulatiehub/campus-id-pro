import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 text-muted-foreground/60">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        {action && (
          <Button 
            onClick={action.onClick}
            variant="gradient"
            size="lg"
            className="shadow-lg"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};