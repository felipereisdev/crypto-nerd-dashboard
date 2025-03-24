"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Star, RefreshCw, Trash2, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import React from "react"

interface Coin {
  id: number
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap_rank: number
  market_cap: number
  cmc_rank: number
}

// CoinMarketCap API response interfaces
interface CMCListingsResponse {
  data: {
    id: number
    name: string
    symbol: string
    slug: string
    cmc_rank: number
    quote: {
      USD: {
        price: number
        percent_change_24h: number
        market_cap: number
      }
    }
  }[]
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
  }
}

interface CMCGlobalResponse {
  data: {
    btc_dominance: number
    total_market_cap: {
      USD: number
    }
  }
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
  }
}

interface CMCSearchResponse {
  data: {
    id: number
    name: string
    symbol: string
    slug: string
    rank: number
  }[]
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
  }
}

export default function CryptoDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Coin[]>([])
  const [favorites, setFavorites] = useState<Coin[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [bitcoinDominance, setBitcoinDominance] = useState<number | null>(null)
  const [totalMarketCap, setTotalMarketCap] = useState<number | null>(null)
  const [allCoins, setAllCoins] = useState<Coin[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isTVMode, setIsTVMode] = useState(false)
  
  // Use refs to prevent infinite loops and ensure we only make updates when appropriate
  const favoritesRef = React.useRef<Coin[]>([])
  const fetchingRef = React.useRef<boolean>(false)

  // Update ref when favorites change
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites])

  // Mark component as mounted to avoid hydration issues
  useEffect(() => {
    setIsMounted(true)
    setCurrentTime(new Date())
    
    // Detectar se está sendo exibido em uma TV
    const detectTV = () => {
      // Smart TVs geralmente têm telas grandes e user agents específicos
      const isTV = 
        window.innerWidth >= 1280 && 
        window.innerHeight >= 720 &&
        (navigator.userAgent.includes('TV') || 
         navigator.userAgent.includes('SmartTV') || 
         navigator.userAgent.includes('WebOS') ||
         navigator.userAgent.includes('Tizen') ||
         document.documentElement.clientWidth >= 1280);
      
      if (isTV) {
        document.body.classList.add('tv-mode');
        setIsTVMode(true);
      } else {
        document.body.classList.remove('tv-mode');
        setIsTVMode(false);
      }
    };
    
    // Verificar na carga inicial
    detectTV();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', detectTV);
    
    return () => {
      window.removeEventListener('resize', detectTV);
    };
  }, [])

  // Update clock every second - only after mounting
  useEffect(() => {
    if (!isMounted) return

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [isMounted])

  // Update global data (BTC dominance and total market cap) every 1 hour
  useEffect(() => {
    // Only run on client and when component is mounted
    if (!isMounted) return;
    
    // Formato para exibir market cap de forma legível
    const formatMarketCapValue = (marketCap: number) => {
      if (marketCap >= 1_000_000_000_000) {
        return `$${(marketCap / 1_000_000_000_000).toFixed(2)}T`
      } else if (marketCap >= 1_000_000_000) {
        return `$${(marketCap / 1_000_000_000).toFixed(2)}B`
      } else if (marketCap >= 1_000_000) {
        return `$${(marketCap / 1_000_000).toFixed(2)}M`
      } else {
        return `$${(marketCap / 1_000).toFixed(2)}K`
      }
    };
    
    const fetchGlobalData = async () => {
      try {
        console.log(`[${new Date().toLocaleTimeString()}] Fetching global market data...`);
        
        // Use the correct endpoint for BTC data
        const response = await fetch("/api/proxy?endpoint=/v2/cryptocurrency/quotes/latest&symbol=BTC", {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) throw new Error("Failed to fetch global data");

        const data = await response.json();

        if (data.status?.error_code !== 0) {
          throw new Error(data.status?.error_message || "API Error");
        }

        // Get Bitcoin dominance from the BTC data
        if (
          data.data &&
          data.data.BTC &&
          data.data.BTC[0] &&
          data.data.BTC[0].quote &&
          data.data.BTC[0].quote.USD &&
          typeof data.data.BTC[0].quote.USD.market_cap_dominance !== "undefined"
        ) {
          setBitcoinDominance(data.data.BTC[0].quote.USD.market_cap_dominance);
          console.log(`[${new Date().toLocaleTimeString()}] BTC dominance updated: ${data.data.BTC[0].quote.USD.market_cap_dominance.toFixed(2)}%`);
        } else {
          console.error("BTC dominance data not found in response");
        }

        // Get total market cap from a separate request
        const globalResponse = await fetch("/api/proxy?endpoint=/v1/global-metrics/quotes/latest", {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
          },
        });

        if (!globalResponse.ok) throw new Error("Failed to fetch global market data");

        const globalData = await globalResponse.json();

        if (globalData.status?.error_code !== 0) {
          throw new Error(globalData.status?.error_message || "API Error");
        }

        // Check different possible structures for total market cap
        let updatedMarketCap = null;
        
        if (
          globalData.data &&
          globalData.data.quote &&
          globalData.data.quote.USD &&
          typeof globalData.data.quote.USD.total_market_cap !== "undefined"
        ) {
          updatedMarketCap = globalData.data.quote.USD.total_market_cap;
          setTotalMarketCap(updatedMarketCap);
        } else if (
          globalData.data &&
          globalData.data.total_market_cap &&
          typeof globalData.data.total_market_cap.USD !== "undefined"
        ) {
          updatedMarketCap = globalData.data.total_market_cap.USD;
          setTotalMarketCap(updatedMarketCap);
        } else {
          console.error("Total market cap data not found in response");
        }
        
        if (updatedMarketCap) {
          console.log(`[${new Date().toLocaleTimeString()}] Total market cap updated: ${formatMarketCapValue(updatedMarketCap)}`);
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] Global market data updated successfully`);
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error fetching global data:`, error);
      }
    };

    // Run initial update
    console.log(`[${new Date().toLocaleTimeString()}] Setting up global data update interval (1 hour)`);
    fetchGlobalData();
    
    // Set up interval for hourly updates (3600000 ms = 1 hour)
    const interval = setInterval(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Hourly global data update triggered`);
      fetchGlobalData();
    }, 3600000); 

    return () => {
      console.log(`[${new Date().toLocaleTimeString()}] Clearing global data update interval`);
      clearInterval(interval);
    };
  }, [isMounted]);

  // Load favorites from localStorage on initial render - only on client
  useEffect(() => {
    if (!isMounted) return
    
    const savedFavorites = localStorage.getItem("cryptoFavorites")
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (e) {
        console.error("Failed to parse favorites from localStorage", e)
      }
    }
  }, [isMounted])

  // Save favorites to localStorage whenever they change - only on client
  useEffect(() => {
    if (!isMounted) return
    
    localStorage.setItem("cryptoFavorites", JSON.stringify(favorites))
  }, [favorites, isMounted])

  // Fetch all coins on initial load for search functionality
  useEffect(() => {
    // Only run on client and when component is mounted
    if (!isMounted) return;
    
    const fetchAllCoins = async () => {
      try {
        // Use the correct endpoint format
        const response = await fetch("/api/proxy?endpoint=/v1/cryptocurrency/listings/latest&limit=100")

        if (!response.ok) throw new Error("Failed to fetch coins")

        // Debug log - inspect response structure
        const rawData = await response.text();
        console.log("Raw API response:", rawData.substring(0, 500) + "...")
        
        const data = JSON.parse(rawData);

        if (data.status?.error_code !== 0) {
          throw new Error(data.status?.error_message || "API Error")
        }

        // Transform the data to match our Coin interface
        const coins: Coin[] = data.data.map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
          current_price: coin.quote.USD.price,
          price_change_percentage_24h: coin.quote.USD.percent_change_24h,
          market_cap_rank: coin.cmc_rank,
          market_cap: coin.quote.USD.market_cap,
          cmc_rank: coin.cmc_rank,
        }))

        setAllCoins(coins)
      } catch (error) {
        console.error("Error fetching all coins:", error)
      }
    }

    fetchAllCoins()
  }, [isMounted])

  // Auto-refresh prices every 15 minutes
  useEffect(() => {
    // Only run on client and when component is mounted
    if (!isMounted) return;

    const updatePrices = async () => {
      // Only update if we have favorites and we're not already fetching
      if (fetchingRef.current || favoritesRef.current.length === 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Skipping update - ${fetchingRef.current ? 'already fetching' : 'no favorites'}`);
        return;
      }
      
      fetchingRef.current = true;
      setIsLoading(true);
      
      console.log(`[${new Date().toLocaleTimeString()}] Auto-updating prices for coins:`, favoritesRef.current.map(c => c.symbol).join(','));
      try {
        // Get the IDs of favorite coins from the ref to avoid stale closures
        const ids = favoritesRef.current.map((coin) => coin.id).join(",");

        const response = await fetch(`/api/proxy?endpoint=/v1/cryptocurrency/quotes/latest&id=${ids}`, {
          // Add cache: 'no-store' to avoid browser caching
          cache: 'no-store',
          // Add timestamp to prevent caching
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) throw new Error("Failed to fetch updated prices");

        const data = await response.json();

        if (data.status?.error_code !== 0) {
          throw new Error(data.status?.error_message || "API Error");
        }

        // Only update if we still have favorites
        if (favoritesRef.current.length > 0) {
          // Update the favorites with the latest data
          const updatedFavorites = favoritesRef.current.map((favorite) => {
            const coinData = data.data[favorite.id];
            if (!coinData) return favorite;

            return {
              ...favorite,
              current_price: coinData.quote.USD.price,
              price_change_percentage_24h: coinData.quote.USD.percent_change_24h,
              market_cap: coinData.quote.USD.market_cap,
              market_cap_rank: coinData.cmc_rank,
            };
          });

          setFavorites(updatedFavorites);
          setLastUpdated(new Date());
          console.log(`[${new Date().toLocaleTimeString()}] Prices updated successfully`);
        }
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error updating prices:`, error);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    // Run the first update immediately
    if (favorites.length > 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Setting up auto-update interval (15 minutes)`);
      updatePrices();
    }
    
    // Set up interval for subsequent updates
    const interval = setInterval(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Interval triggered`);
      updatePrices();
    }, 900000); // Update every 15 minutes

    return () => {
      console.log(`[${new Date().toLocaleTimeString()}] Clearing auto-update interval`);
      clearInterval(interval);
    }
    
  }, [isMounted, favorites.length]); // Depend on isMounted and favorites.length to recreate the interval when favorites change

  // Monitora o estado online/offline
  useEffect(() => {
    if (!isMounted) return;

    const handleOnline = () => {
      setIsOnline(true);
      console.log("[Conexão] Online - Atualizando dados");
      handleRefresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("[Conexão] Offline - Modo offline ativado");
    };

    // Verificar estado inicial
    setIsOnline(navigator.onLine);

    // Adicionar listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Adicionar listener para mensagens do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'refresh') {
          console.log("[Service Worker] Solicitação de atualização recebida");
          handleRefresh();
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isMounted]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      // First try to search using the CoinMarketCap search endpoint
      const response = await fetch(
        `/api/proxy?endpoint=/v1/cryptocurrency/map&symbol=${searchTerm.toUpperCase()}&limit=10`,
      )

      if (!response.ok) throw new Error("Failed to search coins")

      const data: CMCSearchResponse = await response.json()

      if (data.status.error_code !== 0) {
        throw new Error(data.status.error_message || "API Error")
      }

      if (data.data.length > 0) {
        // If we found coins by symbol, get their detailed data
        const ids = data.data.map((coin) => coin.id).join(",")

        const detailsResponse = await fetch(`/api/proxy?endpoint=/v1/cryptocurrency/quotes/latest&id=${ids}`)

        if (!detailsResponse.ok) throw new Error("Failed to fetch coin details")

        const detailsData = await detailsResponse.json()

        if (detailsData.status.error_code !== 0) {
          throw new Error(detailsData.status.error_message || "API Error")
        }

        // Transform the data to match our Coin interface
        const results: Coin[] = Object.values(detailsData.data).map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
          current_price: coin.quote.USD.price,
          price_change_percentage_24h: coin.quote.USD.percent_change_24h,
          market_cap_rank: coin.cmc_rank,
          market_cap: coin.quote.USD.market_cap,
          cmc_rank: coin.cmc_rank,
        }))

        setSearchResults(results)
      } else {
        // If no results by symbol, try searching by name in our cached coins
        const filteredCoins = allCoins
          .filter(
            (coin) =>
              coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .slice(0, 10)

        setSearchResults(filteredCoins)
      }
    } catch (error) {
      console.error("Error searching coins:", error)

      // Fallback to searching in our cached coins
      const filteredCoins = allCoins
        .filter(
          (coin) =>
            coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .slice(0, 10)

      setSearchResults(filteredCoins)
    } finally {
      setIsSearching(false)
    }
  }

  const addToFavorites = (coin: Coin) => {
    if (!favorites.some((fav) => fav.id === coin.id)) {
      setFavorites((prev) => [...prev, coin])
    }
  }

  const removeFromFavorites = (coinId: number) => {
    setFavorites((prev) => prev.filter((coin) => coin.id !== coinId))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: price < 1 ? 6 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price)
  }

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1_000_000_000_000) {
      return `$${(marketCap / 1_000_000_000_000).toFixed(2)}T`
    } else if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toFixed(2)}B`
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toFixed(2)}M`
    } else {
      return `$${(marketCap / 1_000).toFixed(2)}K`
    }
  }

  const handleRefresh = async () => {
    // Don't refresh if already loading or no favorites
    if (fetchingRef.current || isLoading || favoritesRef.current.length === 0) return;

    fetchingRef.current = true;
    setIsLoading(true);
    
    try {
      // Get the IDs of favorite coins from the ref
      const ids = favoritesRef.current.map((coin) => coin.id).join(",");
      const symbols = favoritesRef.current.map((coin) => coin.symbol).join(",");

      console.log(`[${new Date().toLocaleTimeString()}] Manual refresh initiated for coins:`, symbols);
      const response = await fetch(`/api/proxy?endpoint=/v1/cryptocurrency/quotes/latest&id=${ids}`, {
        cache: 'no-store', // Prevent browser caching
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) throw new Error("Failed to fetch updated prices");

      const data = await response.json();

      if (data.status?.error_code !== 0) {
        throw new Error(data.status?.error_message || "API Error");
      }

      // Only update if we still have favorites
      if (favoritesRef.current.length > 0) {
        // Update the favorites with the latest data
        const updatedFavorites = favoritesRef.current.map((favorite) => {
          const coinData = data.data[favorite.id];
          if (!coinData) return favorite;

          return {
            ...favorite,
            current_price: coinData.quote.USD.price,
            price_change_percentage_24h: coinData.quote.USD.percent_change_24h,
            market_cap: coinData.quote.USD.market_cap,
            market_cap_rank: coinData.cmc_rank,
          };
        });

        setFavorites(updatedFavorites);
        setLastUpdated(new Date());
        console.log(`[${new Date().toLocaleTimeString()}] Manual refresh completed successfully`);
      }
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] Error updating prices:`, error);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }

  // Simple inline chart component
  const InlineChart = ({ priceChange }: { priceChange: number }) => {
    if (!isMounted) return null;
    
    const isPositive = priceChange >= 0
    const color = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
    const width = isTVMode ? 140 : 100
    const height = isTVMode ? 40 : 30
    const strokeWidth = isTVMode ? 3 : 2

    // Generate some fake chart data that trends up or down based on price change
    const generatePoints = () => {
      const points = []
      const pointCount = 20
      const height = isTVMode ? 40 : 30
      const width = isTVMode ? 140 : 100

      const trend = isPositive ? -1 : 1 // Start low for positive, high for negative

      for (let i = 0; i < pointCount; i++) {
        const randomVariation = Math.random() * 3 - 1.5
        const trendStrength = Math.abs(priceChange) * 0.2
        const y = height / 2 + (trend * trendStrength * (i / pointCount) * height) / 2 + randomVariation
        const x = (i / (pointCount - 1)) * width
        points.push(`${x},${y}`)
      }

      return points.join(" ")
    }

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="ml-2 tv-chart">
        <polyline points={generatePoints()} fill="none" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    )
  }

  return (
    <div className={`min-h-screen bg-black text-green-400 p-4 font-mono landscape-container ${isTVMode ? 'tv-container' : ''}`}>
      <header className="mb-6 landscape-header">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg landscape-time">
            <Clock className="h-5 w-5 text-green-500" />
            <span className="text-green-400 font-bold">
              {isMounted ? currentTime?.toLocaleTimeString() : "--:--:--"}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-center landscape-title">CryptoNerd Dashboard</h1>

          <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg landscape-btc">
            <span className="text-xs text-green-400">
              BTC Dominance:{" "}
              <span className="font-bold">{bitcoinDominance ? `${bitcoinDominance.toFixed(2)}%` : "..."}</span>
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-center text-green-600 mb-4">
          <div className="bg-gray-900 px-3 py-2 rounded-lg flex items-center">
            <span>Total Market Cap: {totalMarketCap ? formatMarketCap(totalMarketCap) : "..."}</span>
            <div className={`ml-3 w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="ml-1 text-xs text-gray-400">{isOnline ? "Online" : "Offline"}</span>
          </div>

          {lastUpdated && isMounted ? (
            <div className="flex items-center justify-center gap-1">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-500 hover:text-green-400"
                onClick={handleRefresh}
                disabled={isLoading || !isOnline}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          ) : (
            <span>Waiting for data...</span>
          )}
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-2 w-full bg-gray-900 mb-4">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="favorites" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
            Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <div className="grid gap-4">
            {favorites.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
                <p className="text-gray-500">No favorites added yet.</p>
                <p className="text-gray-500 text-sm mt-2">Go to the Favorites tab to add cryptocurrencies.</p>
              </div>
            ) : (
              <ScrollArea className={`${isTVMode ? 'h-[calc(100vh-250px)]' : 'h-[calc(100vh-200px)]'}`}>
                <div className={`grid gap-4 ${isTVMode ? 'grid-cols-2' : 'landscape-card-grid'}`}>
                  {favorites.map((coin) => (
                    <Card key={coin.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                      <CardContent className="p-4 card-content">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10">
                              {isLoading ? (
                                <Skeleton className="w-10 h-10 rounded-full" />
                              ) : (
                                <img
                                  src={coin.image || "/placeholder.svg"}
                                  alt={coin.name}
                                  className="w-10 h-10 rounded-full"
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold">{coin.name}</h3>
                                <Badge variant="outline" className="uppercase text-xs">
                                  {coin.symbol}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>Rank #{coin.market_cap_rank || coin.cmc_rank}</span>
                                <span className="text-gray-600">|</span>
                                <span>Market Cap: {formatMarketCap(coin.market_cap)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="font-bold text-lg">
                              {isLoading ? <Skeleton className="h-6 w-24 ml-auto" /> : formatPrice(coin.current_price)}
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`text-xs ${coin.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {isLoading ? (
                                  <Skeleton className="h-4 w-16" />
                                ) : (
                                  `${coin.price_change_percentage_24h >= 0 ? "+" : ""}${coin.price_change_percentage_24h.toFixed(2)}%`
                                )}
                              </span>
                              {!isLoading && isMounted && <InlineChart priceChange={coin.price_change_percentage_24h} />}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 text-red-500 hover:text-red-400 hover:bg-gray-800"
                            onClick={() => removeFromFavorites(coin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search coins..."
                className="pl-8 bg-gray-900 border-gray-700 text-green-400 placeholder:text-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-green-700 hover:bg-green-600 text-black"
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          <ScrollArea className={`${isTVMode ? 'h-[calc(100vh-330px)]' : 'h-[calc(100vh-250px)]'}`}>
            <div className={`grid gap-4 ${isTVMode ? 'grid-cols-2' : 'landscape-card-grid'}`}>
              {isSearching ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="bg-gray-900 border-gray-800">
                      <CardContent className="p-4 card-content">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div>
                              <Skeleton className="h-5 w-32 mb-1" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : searchResults.length > 0 ? (
                searchResults.map((coin) => (
                  <Card key={coin.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={coin.image || "/placeholder.svg"}
                            alt={coin.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold">{coin.name}</h3>
                              <Badge variant="outline" className="uppercase text-xs">
                                {coin.symbol}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>Rank #{coin.market_cap_rank || coin.cmc_rank}</span>
                              <span className="text-gray-600">|</span>
                              <span>Market Cap: {formatMarketCap(coin.market_cap)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-bold text-lg">{formatPrice(coin.current_price)}</div>
                          <div className="flex items-center">
                            <span
                              className={`text-xs ${coin.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {`${coin.price_change_percentage_24h >= 0 ? "+" : ""}${coin.price_change_percentage_24h.toFixed(2)}%`}
                            </span>
                            {isMounted && <InlineChart priceChange={coin.price_change_percentage_24h} />}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`text-yellow-500 hover:text-yellow-400 hover:bg-gray-800 ${
                            favorites.some((fav) => fav.id === coin.id) ? "opacity-50" : ""
                          }`}
                          onClick={() => addToFavorites(coin)}
                          disabled={favorites.some((fav) => fav.id === coin.id)}
                        >
                          <Star
                            className="h-5 w-5"
                            fill={favorites.some((fav) => fav.id === coin.id) ? "currentColor" : "none"}
                          />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : searchTerm ? (
                <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-500">No results found.</p>
                  <p className="text-gray-500 text-sm mt-2">Try a different search term.</p>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-500">Search for cryptocurrencies to add to your favorites.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Try searching by name or symbol (e.g., "Bitcoin" or "BTC").
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

