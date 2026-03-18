import { Form, Input, Modal } from "antd";
import type { FormInstance } from "antd";
import type { CitizenFormValues } from "@/components/dashboard/types";

interface CreateCitizenModalProps {
  open: boolean;
  loading: boolean;
  form: FormInstance<CitizenFormValues>;
  onCancel: () => void;
  onSubmit: () => void;
}

export function CreateCitizenModal({
  open,
  loading,
  form,
  onCancel,
  onSubmit,
}: CreateCitizenModalProps) {
  return (
    <Modal
      title="Create Citizen"
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={loading}
      okText="Create"
    >
      <Form<CitizenFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required." }]}
        >
          <Input placeholder="Juan Dela Cruz" />
        </Form.Item>

        <Form.Item
          name="contactInfo"
          label="Contact Info"
          rules={[{ required: true, message: "Contact info is required." }]}
        >
          <Input placeholder="juan.delacruz@example.com" />
        </Form.Item>

        <Form.Item
          name="preferredChannel"
          label="Preferred Channel"
          rules={[{ required: true, message: "Preferred channel is required." }]}
        >
          <Input placeholder="sms" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
