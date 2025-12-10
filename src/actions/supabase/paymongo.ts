import axios from "axios";

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

export const paymentMethods: string[] = ["gcash"];

if (!PAYMONGO_SECRET_KEY) {
  throw new Error("PAYMONGO_SECRET_KEY is not set");
}

const paymongoClient = axios.create({
  baseURL: PAYMONGO_BASE_URL,
  auth: {
    username: PAYMONGO_SECRET_KEY,
    password: "",
  },
  headers: {
    "Content-Type": "application/json",
  },
});

export const createPaymentLink = async (data: {
  amount: number; // in cents
  description: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  failureUrl?: string;
  paymentMethods?: string[]; // Add this parameter
}) => {
  try {
    const response = await paymongoClient.post("/links", {
      data: {
        attributes: {
          amount: data.amount,
          description: data.description,
          metadata: data.metadata || {},
          payment_methods: data.paymentMethods || paymentMethods,
          redirect: {
            success:
              data.successUrl ||
              `${process.env.NEXT_PUBLIC_SITE_URL}/customer/subscription?success=true`,
            failed:
              data.failureUrl ||
              `${process.env.NEXT_PUBLIC_SITE_URL}/customer/subscription`,
          },
        },
      },
    });

    return response.data.data;
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw new Error("Failed to create payment link");
  }
};

export const getPaymentLink = async (linkId: string) => {
  try {
    const response = await paymongoClient.get(`/links/${linkId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error getting payment link:", error);
    throw new Error("Failed to get payment link");
  }
};
