function BusinessHeader({ card }) {
    const { business } = card;

    return (
        <section>
            <h1>{business.businessName}</h1>
            {business.slogan && <h2>{business.slogan}</h2>}
            {business.ownerName && <p>{business.ownerName}</p>}
            {business.occupation && <p>{business.occupation}</p>}
            {business.address && <p>{business.address}</p>}
        </section>
    );
}

export default BusinessHeader;
