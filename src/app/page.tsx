// src/app/page.tsx or another component rendering OrderProcessor

"use client"; // Mark the parent component as a Client Component

import React, { useState } from 'react';
import OrderProcessor from '../components/OrderProcessor';

export default function HomePage() {
    const [completedOrder, setCompletedOrder] = useState(false);
    const [completedDraftOrderShopify, setCompletedDraftOrderShopify] = useState(false);

    const shopifyDetails = {
        shopify_store_url: "https://learning-with-rhb.myshopify.com",
        shopify_access_token: "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"
    };

    const quantity = 2; // Example quantity
    const request = {}; // Example request object
    const shipping_address = {}; // Example shipping address
    const host = {}; // Example host data

    return (
        <OrderProcessor
            shopifyDetails={shopifyDetails}
            quantity={quantity}
            request={request}
            shipping_address={shipping_address}
            host={host}
            setCompletedOrder={setCompletedOrder}
            completedOrder={completedOrder}
            setCompletedDraftOrderShopify={setCompletedDraftOrderShopify}
        />
    );
}
