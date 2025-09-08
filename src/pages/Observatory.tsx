
import React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Tooltip,
  Legend,
} from "recharts";

// Mock data for charts
const scatterData = [
  { x: 10, y: 30, z: 200 },
  { x: 20, y: 50, z: 300 },
  { x: 30, y: 40, z: 250 },
  { x: 40, y: 70, z: 400 },
  { x: 50, y: 60, z: 350 },
  { x: 60, y: 90, z: 500 },
  { x: 70, y: 80, z: 450 },
  { x: 80, y: 100, z: 550 },
];

const areaData = [
  { name: "Jan", training: 400, validation: 240 },
  { name: "Feb", training: 300, validation: 138 },
  { name: "Mar", training: 200, validation: 100 },
  { name: "Apr", training: 278, validation: 190 },
  { name: "May", training: 189, validation: 160 },
  { name: "Jun", training: 239, validation: 180 },
  { name: "Jul", training: 349, validation: 230 },
];

// Mock dataset preview
const datasetPreview = [
  { id: 1, feature1: 5.1, feature2: 3.5, feature3: 1.4, label: "Class A" },
  { id: 2, feature1: 4.9, feature2: 3.0, feature3: 1.4, label: "Class A" },
  { id: 3, feature1: 7.0, feature2: 3.2, feature3: 4.7, label: "Class B" },
  { id: 4, feature1: 6.4, feature2: 3.2, feature3: 4.5, label: "Class B" },
  { id: 5, feature1: 6.3, feature2: 3.3, feature3: 6.0, label: "Class C" },
];

const Observatory = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Observatory</h1>
            <p className="text-muted-foreground">
              Visualize and analyze data
            </p>
          </div>
          <Button>
            Create Visualization
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Distribution</CardTitle>
              <CardDescription>
                Scatter plot showing feature relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    points: { color: "#9b87f5" },
                    grid: { color: "#1f2937" },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Feature 1"
                        unit=""
                        stroke="#6B7280"
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Feature 2"
                        unit=""
                        stroke="#6B7280"
                      />
                      <ZAxis
                        type="number"
                        dataKey="z"
                        range={[60, 400]}
                        name="Value"
                        unit=""
                      />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter
                        name="Values"
                        data={scatterData}
                        fill="#9b87f5"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Metrics</CardTitle>
              <CardDescription>
                Training and validation loss over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    training: { color: "#9b87f5" },
                    validation: { color: "#6E59A5" },
                    grid: { color: "#1f2937" },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={areaData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <ChartTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="training"
                        stackId="1"
                        stroke="#9b87f5"
                        fill="#9b87f580"
                        name="Training"
                      />
                      <Area
                        type="monotone"
                        dataKey="validation"
                        stackId="1"
                        stroke="#6E59A5"
                        fill="#6E59A580"
                        name="Validation"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dataset Preview</CardTitle>
            <CardDescription>
              Sample rows from the selected dataset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">ID</th>
                    <th className="px-4 py-2 text-left font-medium">Feature 1</th>
                    <th className="px-4 py-2 text-left font-medium">Feature 2</th>
                    <th className="px-4 py-2 text-left font-medium">Feature 3</th>
                    <th className="px-4 py-2 text-left font-medium">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetPreview.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-2">{row.id}</td>
                      <td className="px-4 py-2">{row.feature1}</td>
                      <td className="px-4 py-2">{row.feature2}</td>
                      <td className="px-4 py-2">{row.feature3}</td>
                      <td className="px-4 py-2">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs ${
                            row.label === "Class A" ? "bg-blue-500/20 text-blue-500" :
                            row.label === "Class B" ? "bg-green-500/20 text-green-500" :
                            "bg-purple-500/20 text-purple-500"
                          }`}
                        >
                          {row.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Observatory;
