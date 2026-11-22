import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFinance, formatCompact, formatMoney, type CurrencyCode } from '@/lib/finance'
import { Panel, PanelHeader } from '@/components/ui'

type ThemePalette = {
  brand: string
  income: string
  expense: string
  warn: string
  grid: string
  muted: string
  surface: string
  fg: string
}

const PALETTES: Record<'dark' | 'light', ThemePalette> = {
  dark: {
    brand: '#7c93ff',
    income: '#34d399',
    expense: '#fb7185',
    warn: '#fbbf24',
    grid: '#222a38',
    muted: '#8b95a8',
    surface: '#151a24',
    fg: '#e9edf5',
  },
  light: {
    brand: '#3b5bdb',
    income: '#0f9d70',
    expense: '#d93a52',
    warn: '#b45309',
    grid: '#e2e7f0',
    muted: '#5f6b80',
    surface: '#f1f4fa',
    fg: '#101828',
  },
}

export const SERIES_COLORS = ['#7c93ff', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#22d3ee', '#f97316', '#94a3b8']

export function useChartPalette() {
  const theme = useFinance((state) => state.settings.theme)
  return PALETTES[theme] ?? PALETTES.dark
}

function useTooltipStyle() {
  const palette = useChartPalette()
  return {
    contentStyle: {
      background: palette.surface,
      border: `1px solid ${palette.grid}`,
      borderRadius: 12,
      fontSize: 12,
      color: palette.fg,
      padding: '8px 10px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
    } as React.CSSProperties,
    labelStyle: { color: palette.muted, fontSize: 11, marginBottom: 2 } as React.CSSProperties,
    itemStyle: { color: palette.fg, fontSize: 12 } as React.CSSProperties,
  }
}

export type ChartPoint = { label: string } & Record<string, string | number>

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Panel className={className}>
      <PanelHeader title={title} subtitle={subtitle} action={action} />
      <div className="px-2 pt-4 pb-3 sm:px-3">{children}</div>
    </Panel>
  )
}

export function AreaTrendChart({
  data,
  dataKey,
  currency,
  height = 240,
  color,
  name = 'Сумма',
}: {
  data: ChartPoint[]
  dataKey: string
  currency: CurrencyCode
  height?: number
  color?: string
  name?: string
}) {
  const palette = useChartPalette()
  const tooltip = useTooltipStyle()
  const stroke = color ?? palette.brand

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" stroke={palette.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={(value) => formatCompact(Number(value), currency)}
        />
        <Tooltip
          {...tooltip}
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#area-${dataKey})`}
          activeDot={{ r: 4, strokeWidth: 0 }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function GroupedBarsChart({
  data,
  series,
  currency,
  height = 240,
  stacked = false,
}: {
  data: ChartPoint[]
  series: { key: string; name: string; color: string }[]
  currency: CurrencyCode
  height?: number
  stacked?: boolean
}) {
  const palette = useChartPalette()
  const tooltip = useTooltipStyle()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={4}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" stroke={palette.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={(value) => formatCompact(Number(value), currency)}
        />
        <Tooltip
          {...tooltip}
          cursor={{ fill: palette.grid, opacity: 0.35 }}
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8 }} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.name}
            fill={item.color}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
            maxBarSize={38}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryPieChart({
  data,
  currency,
  height = 240,
}: {
  data: { name: string; value: number }[]
  currency: CurrencyCode
  height?: number
}) {
  const tooltip = useTooltipStyle()
  const palette = useChartPalette()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="52%"
          outerRadius="78%"
          paddingAngle={2}
          stroke={palette.surface}
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltip} formatter={(value) => formatMoney(Number(value), currency)} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
