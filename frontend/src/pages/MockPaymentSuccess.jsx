import { useEffect } from "react";
import { verifyPayment } from "../services/payment.service";

function MockPaymentSuccess() {
    useEffect(() => {
        verifyPayment().then(() => {
            alert("התשלום הצליח! החבילה שודרגה");
            window.location.href = "/edit";
        });
    }, []);

    return <p>מאמת תשלום...</p>;
}

export default MockPaymentSuccess;
