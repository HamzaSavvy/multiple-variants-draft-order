import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
    const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION!;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
    const PLATFORM_API_URL = `${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json`;

    try {
        const requestBody = await req.json();
        
        // Log the request body to debug
        console.log('Request Body:', JSON.stringify(requestBody, null, 2));

        const response = await axios.post(PLATFORM_API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
            }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        // Log the entire error response
        console.error('Error creating draft order:', error.response ? error.response.data : error.message);
        return NextResponse.json({ error: error.message }, { status: (error.response?.status || 500) });
    }
}
