"use client"; // Add this to the top
import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/Button';
import LoaderSpinner from './LoaderSpinner';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface OrderProcessorProps {
    shipping_address: any;
    host: any;
    setCompletedOrder: any;
    completedOrder: any;
    request: any;
    setCompletedDraftOrderShopify: any;
    quantity: number;
    shopifyDetails: any;
}
const shopifyDetails = {
    shopify_store_url: "https://learning-with-rhb.myshopify.com",
    shopify_access_token: "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"
};

const checkAvailability = async (variantIds: string[], quantities: number[], shopifyDetails: any) => {
    try {
        const results = await Promise.all(
            variantIds.map(async (variantId, index) => {
                const response = await axios.get(`/api/shopify/check-availability?variantIds=${variantId}&quantities=${quantities[index]}&storeURL=${shopifyDetails?.shopify_store_url}&storeTkn=${shopifyDetails?.shopify_access_token}`);
                console.log('API Response:', response.data); // Log the response data
                return response.data; // Ensure this matches the expected response structure
            })
        );

        // Log availability status for each variant
        results.forEach((result, index) => {
            const requestedQuantity = quantities[index];
            const variantId = result[0]?.variantId; // Access the variantId from the first element in the result array
            
            console.log('Result:', result); // Log each result for debugging

            if (variantId) { // Check if variantId exists
                if (result[0]?.available) {
                    console.log(`Product ${variantId} is available with quantity ${result[0]?.availableQuantity}.`);
                } else {
                    console.log(`Product ${variantId} is not available with the requested quantity of ${requestedQuantity}.`);
                }
            } else {
                console.log(`Variant ID not found for the result at index ${index}.`);
            }
        });

        const unavailableMessages = results
            .filter(result => !result[0]?.available) // Accessing first element again
            .map(result => result[0]?.message) // Accessing first element again
            .join('\n');


        return results;
    } catch (error) {
        console.error('Error checking availability:', error);
        alert('Error checking availability. Please try again later.');
        return null;
    }
};





// Function to create a customer
const createCustomer = async (customer_data: any, shopifyDetails: any) => {
    try {
        const response = await axios.post('/api/shopify/create-customer', { ...customer_data, ...shopifyDetails });
        if (response.status !== 200 && response.status !== 201) {
            return null;
        } else {
            console.log('Customer created:', response.data);
            return response.data;
        }
    } catch (error) {
        console.error('Error creating customer:', error);
        return null;
    }
};

const createDraftOrder = async (orderData: any, shopifyDetails: any) => {
    try {
        // Send orderData directly along with shopifyDetails
        const response = await axios.post('/api/create-draft-order', { ...orderData, ...shopifyDetails });

        // Since axios throws an error for non-2xx responses, you can just return the response data directly
        console.log('Draft order created:', response.data);
        return response.data;

    } catch (error: any) {
        // Improved error logging with additional context
        console.error('Error creating draft order:', error.response ? error.response.data : error.message);
        return null;
    }
};


// Function to complete a draft order
const completeDraftOrder = async (orderId: string, shopifyDetails: any) => {
    try {
        const response = await axios.put(`/api/shopify/complete-draft-order?id=${orderId}`, shopifyDetails);
        console.log('Order completed:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error completing draft order:', error);
        return null;
    }
};

