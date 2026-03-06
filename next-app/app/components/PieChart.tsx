'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    itemStyle?: {
      color?: string;
    };
  }>;
  title?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  center?: [number, number];
  radius?: [string, string];
  // Options avancees
  tooltipFormatter?: (params: any) => string;
  legendPosition?: 'right' | 'bottom';
  legendFormatter?: (name: string) => string;
  labelShow?: boolean;
  labelFormatter?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  // Legend scrollable for many items
  legendScrollable?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 400,
  colors,
  showLegend = true,
  center = ['50%', '50%'],
  radius = ['0%', '70%'],
  tooltipFormatter,
  legendPosition = 'right',
  legendFormatter,
  labelShow = false,
  labelFormatter = '{b}: {c}',
  borderRadius = 8,
  borderColor = '#fff',
  borderWidth = 2,
  legendScrollable = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialiser l'instance echarts
    chartInstance.current = echarts.init(chartRef.current);

    // Configure legend based on scrollable option
    const legendConfig: echarts.LegendComponentOption = showLegend ? {
      orient: legendPosition === 'bottom' ? 'horizontal' : 'vertical',
      bottom: legendPosition === 'bottom' ? 0 : undefined,
      right: legendPosition === 'right' ? 10 : undefined,
      top: legendPosition === 'right' ? 'center' : undefined,
      textStyle: {
        color: legendPosition === 'bottom' ? '#cbd5e1' : '#6b7280',
      },
      formatter: legendFormatter ? (name) => legendFormatter(name) : undefined,
      type: legendScrollable ? 'scroll' : undefined,
      scrollDataIndex: 0,
      height: legendScrollable && legendPosition === 'right' ? height - 50 : undefined,
    } : { show: false };

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: tooltipFormatter ? (params) => tooltipFormatter(params) : '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
        },
      },
      legend: legendConfig,
      series: [
        {
          name: title || 'Data',
          type: 'pie',
          center,
          radius,
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius,
            borderColor,
            borderWidth,
          },
          label: {
            show: labelShow,
            color: '#e2e8f0',
            formatter: labelFormatter,
          },
          emphasis: {
            label: {
              show: labelShow,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#374151',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          labelLine: {
            show: labelShow,
          },
          data,
          color: colors,
        },
      ],
    };

    chartInstance.current.setOption(option);

    // Gerer le redimensionnement
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, height, colors, showLegend, center, radius, tooltipFormatter, legendPosition, legendFormatter, labelShow, labelFormatter, borderRadius, borderColor, borderWidth, legendScrollable]);

  return (
    <div
      ref={chartRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="chart-container"
    />
  );
};

export default PieChart;
