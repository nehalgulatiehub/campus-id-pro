import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  gradient?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  className,
  gradient = "from-primary/10 to-accent/10"
}: StatsCardProps) => {
  return (
    <Card className={cn(`bg-gradient-to-br ${gradient} border-primary/20 card-hover`, className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {trend && (
          <p className={cn(
            "text-xs flex items-center mt-1",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span className="mr-1">
              {trend.isPositive ? "↗" : "↘"}
            </span>
            {Math.abs(trend.value)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};