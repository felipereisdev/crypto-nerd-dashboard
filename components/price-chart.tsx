"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface PriceChartProps {
  coinId: string
  priceChange: number
  height?: number
}

interface ChartData {
  prices: [number, number][] // [timestamp, price]
}

export function PriceChart({ coinId, priceChange, height = 120 }: PriceChartProps) {
  const [chartData, setChartData] = useState<[number, number][] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true)
      try {
        // Fetch 7 days of hourly price data
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=hourly`,
        )

        if (!response.ok) {
          throw new Error("Failed to fetch chart data")
        }

        const data: ChartData = await response.json()
        setChartData(data.prices)
      } catch (err) {
        console.error("Error fetching chart data:", err)
        setError("Failed to load chart data")
      } finally {
        setIsLoading(false)
      }
    }

    if (coinId) {
      fetchChartData()
    }
  }, [coinId])

  if (isLoading) {
    return <Skeleton className={`w-full h-${height} rounded-md`} />
  }

  if (error || !chartData || chartData.length === 0) {
    // Fallback to a simple generated chart if real data is unavailable
    return <FallbackChart priceChange={priceChange} height={height} />
  }

  // Determine min and max for scaling
  const prices = chartData.map((point) => point[1])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  // Add a small buffer to min/max for better visualization
  const buffer = priceRange * 0.05
  const adjustedMin = minPrice - buffer
  const adjustedMax = maxPrice + buffer

  // Create SVG path
  const createPath = () => {
    const width = 100 // percentage width
    const chartHeight = height - 20 // leave room for labels

    return chartData
      .map((point, i) => {
        const x = (i / (chartData.length - 1)) * width
        const y = chartHeight - ((point[1] - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight
        return `${i === 0 ? "M" : "L"} ${x} ${y}`
      })
      .join(" ")
  }

  // Create area path (filled area under the line)
  const createAreaPath = () => {
    const width = 100 // percentage width
    const chartHeight = height - 20 // leave room for labels

    let path = chartData
      .map((point, i) => {
        const x = (i / (chartData.length - 1)) * width
        const y = chartHeight - ((point[1] - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight
        return `${i === 0 ? "M" : "L"} ${x} ${y}`
      })
      .join(" ")

    // Complete the path by drawing to the bottom right and bottom left corners
    const lastIndex = chartData.length - 1
    const lastX = (lastIndex / (chartData.length - 1)) * width
    path += ` L ${lastX} ${chartHeight} L 0 ${chartHeight} Z`

    return path
  }

  // Determine color based on price change
  const isPositive = priceChange >= 0
  const lineColor = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
  const fillColor = isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Area under the line */}
        <path d={createAreaPath()} fill={fillColor} />

        {/* Price line */}
        <path d={createPath()} fill="none" stroke={lineColor} strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// Fallback chart when API data is unavailable
function FallbackChart({ priceChange, height = 120 }: { priceChange: number; height?: number }) {
  const isPositive = priceChange >= 0
  const lineColor = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
  const fillColor = isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"

  // Generate some fake chart data that trends up or down based on price change
  const generatePoints = () => {
    const points = []
    const pointCount = 30
    const chartHeight = height - 20
    const width = 100

    const trend = isPositive ? -1 : 1 // Start low for positive, high for negative

    for (let i = 0; i < pointCount; i++) {
      const randomVariation = Math.random() * 5 - 2.5
      const trendStrength = Math.abs(priceChange) * 0.3
      const y = chartHeight / 2 + (trend * trendStrength * (i / pointCount) * chartHeight) / 2 + randomVariation
      const x = (i / (pointCount - 1)) * width
      points.push([x, y])
    }

    return points
  }

  const points = generatePoints()

  // Create SVG path
  const createPath = () => {
    return points
      .map((point, i) => {
        return `${i === 0 ? "M" : "L"} ${point[0]} ${point[1]}`
      })
      .join(" ")
  }

  // Create area path
  const createAreaPath = () => {
    let path = points
      .map((point, i) => {
        return `${i === 0 ? "M" : "L"} ${point[0]} ${point[1]}`
      })
      .join(" ")

    const lastPoint = points[points.length - 1]
    const chartHeight = height - 20
    path += ` L ${lastPoint[0]} ${chartHeight} L 0 ${chartHeight} Z`

    return path
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Area under the line */}
        <path d={createAreaPath()} fill={fillColor} />

        {/* Price line */}
        <path d={createPath()} fill="none" stroke={lineColor} strokeWidth="1.5" />
      </svg>
    </div>
  )
}

