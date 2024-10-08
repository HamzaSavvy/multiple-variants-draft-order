import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
    const { id } = req.query; // Assuming you're passing the ID as a query parameter
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
    const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION!;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
    const PLATFORM_API_URL = `${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${id}/complete.json`;

    try {
        const response = await axios.put(PLATFORM_API_URL, {}, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
            }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Error completing draft order:', error.message);
        return NextResponse.json({ error: error.message }, { status: (error.response?.status || 500) });
    }
}
