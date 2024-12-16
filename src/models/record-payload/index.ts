export interface RecordPayload {
    quantity?: number;
    description?: string;
    userId?: string;
    serviceId: string;
    callee?: string;
    type: string;
}