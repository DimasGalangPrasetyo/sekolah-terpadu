import { BankOutlined } from '@ant-design/icons'
import { RequirePermission } from '../../app/guards'
import type { ModuleDef } from '../../app/moduleTypes'
import { SchoolProfilePage } from './lazyPages'

const school: ModuleDef = {
  key: 'school',
  routes: [{ path: 'profil-sekolah', element: <RequirePermission permission="system.manage"><SchoolProfilePage /></RequirePermission> }],
  nav: [
    {
      key: 'school',
      path: '/profil-sekolah',
      label: 'Profil Sekolah',
      description: 'Nama yayasan, alamat, dan kepala sekolah untuk kop surat',
      icon: <BankOutlined />,
      permission: ['system.manage'],
      group: 'settings',
    },
  ],
}

export default school
