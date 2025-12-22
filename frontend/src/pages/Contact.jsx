import Page from "../components/page/Page";
import Button from "../components/ui/Button";

export default function Contact() {
    const email = "digitalyty.web@gmail.com";

    return (
        <Page title="צור קשר" subtitle="נשמח לשמוע מכם">
            <div style={{ textAlign: "center" }}>
                <p>ניתן לפנות אלינו במייל:</p>
                <strong>{email}</strong>

                <div
                    style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Button as="a" href={`mailto:${email}`} variant="secondary">
                        שלחו מייל
                    </Button>
                </div>
            </div>
        </Page>
    );
}
