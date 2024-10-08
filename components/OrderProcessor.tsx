import React, { useState } from 'react';
import axios from 'axios';
import { Button } from 'ui/button';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface OrderProcessorProps {
    shipping_address: any;
    host: any;
    setCompletedOrder: any;
    completedOrder: any;
    request: any;
    setCompletedDraftOrderShopify:any;
    quantity:number;
    shopifyDetails:any;
}

// Function to check product availability
const checkAvailability = async (variantId: string, quantity: number, shopifyDetails:any) => {
    try {
        const response = await axios.get(`/api/shopify/check-availability?variantId=${variantId}&quantity=${quantity}&storeURL=${shopifyDetails?.shopify_store_url}&storeTkn=${shopifyDetails?.shopify_access_token}`);
        console.log('Quantity:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error checking availability:', error);
        return null;
    }
};

// Function to create a customer
const createCustomer = async (customer_data: any, shopifyDetails:any) => {
    try {
        const response = await axios.post('/api/shopify/create-customer', {...customer_data,...shopifyDetails});
        if((response.status !== 200) && (response.status !== 201)){
            return null;
        }
        else{
            console.log('Customer created:', response.data);
            return response.data;
        } 
    } catch (error) {
        console.error('Error creating customer:', error);
        return null;
    }
};

// Function to create a draft order
const createDraftOrder = async (orderData: any, shopifyDetails:any) => {
    try {
        const response = await axios.post('/api/shopify/create-draft-order', {orderData,...shopifyDetails});
        if((response.status !== 200) && (response.status !== 201)){
            return null;
        }
        else{
            console.log('Draft order created:', response.data);
            return response.data;
        }
    } catch (error) {
        console.error('Error creating draft order:', error);
        return null;
    }
};

// Function to complete a draft order
const completeDraftOrder = async (orderId: string, shopifyDetails:any) => {
    try {
        const response = await axios.put(`/api/shopify/complete-draft-order?id=${orderId}`,shopifyDetails);
        console.log('Order completed:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error completing draft order:', error);
        return null;
    }
};

// React component to handle order processing
const OrderProcessor: React.FC<OrderProcessorProps> = ({ shopifyDetails, quantity, request, shipping_address, host, setCompletedOrder, completedOrder,setCompletedDraftOrderShopify }: OrderProcessorProps) => {
    const [isDraft, setIsDraft] = useState(true); // Track current action
    const [orderId, setOrderId] = useState<string>(''); // Order ID
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | boolean>(false);
    const [draftResult, setDraftResult] = useState<any>(null);
    const [completeOrderStage, setCompleteOrderPage] = useState<'processed' | 'reviewed' | 'completed' | null>(null);
    const customerData = {
        "email": host?.email,
        "address":{
            "firstName": shipping_address?.fullName.split(' ')[0],
            "lastName": shipping_address?.fullName.split(' ')[1] || ' ',
            "address1": shipping_address?.address,
            "city": shipping_address?.city,
            "province": shipping_address?.state,
            "phone": host?.phone_number,
            "zip": shipping_address?.zipCode,
            "country": shipping_address?.country
        }
    };

const handleOrderAction = async () => {
    setError(false);
    setLoading(true);
    if (isDraft) {
        // Check product availability with dynamic quantity
        const availability = await checkAvailability(request?.product?.variant_id, quantity, shopifyDetails);
        if (availability && availability.available) {
            // Create a new customer and process order
            const {customer} = await createCustomer(customerData,shopifyDetails);
            if (customer) {
                // Prepare order data with the new customer
                const orderData = {
                    draft_order: {
                        line_items: [
                            {
                                variant_id: request?.product?.variant_id,
                                quantity: quantity, // Specify the quantity for the draft order
                                applied_discount: {
                                    value: '100.0',
                                    value_type: 'percentage',
                                    title: 'Rue Discount'
                                },
                            }
                        ],
                        customer: {
                            id: customer.id
                        },
                        tags: 'Rue Order',
                        use_customer_default_address: true,
                        note: 'For a Rue event',
                        note_attributes: [
                            {
                                name: 'Event Name',
                                value: request?.event?.title
                            },
                            {
                                name: 'Event Date',
                                value: shortDate(request?.event?.date)
                            }
                        ]
                    }
                };

                const result = await createDraftOrder(orderData,shopifyDetails);
                if (result && result.draft_order) {
                    setDraftResult(result.draft_order);
                    setCompleteOrderPage('processed');
                    setCompletedDraftOrderShopify(true);
                    setLoading(false);
                    setOrderId(result.draft_order.id);
                    setIsDraft(false);
                }
            }
            else{
                setLoading(false);
                setError('Error Creating Draft Order: Could Not Create The Customer');
            }
        } else {
            setLoading(false);
            setError(`Error: Not enough inventory for provided quantity.`);
        }
    } else {
        if (orderId) {
            const completedOrder = await completeDraftOrder(orderId, shopifyDetails);
            if (completedOrder != null) {
                const updatedReqError = await confirmShipping(request.uid, "Tracking Link Will Be Sent To Email");
                if (!updatedReqError) {
                    setLoading(false);
                    setOrderId('');
                    setCompletedOrder(true);
                    // { request && request.brand && request.host?.email && (process?.env?.NEXT_PUBLIC_SITE_ENVIRONMENT === "production") && await TriggerBrandShipEmail(request?.host?.email, request.brand?.company_name) }
                    // { request && request.product && request.event && (process?.env?.NEXT_PUBLIC_SITE_ENVIRONMENT === "production") && await notifyConfirmShippingBrand(request.product?.name, request.units_requested, request.event?.title, request.event?.date, trackingLink, false) }
                }
            }
            else {
                setError("An Error Occured While Completing The Order.")
                setLoading(false);
                setOrderId('');
            }
        }
    }
};


return (
    <div className='flex flex-col'>
        {/* To Review The Draft Order Details */}
        {!isDraft && draftResult.invoice_url && !completedOrder && <a onClick={() => {
            if(!completedOrder){setCompleteOrderPage('reviewed')}}} href={draftResult.invoice_url} target={"_blank"} className='underline text-primary mb-4 flex flex-row items-center justify-center'>{completedOrder ? "Your Order Was Succesfully Placed!" : "Click here to review draft order"} <ArrowTopRightOnSquareIcon height={20} className='ml-2'></ArrowTopRightOnSquareIcon> </a>}
        {loading ? <div className='flex justify-center items-center'><LoaderSpinner userType='Brand' /></div> :
            <>
               
                {!completedOrder ? <Button onClick={handleOrderAction} disabled={completeOrderStage === "processed" || quantity === 0}>
                    {isDraft ? 'Create Draft Order' : (completeOrderStage === "processed" ) ? 'Place Order' : 'Place Order'}
                </Button> :
                    <Button onClick={() => window.location.reload()}>
                        Okay
                    </Button>}
            </>
        }

        {error && <div className="max-w-xs mt-4 items-center bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-800 dark:border-neutral-700" role="alert" tabIndex={-1} aria-labelledby="hs-toast-error-example-label">
            <div className="flex p-4">
                <div className="shrink-0">
                    <svg className="shrink-0 size-4 text-red-500 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
                    </svg>
                </div>
                <div className="ms-3">
                    <p id="hs-toast-error-example-label" className="text-sm text-gray-700 dark:text-neutral-400">
                        {error}
                    </p>
                </div>
            </div>
        </div>}
    </div>
);
};

export default OrderProcessor;
