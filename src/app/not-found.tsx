import { Button, Result } from "antd";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Page Not Found"
      subTitle="The page you are looking for does not exist."
      extra={
        <Button type="primary">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      }
    />
  );
}
