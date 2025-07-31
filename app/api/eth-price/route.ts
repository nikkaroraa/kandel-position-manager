import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch ETH price')
    }
    
    const data = await response.json()
    const price = data.ethereum?.usd || 0
    
    return NextResponse.json({ price })
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    return NextResponse.json({ price: 2500 }, { status: 500 }) // Fallback price
  }
}