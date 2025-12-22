import styles from "./CardBody.module.css";

function CardBody({ children }) {
    return <main className={styles.body}>{children}</main>;
}

export default CardBody;
