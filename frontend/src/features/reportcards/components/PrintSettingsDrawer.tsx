import { PrinterOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, Flex, Form, InputNumber, Radio, Select, Typography } from 'antd'
import { PAPER_PRESETS, type PrintSettings } from '../printSettings'

const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia', 'Tahoma']

/** Pengaturan kertas, margin, dan kalibrasi (offset) untuk mencetak rapor, termasuk kertas khusus. */
export function PrintSettingsDrawer({
  open,
  settings,
  onChange,
  onReset,
  onClose,
  onPrint,
  onTestPrint,
  printLabel,
}: {
  open: boolean
  settings: PrintSettings
  onChange: (next: PrintSettings) => void
  onReset: () => void
  onClose: () => void
  onPrint: () => void
  onTestPrint: () => void
  printLabel: string
}) {
  const [form] = Form.useForm<PrintSettings>()

  const handleChange = (changed: Partial<PrintSettings>, all: PrintSettings) => {
    const next = { ...settings, ...all }
    if (changed.size && PAPER_PRESETS[changed.size]) {
      next.width_mm = PAPER_PRESETS[changed.size].width
      next.height_mm = PAPER_PRESETS[changed.size].height
      form.setFieldsValue({ width_mm: next.width_mm, height_mm: next.height_mm })
    }
    onChange(next)
  }

  const custom = settings.size === 'Custom'
  const num = (name: keyof PrintSettings, label: string, props: { min?: number; max?: number; step?: number } = {}) => (
    <Form.Item name={name} label={label} style={{ flex: '1 1 110px', marginBottom: 12 }}>
      <InputNumber {...props} style={{ width: '100%' }} inputMode="decimal" suffix="mm" />
    </Form.Item>
  )

  return (
    <Drawer open={open} onClose={onClose} title="Pengaturan cetak" size="min(460px, 100vw)" destroyOnHidden>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Untuk kertas rapor khusus"
        description="Pilih ukuran kertas, lalu jalankan Cetak uji pada kertas biasa dan ukur jarak kotak dari tepi. Sesuaikan margin dan Offset X/Y sampai posisinya tepat. Pengaturan tersimpan di perangkat ini. Di dialog cetak browser, pilih ukuran kertas yang sama dan skala 100%."
      />

      <Form<PrintSettings> form={form} layout="vertical" initialValues={settings} onValuesChange={handleChange} requiredMark={false}>
        <Form.Item name="size" label="Ukuran kertas">
          <Select
            options={[...Object.entries(PAPER_PRESETS).map(([value, p]) => ({ value, label: p.label })), { value: 'Custom', label: 'Ukuran lain (custom)' }]}
          />
        </Form.Item>
        {custom && (
          <Flex gap={12} wrap>
            {num('width_mm', 'Lebar', { min: 50, max: 600, step: 0.5 })}
            {num('height_mm', 'Tinggi', { min: 50, max: 900, step: 0.5 })}
          </Flex>
        )}
        <Form.Item name="orientation" label="Orientasi">
          <Radio.Group optionType="button" options={[{ value: 'portrait', label: 'Tegak' }, { value: 'landscape', label: 'Mendatar' }]} />
        </Form.Item>

        <Typography.Text strong>Margin</Typography.Text>
        <Flex gap={12} wrap style={{ marginTop: 8 }}>
          {num('margin_top_mm', 'Atas', { min: 0, max: 80, step: 1 })}
          {num('margin_bottom_mm', 'Bawah', { min: 0, max: 80, step: 1 })}
        </Flex>
        <Flex gap={12} wrap>
          {num('margin_left_mm', 'Kiri', { min: 0, max: 80, step: 1 })}
          {num('margin_right_mm', 'Kanan', { min: 0, max: 80, step: 1 })}
        </Flex>

        <Typography.Text strong>Kalibrasi (geser isi)</Typography.Text>
        <Flex gap={12} wrap style={{ marginTop: 8 }}>
          {num('offset_x_mm', 'Offset X (kanan +)', { min: -30, max: 30, step: 0.5 })}
          {num('offset_y_mm', 'Offset Y (bawah +)', { min: -30, max: 30, step: 0.5 })}
        </Flex>

        <Flex gap={12} wrap>
          <Form.Item name="font_family" label="Huruf" style={{ flex: '2 1 180px', marginBottom: 12 }}>
            <Select options={FONTS.map((f) => ({ value: f, label: f }))} />
          </Form.Item>
          <Form.Item name="font_size_pt" label="Ukuran huruf" style={{ flex: '1 1 110px', marginBottom: 12 }}>
            <InputNumber min={7} max={16} step={0.5} style={{ width: '100%' }} suffix="pt" />
          </Form.Item>
        </Flex>
      </Form>

      <Flex vertical gap={8} style={{ marginTop: 8 }}>
        <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={onPrint}>
          {printLabel}
        </Button>
        <Button onClick={onTestPrint}>Cetak uji (kalibrasi)</Button>
        <Button
          type="text"
          onClick={() => {
            onReset()
            onClose()
          }}
        >
          Kembalikan ke bawaan template
        </Button>
      </Flex>
    </Drawer>
  )
}
