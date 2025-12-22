export default function Paywall({ text, onUpgrade }) {
    return (
        <div className="paywall">
            <p>{text}</p>
            <button onClick={onUpgrade}>שדרג עכשיו</button>
        </div>
    );
}
