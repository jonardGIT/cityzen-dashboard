import { Button, Result } from "antd";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <Result
      status="403"
      title="Access Denied"
      subTitle="You do not have permission to access this resource."
      extra={
        <Button type="primary">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      }
    />
  );
}
