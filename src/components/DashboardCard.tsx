import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DashboardCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn("bg-gradient-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className="text-xs mt-1">
            <span
              className={
                trend.isPositive ? "text-success" : "text-destructive"
              }
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>{" "}
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}