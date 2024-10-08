import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { variantId, quantity, storeURL, storeTkn } = req.query;
  const response = await axios.get(`${storeURL}/admin/api/2024-04/variants/${variantId}.json`, {
    headers: {
      'X-Shopify-Access-Token': storeTkn
    }
  });
  const variant = response.data.variant;
  const available = variant.inventory_quantity >= quantity;
  return NextResponse.json({ available });
}
