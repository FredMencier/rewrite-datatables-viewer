'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface TimeSeriesSeries {
  name: string;
  data: TimeSeriesDataPoint[];
  color?: string;
}

interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  title?: string;
  height?: number;
  colors?: string[];
  showArea?: boolean;
  showGrid?: boolean;
  yAxisLabel?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  title,
  height = 400,
  colors,
  showArea = false,
  showGrid = true,
  yAxisLabel,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialiser l'instance echarts
    chartInstance.current = echarts.init(chartRef.current);

    // Extraire toutes les dates pour l'axe X
    const allDates = series[0]?.data.map((d) => d.date) || [];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#9ca3af',
            type: 'dashed',
          },
        },
      },
      legend: {
        show: series.length > 1,
        data: series.map((s) => s.name),
        top: 0,
        textStyle: {
          color: '#6b7280',
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
        boundaryGap: !showArea,
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        data: allDates,
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
      series: series.map((s, index) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: s.data.map((d) => d.value),
        color: s.color || colors?.[index] || undefined,
        areaStyle: showArea
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: s.color || colors?.[index] || '#3b82f6' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
              ]),
            }
          : undefined,
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      })),
    };

    chartInstance.current.setOption(option);

    // Gérer le redimensionnement
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [series, title, height, colors, showArea, showGrid, yAxisLabel]);

  return (
    <div
      ref={chartRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="chart-container"
    />
  );
};

export default TimeSeriesChart;
