// route.ts

import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

interface VariantResponse {
    variant: {
        id: number;
        inventory_quantity: number;
    };
}

export async function GET(req: NextRequest) {
    if (req.method !== 'GET') {
        return NextResponse.json({ error: `Method ${req.method} Not Allowed` }, { status: 405 });
    }

    const url = new URL(req.url);
    const variantIds = url.searchParams.get('variantIds');
    const quantities = url.searchParams.get('quantities');
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
    const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
        return NextResponse.json({ error: "Please Provide Access Token To Check Availability" }, { status: 422 });
    }

    if (!variantIds || !quantities) {
        return NextResponse.json({ error: 'Variant IDs and quantities are required' }, { status: 400 });
    }

    const variantIdArray = variantIds.split(',').map(id => id.trim());
    const quantityArray = quantities.split(',').map(q => parseInt(q.trim()));

    if (variantIdArray.length !== quantityArray.length) {
        return NextResponse.json({ error: 'Variant IDs and quantities must have the same length' }, { status: 400 });
    }

    const results = await Promise.all(variantIdArray.map(async (variantId, index) => {
        try {
            const response = await axios.get<VariantResponse>(`${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });
    
            const variant = response.data.variant;
            const availableQuantity = variant ? variant.inventory_quantity : 0;
            const isAvailable = availableQuantity >= quantityArray[index]; // Check if inventory is enough
    
            return {
                variantId: variantId, // Ensure we return the variantId here
                available: isAvailable,
                availableQuantity, // Return the actual available quantity for more context
                message: isAvailable 
                    ? `Product ${variantId} is available with quantity ${availableQuantity}` 
                    : `Product ${variantId} is not available with the requested quantity of ${quantityArray[index]}`
            };
        } catch (error: any) {
            console.error(`Error checking availability for variant ${variantId}:`, error.message);
            return { 
                variantId: variantId, // Ensure variantId is included in case of error
                available: false, 
                availableQuantity: 0, 
                message: `Error: ${error.message || 'Unknown error'}` 
            };
        }
    }));
    

    return NextResponse.json(results);
}
