import { CheckCircleFilled, MinusCircleOutlined } from '@ant-design/icons'
import { Flex, Typography } from 'antd'

export interface PasswordRule {
  label: string
  passed: boolean
}

/** Daftar syarat password dengan penanda langsung (hijau saat terpenuhi). */
export function PasswordRules({ rules }: { rules: PasswordRule[] }) {
  return (
    <Flex vertical gap={4} style={{ marginBottom: 16 }} aria-live="polite">
      {rules.map((rule) => (
        <Typography.Text key={rule.label} type={rule.passed ? 'success' : 'secondary'}>
          {rule.passed ? <CheckCircleFilled /> : <MinusCircleOutlined />} {rule.label}
        </Typography.Text>
      ))}
    </Flex>
  )
}
