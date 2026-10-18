import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Flex, Input, Select, Typography } from 'antd'
import { getGroup, getRows, getText } from '../data'
import type { FieldsSection, ReportData, ReportDefinition, SignatureSection, TableRow, TableSection, TextSection } from '../types'

type Change = (next: ReportData) => void

function TableForm({ section, data, onChange, disabled }: { section: TableSection; data: ReportData; onChange: Change; disabled: boolean }) {
  const rows = getRows(data, section.key)
  const fixed = Boolean(section.rows_from) && !section.dynamic_rows
  const labelKey = section.columns[0]?.key

  const setRows = (next: TableRow[]) => onChange({ ...data, [section.key]: next })
  const setCell = (index: number, key: string, value: string) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  const emptyRow = () => Object.fromEntries(section.columns.map((c) => [c.key, '']))

  return (
    <Flex vertical gap={10}>
      {rows.length === 0 && <Typography.Text type="secondary">Belum ada baris.</Typography.Text>}
      {rows.map((row, index) => (
        <div key={index} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
          <Flex justify="space-between" align="center" gap={8}>
            {fixed && labelKey ? (
              <Typography.Text strong>{row[labelKey]}</Typography.Text>
            ) : (
              <Typography.Text type="secondary">Baris {index + 1}</Typography.Text>
            )}
            {!fixed && !disabled && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                aria-label={`Hapus baris ${index + 1}`}
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              />
            )}
          </Flex>
          <Flex gap={8} wrap style={{ marginTop: 6 }}>
            {section.columns
              .filter((c) => !(fixed && c.key === labelKey))
              .map((c) => {
                const textarea = c.input === 'textarea' || c.key === 'note'
                return (
                  <div key={c.key} style={{ flex: textarea ? '3 1 220px' : '1 1 110px', minWidth: 0 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {c.label}
                    </Typography.Text>
                    {textarea ? (
                      <Input.TextArea autoSize={{ minRows: 1, maxRows: 5 }} maxLength={500} disabled={disabled} value={row[c.key] ?? ''} onChange={(e) => setCell(index, c.key, e.target.value)} />
                    ) : (
                      <Input
                        disabled={disabled}
                        maxLength={500}
                        inputMode={c.key === 'score' || c.input === 'number' ? 'decimal' : 'text'}
                        value={row[c.key] ?? ''}
                        onChange={(e) => setCell(index, c.key, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
          </Flex>
        </div>
      ))}
      {!fixed && !disabled && rows.length < 60 && (
        <Button icon={<PlusOutlined />} onClick={() => setRows([...rows, emptyRow()])} style={{ alignSelf: 'flex-start' }}>
          Tambah baris
        </Button>
      )}
    </Flex>
  )
}

function FieldsForm({ section, data, onChange, disabled }: { section: FieldsSection; data: ReportData; onChange: Change; disabled: boolean }) {
  const values = getGroup(data, section.key)
  const set = (key: string, value: string) => onChange({ ...data, [section.key]: { ...values, [key]: value } })

  return (
    <Flex gap={12} wrap>
      {section.fields.map((f) => (
        <div key={f.key} style={{ flex: '1 1 130px', minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {f.label}
          </Typography.Text>
          {f.input === 'select' && f.options ? (
            <Select
              allowClear
              disabled={disabled}
              value={values[f.key] || undefined}
              onChange={(v) => set(f.key, v ?? '')}
              options={f.options.map((o) => ({ value: o, label: o }))}
              style={{ width: '100%' }}
            />
          ) : (
            <Input
              disabled={disabled}
              maxLength={500}
              inputMode={f.input === 'number' ? 'numeric' : 'text'}
              value={values[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </Flex>
  )
}

function TextForm({ section, data, onChange, disabled }: { section: TextSection; data: ReportData; onChange: Change; disabled: boolean }) {
  return (
    <Input.TextArea
      rows={4}
      showCount
      maxLength={section.max_length ?? 2000}
      disabled={disabled}
      value={getText(data, section.key)}
      onChange={(e) => onChange({ ...data, [section.key]: e.target.value })}
    />
  )
}

function SignatureForm({ section, data, onChange, disabled }: { section: SignatureSection; data: ReportData; onChange: Change; disabled: boolean }) {
  const names = getGroup(data, section.key)

  return (
    <Flex gap={12} wrap>
      {section.signers.map((signer) => (
        <div key={signer} style={{ flex: '1 1 180px', minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {signer}
          </Typography.Text>
          <Input
            disabled={disabled}
            maxLength={150}
            placeholder="Nama (opsional)"
            value={names[signer] ?? ''}
            onChange={(e) => onChange({ ...data, [section.key]: { ...names, [signer]: e.target.value } })}
          />
        </div>
      ))}
    </Flex>
  )
}

/** Form isian rapor yang dibentuk dari definisi template. */
export function ReportForm({
  definition,
  data,
  onChange,
  disabled,
}: {
  definition: ReportDefinition
  data: ReportData
  onChange: Change
  disabled: boolean
}) {
  return (
    <Flex vertical gap={12}>
      {definition.sections.map((section) => {
        if (section.type === 'student_identity') return null
        const title = section.type === 'text' ? (section.label ?? section.title) : section.title

        return (
          <Card key={section.key} size="small" title={title}>
            {section.type === 'table' && <TableForm section={section} data={data} onChange={onChange} disabled={disabled} />}
            {section.type === 'fields' && <FieldsForm section={section} data={data} onChange={onChange} disabled={disabled} />}
            {section.type === 'text' && <TextForm section={section} data={data} onChange={onChange} disabled={disabled} />}
            {section.type === 'signature' && <SignatureForm section={section} data={data} onChange={onChange} disabled={disabled} />}
          </Card>
        )
      })}
    </Flex>
  )
}
