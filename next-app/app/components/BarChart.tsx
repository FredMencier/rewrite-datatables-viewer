'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  title?: string;
  height?: number;
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  horizontal?: boolean;
  showValues?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 400,
  colors,
  xAxisLabel,
  yAxisLabel,
  horizontal = false,
  showValues = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialiser l'instance echarts
    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
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
        type: horizontal ? 'value' : 'category',
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
        },
        data: horizontal ? undefined : data.map((item) => item.name),
      },
      yAxis: {
        type: horizontal ? 'category' : 'value',
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
        data: horizontal ? data.map((item) => item.name) : undefined,
      },
      series: [
        {
          name: title || 'Value',
          type: 'bar',
          barWidth: '60%',
          data: horizontal
            ? data.map((item) => item.value)
            : data.map((item) => item.value),
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const index = params.dataIndex;
              return colors?.[index] || colors?.[0] || '#3b82f6';
            },
            borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          },
          label: {
            show: showValues,
            position: horizontal ? 'right' : 'top',
            formatter: '{c}',
            color: '#e2e8f0',
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

    // Gérer le redimensionnement
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, height, colors, xAxisLabel, yAxisLabel, horizontal, showValues]);

  return (
    <div
      ref={chartRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="chart-container"
    />
  );
};

export default BarChart;
