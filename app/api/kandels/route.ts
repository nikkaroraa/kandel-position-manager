import { NextResponse } from "next/server"
import { kandelDB } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user')
    
    let kandels
    if (userAddress) {
      kandels = await kandelDB.getKandelsByUser(userAddress)
    } else {
      kandels = await kandelDB.getActiveKandels()
    }
    
    // Return addresses for backward compatibility
    const addresses = kandels.map(k => k.address.toLowerCase())
    
    return NextResponse.json({ 
      addresses,
      kandels // Also return full data
    })
  } catch (error) {
    console.error("Failed to load kandels:", error)
    return NextResponse.json({ addresses: [], kandels: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Support both old format (kandel object) and new format
    const kandelData = body.kandel || body
    
    // Ensure required fields
    if (!kandelData.address || !kandelData.deployedBy) {
      return NextResponse.json(
        { error: "Missing required fields: address, deployedBy" },
        { status: 400 }
      )
    }
    
    const newKandel = await kandelDB.addKandel({
      address: kandelData.address,
      deployedBy: kandelData.deployedBy,
      deployedAt: kandelData.deployedAt || new Date().toISOString(),
      deploymentTx: kandelData.deploymentTx || '',
      name: kandelData.name,
      market: kandelData.market || { base: 'WETH', quote: 'USDC' },
      priceRange: kandelData.priceRange || { min: 0, max: 0 },
      pricePoints: kandelData.pricePoints || 0,
      stepSize: kandelData.stepSize || 1,
      gasreq: kandelData.gasreq || 200000,
      totalBaseDeposited: kandelData.totalBaseDeposited || '0',
      totalQuoteDeposited: kandelData.totalQuoteDeposited || '0',
      provision: kandelData.provision || '0',
      active: kandelData.active !== false,
      source: kandelData.source || 'ui'
    })
    
    return NextResponse.json({ success: true, kandel: newKandel })
  } catch (error) {
    console.error("Error saving Kandel:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save Kandel" },
      { status: 500 }
    )
  }
}