import fetch from "node-fetch";
import ourServices from "./services";

interface RecordPayload {
  quantity?: number;
  description?: string;
  userId?: string;
  serviceId: string;
  type: string;
}

interface ResponseGetApiKeyByHashedKey {
  userId: string;
}

interface ResponseGetUserBalance {
    user_id: string;
    balance: number;
    currency: string;
}

export class Billing {
  private readonly apiUrl: string;
  private readonly billingApiUrl: string;
  private readonly billingApiKey: string;

  constructor(apiUrl: string, billingUrl: string, billingApiKey: string) {
    this.apiUrl = apiUrl;
    this.billingApiUrl = billingUrl;
    this.billingApiKey = billingApiKey;
  }

  verify(serviceId: string) {
    return async (req: any, res: any, next: Function) => {
      try {
        const apiKey = req.headers["x-api-key"];
        if (!apiKey) {
          return res.status(401).send("Unauthorized: Missing API Key");
        }

        let userId = req.headers["user-id"];
        if (!userId) {
          const user = await this.getApiKeyByHashedKey(apiKey);
          if (!user?.userId) {
            return res.status(401).send("Unauthorized: Invalid API Key");
          }
          userId = user.userId.toString();
          req.headers["user-id"] = userId;
        }

        if (!this.isValidServiceId(serviceId)) {
          return res.status(400).send("Invalid Service ID");
        }

        const userBalance = await this.getUserBalance(userId);

        if (userBalance < ourServices[serviceId].unit_price) {
          return res.status(402).send("Insufficient Balance");
        }

        next();
      } catch (error) {
        console.error("Error occurred in verifyBilling:", error);
        res.status(500).send({
          message: "Internal Server Error",
          error: (error as Error).message,
        });
      }
    };
  }

  async getApiKeyByHashedKey(apiKey: string): Promise<ResponseGetApiKeyByHashedKey> {
    const response = await fetch(`${this.apiUrl}/api-key/get-api-key-by-hashed-key`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user by API key");
    }
    return response.json() as Promise<ResponseGetApiKeyByHashedKey>;
  }

  isValidServiceId(serviceId: string): boolean {
    return !!serviceId && !!ourServices[serviceId];
  }

  async getUserBalance(userId: string): Promise<number> {
    if (!this.billingApiKey) {
      throw new Error("Unauthorized: Missing API Key");
    }

    const response = await fetch(
      `${this.billingApiUrl}/billing/${userId}/balance`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.billingApiKey,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch user balance");
    }

    const data = await response.json() as ResponseGetUserBalance;
    return data!.balance;
  }

  async addRecord(payload: RecordPayload): Promise<any> {
    const { quantity = 1, description, userId, serviceId, type } = payload;

    if (!this.billingApiKey) {
      throw new Error("Unauthorized: Missing API Key");
    }

    let validatedUserId = userId;
    if (!validatedUserId) {
      const user = await this.getApiKeyByHashedKey(this.billingApiKey);
      if (!user?.userId) {
        throw new Error("Unauthorized: Invalid API Key");
      }
      validatedUserId = user.userId;
    }

    if (!this.isValidServiceId(serviceId)) {
      throw new Error("Invalid Service ID");
    }

    const unitPrice = ourServices[serviceId].unit_price;

    const response = await fetch(`${this.billingApiUrl}/billing/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.billingApiKey,
      },
      body: JSON.stringify({
        user_id: validatedUserId,
        service_id: serviceId,
        quantity,
        description,
        type,
        unit_price: unitPrice,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to add record");
    }

    return response.json();
  }
}

export default Billing;
