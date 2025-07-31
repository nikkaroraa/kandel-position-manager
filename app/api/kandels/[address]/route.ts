import { NextResponse } from "next/server"
import { kandelDB } from "@/lib/db"

export async function DELETE(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      )
    }
    
    // Remove from database
    await kandelDB.removeKandel(address)
    
    return NextResponse.json({ 
      success: true,
      message: "Kandel removed successfully"
    })
  } catch (error) {
    console.error("Error removing Kandel:", error)
    return NextResponse.json(
      { error: "Failed to remove Kandel" },
      { status: 500 }
    )
  }
}