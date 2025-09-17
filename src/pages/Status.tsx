import React from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Server, 
  Database,
  Cloud,
  Globe,
  Zap,
  Shield
} from 'lucide-react';

const Status = () => {
  const currentTime = new Date().toLocaleString();

  const systemStatus = {
    overall: 'operational',
    uptime: '99.98%',
    lastUpdated: currentTime
  };

  const services = [
    {
      name: 'Web Application',
      description: 'Main Workbbench platform and user interface',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '145ms',
      icon: <Globe className="h-5 w-5" />,
      lastIncident: '7 days ago'
    },
    {
      name: 'Authentication',
      description: 'AWS Cognito user authentication and authorization',
      status: 'operational',
      uptime: '99.97%',
      responseTime: '89ms',
      icon: <Shield className="h-5 w-5" />,
      lastIncident: '14 days ago'
    },
    {
      name: 'AI Agent Builder',
      description: 'Visual agent creation and management system',
      status: 'operational',
      uptime: '99.95%',
      responseTime: '210ms',
      icon: <Zap className="h-5 w-5" />,
      lastIncident: '3 days ago'
    },
    {
      name: 'Education Platform',
      description: 'Course content delivery and progress tracking',
      status: 'operational',
      uptime: '99.98%',
      responseTime: '167ms',
      icon: <Activity className="h-5 w-5" />,
      lastIncident: '12 days ago'
    },
    {
      name: 'Database',
      description: 'DynamoDB and PostgreSQL data storage systems',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '45ms',
      icon: <Database className="h-5 w-5" />,
      lastIncident: '21 days ago'
    },
    {
      name: 'AI Lab',
      description: 'Model training and experimentation environment',
      status: 'maintenance',
      uptime: '99.92%',
      responseTime: '340ms',
      icon: <Server className="h-5 w-5" />,
      lastIncident: '2 hours ago'
    },
    {
      name: 'Community Features',
      description: 'Forums, messaging, and social platform features',
      status: 'operational',
      uptime: '99.96%',
      responseTime: '198ms',
      icon: <Activity className="h-5 w-5" />,
      lastIncident: '9 days ago'
    },
    {
      name: 'File Storage',
      description: 'AWS S3 file upload and content delivery',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '67ms',
      icon: <Cloud className="h-5 w-5" />,
      lastIncident: '18 days ago'
    }
  ];

  const recentIncidents = [
    {
      id: 1,
      title: 'AI Lab Scheduled Maintenance',
      description: 'Routine maintenance for GPU cluster upgrades',
      status: 'in-progress',
      impact: 'minor',
      startTime: '2024-12-15 14:00 UTC',
      endTime: '2024-12-15 18:00 UTC (estimated)',
      affectedServices: ['AI Lab', 'Model Training']
    },
    {
      id: 2,
      title: 'Agent Builder Performance Issues',
      description: 'Intermittent slowdowns in visual agent creation',
      status: 'resolved',
      impact: 'minor',
      startTime: '2024-12-12 09:15 UTC',
      endTime: '2024-12-12 11:45 UTC',
      affectedServices: ['AI Agent Builder']
    },
    {
      id: 3,
      title: 'Authentication Service Delay',
      description: 'Increased login response times due to AWS region issues',
      status: 'resolved',
      impact: 'minor',
      startTime: '2024-12-01 16:30 UTC',
      endTime: '2024-12-01 17:15 UTC',
      affectedServices: ['Authentication', 'Web Application']
    }
  ];

  const metrics = [
    {
      name: 'Average Response Time',
      value: '156ms',
      change: '-12ms',
      trend: 'improving',
      description: '24-hour average across all services'
    },
    {
      name: 'Overall Uptime',
      value: '99.98%',
      change: '+0.02%',
      trend: 'stable',
      description: '30-day rolling average'
    },
    {
      name: 'Active Users',
      value: '24,567',
      change: '+1,234',
      trend: 'growing',
      description: 'Currently online'
    },
    {
      name: 'API Requests',
      value: '2.4M',
      change: '+15%',
      trend: 'growing',
      description: 'Last 24 hours'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-workbbench-green" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-workbbench-orange" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-workbbench-orange" />;
      case 'outage':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30';
      case 'maintenance':
        return 'bg-workbbench-orange/20 text-workbbench-orange border-workbbench-orange/30';
      case 'degraded':
        return 'bg-workbbench-orange/20 text-workbbench-orange border-workbbench-orange/30';
      case 'outage':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-workbbench-green/20 text-workbbench-green border-workbbench-green/30';
      case 'in-progress':
        return 'bg-workbbench-orange/20 text-workbbench-orange border-workbbench-orange/30';
      case 'investigating':
        return 'bg-workbbench-blue/20 text-workbbench-blue border-workbbench-blue/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'major':
        return 'bg-workbbench-orange/20 text-workbbench-orange border-workbbench-orange/30';
      case 'minor':
        return 'bg-workbbench-blue/20 text-workbbench-blue border-workbbench-blue/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Activity className="h-12 w-12 text-workbbench-purple" />
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
                System Status
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Real-time status of all Workbbench services and infrastructure. 
            Stay informed about service availability and planned maintenance.
          </p>
        </div>

        {/* Overall Status */}
        <section className="mb-16">
          <Card className={`${
            systemStatus.overall === 'operational' 
              ? 'bg-gradient-to-r from-workbbench-green/20 to-workbbench-blue/20 border-workbbench-green/30'
              : 'bg-gradient-to-r from-workbbench-orange/20 to-workbbench-purple/20 border-workbbench-orange/30'
          }`}>
            <CardContent className="py-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                {getStatusIcon(systemStatus.overall)}
                <h2 className="text-3xl font-bold">
                  {systemStatus.overall === 'operational' ? 'All Systems Operational' : 'Service Issues Detected'}
                </h2>
              </div>
              <p className="text-xl text-gray-300 mb-6">
                Current system uptime: {systemStatus.uptime} • Last updated: {systemStatus.lastUpdated}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                  Subscribe to Updates
                </Button>
                <Button variant="outline">
                  View Incident History
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Service Status */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Service Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {service.icon}
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                  <CardDescription className="text-gray-300 text-sm">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Status:</span>
                      <Badge className={getStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Uptime:</span>
                      <span className="text-sm font-mono">{service.uptime}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Response:</span>
                      <span className="text-sm font-mono">{service.responseTime}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Last incident: {service.lastIncident}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{metric.name}</span>
                    <TrendingUp className={`h-4 w-4 ${
                      metric.trend === 'improving' || metric.trend === 'growing' 
                        ? 'text-workbbench-green' 
                        : 'text-workbbench-blue'
                    }`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{metric.value}</div>
                  <div className={`text-sm flex items-center gap-1 mb-2 ${
                    metric.change.startsWith('+') 
                      ? 'text-workbbench-green' 
                      : metric.change.startsWith('-')
                      ? 'text-workbbench-orange'
                      : 'text-gray-400'
                  }`}>
                    {metric.change} from last period
                  </div>
                  <div className="text-xs text-gray-400">{metric.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Incidents */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Recent Incidents</h2>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <Card key={incident.id} className="bg-secondary/30 border-white/10">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{incident.title}</h3>
                        <Badge className={getIncidentStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                        <Badge className={getImpactColor(incident.impact)}>
                          {incident.impact} impact
                        </Badge>
                      </div>
                      
                      <p className="text-gray-300 mb-3">{incident.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div>
                          <strong>Started:</strong> {incident.startTime}
                        </div>
                        <div>
                          <strong>Duration:</strong> {incident.endTime}
                        </div>
                        <div>
                          <strong>Affected:</strong> {incident.affectedServices.join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Maintenance Schedule */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Scheduled Maintenance</h2>
          <Card className="bg-secondary/30 border-white/10">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-workbbench-blue mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Upcoming Maintenance</h3>
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="p-4 bg-workbbench-blue/10 rounded-lg border border-workbbench-blue/30">
                  <h4 className="font-semibold mb-2">Database Optimization</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Scheduled maintenance for improved query performance and capacity scaling
                  </p>
                  <div className="text-xs text-gray-400">
                    <strong>When:</strong> Sunday, December 22, 2024 at 02:00-06:00 UTC<br />
                    <strong>Impact:</strong> Brief service interruptions (less than 5 minutes)<br />
                    <strong>Services:</strong> All platform services
                  </div>
                </div>
                
                <div className="p-4 bg-workbbench-purple/10 rounded-lg border border-workbbench-purple/30">
                  <h4 className="font-semibold mb-2">AI Model Infrastructure Update</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    GPU cluster expansion and model serving optimization
                  </p>
                  <div className="text-xs text-gray-400">
                    <strong>When:</strong> Sunday, January 5, 2025 at 01:00-05:00 UTC<br />
                    <strong>Impact:</strong> AI Lab and Agent Builder may be temporarily unavailable<br />
                    <strong>Services:</strong> AI Lab, Agent Builder, Model Training
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Status Page Information */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-workbbench-purple" />
                  Status Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  This page is updated in real-time with the latest service status information. 
                  We monitor all services 24/7 and provide immediate updates when issues are detected.
                </p>
                <div className="space-y-2 text-sm">
                  <div><strong>Update Frequency:</strong> Real-time</div>
                  <div><strong>Data Retention:</strong> 90 days</div>
                  <div><strong>Monitoring:</strong> 24/7 automated + human oversight</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-workbbench-green" />
                  Stay Informed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Get notified about service disruptions and maintenance windows through 
                  our notification channels.
                </p>
                <div className="space-y-3">
                  <Button className="w-full bg-workbbench-purple hover:bg-workbbench-purple/90">
                    Subscribe to Email Alerts
                  </Button>
                  <Button variant="outline" className="w-full">
                    Follow @WorkbbenchStatus
                  </Button>
                  <Button variant="outline" className="w-full">
                    RSS Feed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Status;
