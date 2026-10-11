import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0f766e',
    borderRadius: 8,
    controlHeight: 40,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: '#ffffff', headerHeight: 56, headerPadding: '0 16px', siderBg: '#ffffff' },
    Menu: { itemBorderRadius: 8 },
  },
}
