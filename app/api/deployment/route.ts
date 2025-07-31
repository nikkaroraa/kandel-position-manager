import { NextResponse } from "next/server"
import { kandelDB } from "@/lib/db"

export async function GET() {
  try {
    const contracts = await kandelDB.getCurrentContracts()
    const deploymentId = await kandelDB.getCurrentDeploymentId()
    const stats = await kandelDB.getStats()
    
    return NextResponse.json({ 
      contracts,
      deploymentId,
      stats
    })
  } catch (error) {
    console.error("Failed to get deployment info:", error)
    return NextResponse.json({ 
      contracts: null,
      deploymentId: null,
      stats: null
    })
  }
}

export async function POST(request: Request) {
  try {
    const { contracts } = await request.json()
    
    if (!contracts || !contracts.mangrove || !contracts.reader || !contracts.kandelSeeder || !contracts.weth || !contracts.usdc) {
      return NextResponse.json(
        { error: "Missing required contract addresses" },
        { status: 400 }
      )
    }
    
    const deploymentId = await kandelDB.saveContractDeployment(contracts)
    
    return NextResponse.json({ 
      success: true, 
      deploymentId 
    })
  } catch (error) {
    console.error("Error saving deployment:", error)
    return NextResponse.json(
      { error: "Failed to save deployment" },
      { status: 500 }
    )
  }
}