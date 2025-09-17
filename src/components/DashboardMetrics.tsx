import React from 'react';
import { useDashboardMetrics, useToolsetItems, useLabExperiments } from '../hooks/useDynamoData';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, TrendingUp, Activity, Users, Zap } from 'lucide-react';

export function DashboardMetrics() {
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError 
  } = useDashboardMetrics();

  const { 
    data: toolsetItems, 
    isLoading: toolsLoading, 
    error: toolsError 
  } = useToolsetItems();

  const { 
    data: experiments, 
    isLoading: experimentsLoading, 
    error: experimentsError 
  } = useLabExperiments();

  if (metricsLoading || toolsLoading || experimentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard data...</span>
      </div>
    );
  }

  if (metricsError || toolsError || experimentsError) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-lg font-semibold">Error Loading Dashboard</div>
        <p className="text-sm text-gray-600 mt-2">
          {metricsError?.message || toolsError?.message || experimentsError?.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Make sure local DynamoDB is running and tables are seeded
        </p>
      </div>
    );
  }

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'agents_count':
        return <Users className="h-5 w-5 text-blue-600" />;
      case 'experiments_count':
        return <Activity className="h-5 w-5 text-green-600" />;
      case 'models_used':
        return <Zap className="h-5 w-5 text-purple-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-600" />;
    }
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith('+')) {
      return 'text-green-600';
    } else if (change.startsWith('-')) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your AI development activity
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics?.map((metric) => (
          <Card key={`${metric.metric_type}-${metric.timestamp}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.metric_label}
              </CardTitle>
              {getMetricIcon(metric.metric_type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.metric_value}</div>
              <p className={`text-xs ${getChangeColor(metric.change_percent)}`}>
                {metric.change_percent} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tools</CardTitle>
            <p className="text-sm text-muted-foreground">
              Available development tools
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {toolsetItems?.map((tool) => (
                <div key={tool.tool_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">
                        {tool.icon === 'bot' && '🤖'}
                        {tool.icon === 'brain' && '🧠'}
                        {tool.icon === 'rocket' && '🚀'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={tool.is_active ? "default" : "secondary"}>
                      {tool.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Experiments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Experiments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest lab activity
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {experiments?.slice(0, 5).map((experiment) => (
                <div key={`${experiment.experiment_id}-${experiment.version}`} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{experiment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      by {experiment.created_by}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      experiment.status === 'active' ? "default" :
                      experiment.status === 'completed' ? "secondary" :
                      "outline"
                    }
                  >
                    {experiment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-400 space-y-1">
              <p>🔧 Using local DynamoDB on localhost:8002</p>
              <p>🏢 Tenant: dev-tenant</p>
              <p>📊 Metrics loaded: {metrics?.length || 0}</p>
              <p>🛠️ Tools loaded: {toolsetItems?.length || 0}</p>
              <p>🧪 Experiments loaded: {experiments?.length || 0}</p>
              <p>⏰ Last refresh: {new Date().toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}