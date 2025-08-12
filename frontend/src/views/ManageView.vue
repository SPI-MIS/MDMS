<template>
  <v-container>
    <v-card>
      <v-card-title class="text-h6">使用者管理</v-card-title>
      <v-data-table
        :headers="headers"
        :items="rows"
        fixed-header
        height="600"
        class="elevation-1"
      >
        <!-- ✅ 動作按鈕 -->
        <template v-slot:[`item.actions`]="{ item }">
          <v-row class="ga-3">
            <v-icon color="blue-darken-4" icon="mdi-pencil" size="small"  @click="openEditDialog(item)"></v-icon>
            <v-icon color="red-darken-4" icon="mdi-delete" size="small"  @click="openEditDialog(item)"></v-icon>
          </v-row>
        </template>

        <template v-slot:no-data>
          <v-alert type="info">目前尚無資料</v-alert>
        </template>
      </v-data-table>
    </v-card>

    <!-- ✅ 編輯 Dialog -->
    <v-dialog v-model="editDialog" max-width="500px">
      <v-card>
        <v-card-title>編輯使用者</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="editedUser.f04" label="姓名" />
            <v-text-field v-model="editedUser.f03" label="密碼" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="grey" @click="editDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveEdit">儲存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const rows = ref([]);
const editDialog = ref(false);
const editedUser = ref({ f02: '', f03: '', f05: '' });

const headers = [
  { title: '工號', key: 'f02' },
  { title: '姓名', key: 'f04' },
  { title: '部門', key: 'f05' },
  { title: '密碼', key: 'f03' },
  { title: '操作', key: 'actions', sortable: false }
];

// 取得所有使用者資料
onMounted(async () => {
  try {
    const res = await axios.get('/api/user');
    rows.value = res.data
  } catch (err) {
    console.error('讀取資料失敗', err);
  }
});

// 開啟編輯視窗
const openEditDialog = (item) => {
  editedUser.value = { ...item };
  editDialog.value = true;
};

// 儲存編輯後更新後端
const saveEdit = async () => {
  try {
    const res = await axios.put(`/api/user/${editedUser.value.f02}`, {
      name: editedUser.value.f04,
      email: editedUser.value.f05
    });

    if (res.data.success) {
      const index = rows.value.findIndex(u => u.f02 === editedUser.value.f02);
      if (index !== -1) {
        rows.value[index] = { ...editedUser.value };
      }
      editDialog.value = false;
    } else {
      alert('❌ 更新失敗');
    }
  } catch (err) {
    console.error('儲存失敗', err);
    alert('❌ 系統錯誤');
  }
};
</script>
