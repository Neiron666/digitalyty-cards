export default {
    async createPayment({ userId, plan }) {
        return {
            paymentUrl: `/mock-payment-success?plan=${plan}`,
        };
    },

    async handleNotify(/* body */) {
        // Security: public mock notify is a deliberate NO-OP.
        // Testing payment flow → use POST /api/admin/billing/simulate-payment.
        console.warn("[mock] handleNotify called - NO-OP for security");
    },
};
