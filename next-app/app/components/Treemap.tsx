'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface TreemapData {
  name: string;
  value: number;
}

interface TreemapProps {
  data: TreemapData[];
  title?: string;
  height?: number;
  colors?: string[];
}

const Treemap: React.FC<TreemapProps> = ({
  data,
  title,
  height = 400,
  colors,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize echarts instance
    chartInstance.current = echarts.init(chartRef.current);

    // Transform data for treemap
    const treemapData = data.map(item => ({
      name: item.name,
      value: item.value,
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}: ${params.value?.toLocaleString() || 0} fichiers`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
        },
      },
      series: [
        {
          name: title || 'Fichiers',
          type: 'treemap',
          width: '90%',
          height: '90%',
          top: '5%',
          bottom: '5%',
          label: {
            show: true,
            formatter: (params: any) => {
              return `${params.name}\n(${params.value?.toLocaleString() || 0})`;
            },
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 'bold',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2,
          },
          upperLabel: {
            show: true,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 'bold',
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 0,
                gapWidth: 5,
              },
              upperLabel: {
                show: false,
              },
            },
            {
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 5,
                gapWidth: 1,
              },
              upperLabel: {
                show: true,
                backgroundColor: 'rgba(0,0,0,0.1)',
                color: '#ffffff',
              },
            },
          ],
          data: treemapData,
          color: colors || [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899',
            '#06b6d4',
            '#84cc16',
            '#f97316',
            '#6366f1',
          ],
        },
      ],
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
  }, [data, title, height, colors]);

  return (
    <div
      ref={chartRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="chart-container"
    />
  );
};

export default Treemap;
