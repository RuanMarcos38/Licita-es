import { NextResponse } from "next/server";
export function GET(){
  return NextResponse.json({status:"ok",service:"Licitações Brasil",source:"PNCP",timestamp:new Date().toISOString()});
}
