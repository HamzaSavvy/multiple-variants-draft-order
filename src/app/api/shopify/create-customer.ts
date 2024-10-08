import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { Crypter } from '@/utils/encrypt';
export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const customerEmail = data.email;
        const newAddress = data.address;
        const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION!;
        const SHOPIFY_API_URL = `${data.shopify_store_url}/admin/api/${SHOPIFY_API_VERSION}`;
        const SHOPIFY_ACCESS_TOKEN = Crypter.decrypt(data.shopify_access_token);

        // Validate newAddress structure
        const requiredFields = ['firstName', 'lastName', 'address1', 'city', 'province', 'country', 'zip', 'phone'];
        for (const field of requiredFields) {
            if (!newAddress[field]) {
                return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
            }
        }
        const customerResponse = await fetch(`${SHOPIFY_API_URL}/customers.json?email=${encodeURIComponent(customerEmail)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
        });

        if (!customerResponse.ok) {
            const errorData = await customerResponse.json();
            console.error('Error fetching customer:', errorData);
            return NextResponse.json({ error: errorData.errors }, { status: customerResponse.status });
        }

        const { customers } = await customerResponse.json();

        // If customer not found, proceed to create a new customer
        if (!customers || customers.length === 0) {
            // Create a new customer since none is found
            const createCustomerResponse = await fetch(`${SHOPIFY_API_URL}/customers.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    customer: {
                        first_name: newAddress.firstName,
                        email: customerEmail,
                        verified_email: true,
                        addresses: [{
                            first_name: newAddress.firstName,
                            last_name: newAddress.lastName,
                            address1: newAddress.address1,
                            city: newAddress.city,
                            province: newAddress.province,
                            country: newAddress.country,
                            zip: newAddress.zip,
                            phone: newAddress.phone,
                        }],
                    },
                }),
            });

            if (!createCustomerResponse.ok) {
                const errorData = await createCustomerResponse.json();
                console.error('Error creating customer:', errorData);
                return NextResponse.json({ error: errorData.errors || 'Failed to create customer' }, { status: 422 });
            }

            const newCustomer = await createCustomerResponse.json();
            return NextResponse.json(newCustomer, { status: 201 });
        }

        const customer = customers[0];
        const customerId = customer.id;

        // Retrieve existing addresses for the customer
        const addressesResponse = await fetch(`${SHOPIFY_API_URL}/customers/${customerId}/addresses.json`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
        });

        if (!addressesResponse.ok) {
            const errorData = await addressesResponse.json();
            console.error('Error fetching addresses:', errorData);
            return NextResponse.json({ error: errorData.errors }, { status: addressesResponse.status });
        }

        const { addresses } = await addressesResponse.json();

        if (addresses.length > 0) {
            const addressId = addresses[0].id; // Update the first address

            const updateAddressResponse = await fetch(`${SHOPIFY_API_URL}/customers/${customerId}/addresses/${addressId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    address: {
                        first_name: newAddress.firstName,
                        last_name: newAddress.lastName,
                        address1: newAddress.address1,
                        city: newAddress.city,
                        province: newAddress.province,
                        country: newAddress.country,
                        zip: newAddress.zip,
                        phone: newAddress.phone,
                    },
                }),
            });

            if (!updateAddressResponse.ok) {
                const errorData = await updateAddressResponse.json();
                console.error('Error updating address:', errorData);
                return NextResponse.json({ error: errorData.errors || 'Failed to update address' }, { status: 422 });
            }

            const updatedAddress = await updateAddressResponse.json();
            console.log('Updated address:', updatedAddress);
            return NextResponse.json({ customer: { id: customerId }, updatedAddress }, { status: 200 });
        } else {
            // Create a new address since none exist
            const createAddressResponse = await fetch(`${SHOPIFY_API_URL}/customers/${customerId}/addresses.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    address: {
                        first_name: newAddress.firstName,
                        last_name: newAddress.lastName,
                        address1: newAddress.address1,
                        city: newAddress.city,
                        province: newAddress.province,
                        country: newAddress.country,
                        zip: newAddress.zip,
                        phone: newAddress.phone,
                    },
                }),
            });

            if (!createAddressResponse.ok) {
                const errorData = await createAddressResponse.json();
                console.error('Error creating address:', errorData);
                return NextResponse.json({ error: errorData.errors || 'Failed to create address' }, { status: 422 });
            }

            const createdAddress = await createAddressResponse.json();
            return NextResponse.json({ customer: { id: customerId }, createdAddress }, { status: 201 });
        }

    }
    catch (error: any) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: "Please use POST to create or fetch a customer" }, { status: 405 });
}
