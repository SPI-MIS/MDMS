// formSchema.js
export const formSchema = [
  {
    key: 'date',
    label: '(帳務歸屬日)日期',
    type: 'date',
    cols: 3,
    default: 'today'
  },
  {
    key: 'class_no',
    label: '班別代號',
    type: 'select',
    cols: 3,
    options: [
      { title: '早班', value: '1' },
      { title: '中班', value: '2' },
      { title: '晚班', value: '3' }
    ]
  },
  {
    key: 'line',
    label: '生產線別',
    type: 'select',
    cols: 3,
    options: [
      { title: 'A押出課', value: 'A' },
      { title: 'B01成切線', value: 'B01' },
      { title: 'B11沖模線', value: 'B11' },
      { title: 'C裁切線', value: 'C' },
      { title: 'C01成切二線', value: 'C01' }
    ]
  },
  {
    key: 'M_no',
    label: '機台代號',
    type: 'select',
    cols: 4,
    optionSource: {
      type: 'api',
      url: '/api/machine',
      labelKey: 'MX003',
      valueKey: 'MX001',
      dependsOn: 'line'  // 依賴於 line 欄位，不需要 buildUrl，會自動添加 ?line=xxx
    },
    disabled: (rowData) => !rowData?.line
  },
  {
    key: 'ex_no',
    label: '除外機時代號',
    type: 'select',
    cols: 4,
    optionSource: {
      type: 'api',
      url: '/api/exNo',
      labelKey: 'label',
      valueKey: 'f07',
      dependsOn: 'line'  // 依賴於 line 欄位，不需要 buildUrl，會自動添加 ?line=xxx
    },
    disabled: (rowData) => !rowData?.line
  },  
  {
    key: 'duration',
    label: '非生產機時(分鐘)',
    type: 'duration',
    cols: 2
  },  
  {
    key: 'remark',
    label: '備註',
    type: 'textarea',
    cols: 10  // 獨佔一行
  }
]