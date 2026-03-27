import { Empty, Result, Skeleton, Space } from "antd";

export function LoadingState() {
  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </Space>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <Result status="error" title="Request Failed" subTitle={message} />;
}

export function EmptyState({ description }: { description: string }) {
  return <Empty description={description} />;
}
