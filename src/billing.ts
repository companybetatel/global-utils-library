import fetch from "node-fetch";
import {RecordPayload, ResponseApiKey, ResponseBalance, StatusCodeEnum} from "./models";
import {AppMessage, Endpoint} from "./constants";

export class Billing {
    private readonly apiUrl: string;
    private readonly billingApiUrl: string;
    private readonly billingApiKey: string;

    constructor(apiUrl: string, billingUrl: string, billingApiKey: string) {
        this.apiUrl = apiUrl;
        this.billingApiUrl = billingUrl;
        this.billingApiKey = billingApiKey;
    }

    /**
     * @Description Verify service - billing middleware
     * @param {string} serviceId - service identifier
     * @returns {Function}
     */
    verify(serviceId: string) {
        return async (req: any, res: any, next: Function) => {
            try {

                /**Check api key*/
                const apiKey = req.headers["x-api-key"];
                if (!apiKey)
                    return res.status(StatusCodeEnum.UNAUTHORIZED).send(AppMessage.ERROR_MISSING_KEY);

                /**Check user id*/
                let userId = req.headers["x-user-id"];
                if (!userId) {
                    const user = await this.getApiKeyUser(apiKey);
                    if (!user?.userId)
                        return res.status(StatusCodeEnum.UNAUTHORIZED).send(AppMessage.ERROR_INVALID_KEY);

                    userId = user.userId.toString();
                    req.headers["x-user-id"] = userId;
                }

                /**Get destination number*/
                const {callee} = req[req.method === 'GET' ? 'query' : 'body'];

                /**Get unit price**/
                const unitPrice = await this.getUnitPrice(serviceId, userId, callee);
                if (!unitPrice)
                    return res.status(StatusCodeEnum.NOT_FOUND).send(AppMessage.ERROR_UNIT_PRICE_NOT_FOUND);

                /**Check balance*/
                const userBalance = await this.getUserBalance(userId);

                /**Insufficient balance*/
                if (userBalance < unitPrice)
                    return res.status(StatusCodeEnum.PAYMENT_REQUIRED).send(AppMessage.ERROR_INSUFFICIENT_FUNDS);

                next();
            } catch (error) {
                res.status(StatusCodeEnum.INTERNAL_SERVER_ERROR).send({
                    message: AppMessage.ERROR_INTERNAL_SERVER_ERROR,
                    error: (error as Error).message,
                });
            }
        };
    }

    /**
     * @Description Get api key user
     * @param {string} apiKey - plain api key
     * @returns {Promise<ResponseApiKey>}
     */
    async getApiKeyUser(apiKey: string): Promise<ResponseApiKey> {
        const response = await fetch(`${this.apiUrl}${Endpoint.API_KEY_USER}`, {
            method: "GET",
            headers: {"x-api-key": apiKey}
        });

        if (!response.ok){
            let error =  await response.json();
            throw new Error(error.error || AppMessage.ERROR_GET_API_KEY);
        }

        return response.json() as Promise<ResponseApiKey>;
    }

    /**
     * @Description Get unit price for specific service
     * @param {string} serviceId - service identifier
     * @param {string} userId - user identifier
     * @param {string|null|undefined} callee - callee identifier
     * @returns {Promise<number>}
     */
    async getUnitPrice(serviceId: string, userId:string, callee: string|null|undefined): Promise<number> {
        /**Check service id*/
        if (!serviceId)
            throw new Error(AppMessage.ERROR_MISSING_SERVICE_ID);

        /**Get unit price from billing*/
        const queryParams = callee ? `?${new URLSearchParams({callee})}` : '';
        const response = await fetch(
            `${this.billingApiUrl}${Endpoint.UNIT_PRICE.replace(":service_id", serviceId)}${queryParams}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.billingApiKey,
                    "x-user-id": userId
                }
            }
        );

        if (!response.ok){
            let error =  await response.json();
            throw new Error(error.error || error.message || AppMessage.ERROR_GET_UNIT_PRICE);
        }

        return await response.json();
    }

    /**
     * @Description Get user balance
     * @param {string} userId - user identifier
     * @returns {Promise<number>}
     */
    async getUserBalance(userId: string): Promise<number> {

        /**Check api key*/
        if (!this.billingApiKey)
            throw new Error(AppMessage.ERROR_MISSING_KEY);

        /**Get user balance from billing*/
        const response = await fetch(
            `${this.billingApiUrl}${Endpoint.BALANCE.replace(":userId", userId)}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.billingApiKey,
                    "x-user-id": userId
                }
            }
        );

        if (!response.ok){
            let error =  await response.json();
            throw new Error(error.error || error.message || AppMessage.ERROR_GET_USER_BALANCE);
        }

        const data = await response.json() as ResponseBalance;
        return data!.balance;
    }

    /**
     * @Description Add billing record
     * @param {RecordPayload} payload - record payload
     * @returns {Promise<any>}
     */
    async addRecord(payload: RecordPayload): Promise<any> {
        const {quantity = 1, description, userId, serviceId, callee, type} = payload;

        /**Check api key*/
        if (!this.billingApiKey)
            throw new Error(AppMessage.ERROR_MISSING_KEY);

        /**Check user id*/
        let validatedUserId = userId;
        if (!validatedUserId) {
            const user = await this.getApiKeyUser(this.billingApiKey);
            if (!user?.userId)
                throw new Error(AppMessage.ERROR_INVALID_KEY);
            validatedUserId = user.userId;
        }

        /**Get unit price**/
        const unitPrice = await this.getUnitPrice(serviceId, validatedUserId, callee);
        if (!unitPrice)
            throw new Error(AppMessage.ERROR_UNIT_PRICE_NOT_FOUND);

        /**Add record*/
        const response = await fetch(`${this.billingApiUrl}${Endpoint.RECORD}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.billingApiKey,
                "x-user-id": validatedUserId
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

        if (!response.ok)
            throw new Error(AppMessage.ERROR_CREATE_RECORD);

        return response.json();
    }
}

export default Billing;