// React component to handle order processing
const OrderProcessor: React.FC<OrderProcessorProps> = ({ shopifyDetails, request, shipping_address, host, setCompletedOrder, completedOrder, setCompletedDraftOrderShopify }: OrderProcessorProps) => {
    const [isDraft, setIsDraft] = useState(true); // Track current action
    const [orderId, setOrderId] = useState<string>(''); // Order ID
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | boolean>(false);
    const [draftResult, setDraftResult] = useState<any>(null);
    const [completeOrderStage, setCompleteOrderPage] = useState<'processed' | 'reviewed' | 'completed' | null>(null);
    
    // Static variant IDs and quantities
    const variantIds = ['44070279151861','44070279119093','44070279020789', '44261798838517']; // Replace with actual variant IDs
    const quantities = [4, 3, 1, 2]; // Replace with actual quantities

    const customerData = {
        "email": host?.email,
        "address": {
            "firstName": shipping_address?.fullName ? shipping_address.fullName.split(' ')[0] : '',
            "lastName": shipping_address?.fullName ? shipping_address.fullName.split(' ')[1] || ' ' : '',
            "address1": shipping_address?.address || '',
            "city": shipping_address?.city || '',
            "province": shipping_address?.state || '',
            "phone": host?.phone_number || '',
            "zip": shipping_address?.zipCode || '',
            "country": shipping_address?.country || ''
        }
    };

    const handleOrderAction = async () => {
        setError(false);
        setLoading(true);
    
        if (isDraft) {
            // Check product availability for all variants
            const availabilityResults = await checkAvailability(variantIds, quantities, shopifyDetails);
    
            if (availabilityResults) {
                // Collect available variants
                const availableItems = availabilityResults.filter(result => result[0]?.available);
                const unavailableItems = availabilityResults.filter(result => !result[0]?.available);
                // Notify about unavailable items
                if (unavailableItems.length > 0) {
                    const unavailableVariantIds = unavailableItems.map(item => item[0]?.variantId).join(', ');
                    alert(`The following products are unavailable: ${unavailableVariantIds}`);
                }
    
                // Proceed only if there are available items
                if (availableItems.length > 0) {
                    // Use hardcoded customer ID if customer creation is skipped
                    const hardcodedCustomerId = '6649588220149'; // Replace with your actual hardcoded customer ID
    
                    // Prepare order data with available line items
                    const lineItems = availableItems.map(item => {
                        const index = variantIds.indexOf(item[0]?.variantId);
                        return {
                            variant_id: item[0]?.variantId,
                            quantity: quantities[index], // Using the original quantity
                            applied_discount: {
                                value: '100.0',
                                value_type: 'percentage',
                                title: 'Rue Discount'
                            },
                        };
                    });
    
                    const orderData = {
                        draft_order: {
                            line_items: lineItems,
                            customer: {
                                id: hardcodedCustomerId // Use the hardcoded customer ID
                            },
                            tags: 'Rue Order',
                            use_customer_default_address: true,
                            note: 'For a Rue event'
                        }
                    };
    
                    // Log the order data
                    console.log('Order Data:', JSON.stringify(orderData, null, 2));
    
                    // Create draft order
                    try {
                        const result = await createDraftOrder(orderData, shopifyDetails);
                        if (result && result.draft_order) {
                            setDraftResult(result.draft_order);
                            setCompleteOrderPage('processed');
                            setCompletedDraftOrderShopify(true);
                            setLoading(false);
                            setOrderId(result.draft_order.id);
                            setIsDraft(false);
                        }
                    } catch (error) {
                        console.error('Error creating draft order:', error.response?.data || error.message);
                        setLoading(false);
                        setError('Error creating draft order: ' + (error.response?.data?.errors || error.message));
                    }
                } else {
                    setLoading(false);
                    setError('Error: Not enough inventory for provided quantities.');
                }
            } else {
                setLoading(false);
                setError('Error checking product availability.');
            }
        } else {
            if (orderId) {
                const completedOrder = await completeDraftOrder(orderId, shopifyDetails);
                if (completedOrder != null) {
                    setLoading(false);
                    setOrderId('');
                    setCompletedOrder(true);
                } else {
                    setError("An Error Occurred While Completing The Order.");
                    setLoading(false);
                    setOrderId('');
                }
            }
        }
    };
    
    
    return (
        <div className='flex flex-col'>
            {/* To Review The Draft Order Details */}
            {!isDraft && draftResult.invoice_url && !completedOrder && (
                <a onClick={() => {
                    if (!completedOrder) { setCompleteOrderPage('reviewed'); }
                }} href={draftResult.invoice_url} target={"_blank"} className='underline text-primary mb-4 flex flex-row items-center justify-center'>
                    {completedOrder ? "Your Order Was Successfully Placed!" : "Click here to review draft order"} 
                    <ArrowTopRightOnSquareIcon height={20} className='ml-2'></ArrowTopRightOnSquareIcon>
                </a>
            )}
            {loading ? (
                <div className='flex justify-center items-center'><LoaderSpinner userType='Brand' /></div>
            ) : (
                <>
                    {!completedOrder ? (
                        <Button onClick={handleOrderAction} disabled={completeOrderStage === "processed" || quantities.length === 0}>
                            {isDraft ? 'Create Draft Order' : (completeOrderStage === "processed") ? 'Place Order' : 'Place Order'}
                        </Button>
                    ) : (
                        <Button onClick={() => window.location.reload()}>
                            Okay
                        </Button>
                    )}
                </>
            )}

            {error && (
                <div className="max-w-xs mt-4 items-center bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-800 dark:border-neutral-700" role="alert" tabIndex={-1} aria-labelledby="hs-toast-error-example-label">
                    <div className="flex p-4">
                        <div className="shrink-0">
                            <svg className="shrink-0 size-4 text-red-500 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM7.5 4.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5zm0 4.5a.5.5 0 1 1 0 1h-1a.5.5 0 0 1 0-1h1z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-400" id="hs-toast-error-example-label">Error:</h3>
                            <div className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default OrderProcessor;
