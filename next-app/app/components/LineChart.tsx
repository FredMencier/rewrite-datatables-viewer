'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface LineChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  title?: string;
  height?: number;
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showArea?: boolean;
  showValues?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 400,
  colors,
  xAxisLabel,
  yAxisLabel,
  showArea = false,
  showValues = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize echarts instance
    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          rotate: 45,
        },
        data: data.map((item) => item.name),
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: title || 'Value',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: data.map((item) => item.value),
          itemStyle: {
            color: colors?.[0] || '#3b82f6',
          },
          lineStyle: {
            width: 3,
            color: colors?.[0] || '#3b82f6',
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${colors?.[0] || '#3b82f6'}40` },
                    { offset: 1, color: `${colors?.[0] || '#3b82f6'}05` },
                  ],
                },
              }
            : undefined,
          label: {
            show: showValues,
            position: 'top',
            formatter: '{c}',
            color: '#374151',
            fontSize: 11,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
      color: colors,
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, height, colors, xAxisLabel, yAxisLabel, showArea, showValues]);

  return (
    <div
      ref={chartRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="chart-container"
    />
  );
};

export default LineChart;
