import { type NextRequest, NextResponse } from "next/server"

// CoinMarketCap API key from environment variables
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY
const CMC_BASE_URL = "https://pro-api.coinmarketcap.com"

export async function GET(request: NextRequest) {
  try {
    // Get the endpoint from the query parameters
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint parameter is required" }, { status: 400 })
    }

    if (!CMC_API_KEY) {
      console.error("CoinMarketCap API key is not set")
      return NextResponse.json({ 
        error: "API key configuration error", 
        message: "Please add your CoinMarketCap API key to the .env.local file and restart the server"
      }, { status: 500 })
    }

    // Build query string from all non-endpoint parameters
    const queryParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") {
        queryParams.append(key, value)
      }
    })

    // Construct the full URL - adding a / between base URL and endpoint if needed
    const url = `${CMC_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    console.log(`Proxying request to: ${url}`)

    // Make the request to CoinMarketCap API
    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": CMC_API_KEY,
        "Accept": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds to avoid hitting rate limits
    })

    // Log the response status for debugging
    console.log(`CoinMarketCap API status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinMarketCap API error (${response.status}):`, errorText);
      return NextResponse.json({ 
        error: `CoinMarketCap API error: ${response.status}`, 
        details: errorText,
        endpoint: endpoint,
        url: url 
      }, { status: response.status })
    }

    const data = await response.json()

    // Log a snippet of the response for debugging
    console.log(`API response for ${endpoint}:`, JSON.stringify(data).substring(0, 200) + "...")

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Proxy error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch data from CoinMarketCap", 
      details: error.message,
      message: "Make sure you have a valid CoinMarketCap API key in your .env.local file"
    }, { status: 500 })
  }
}

