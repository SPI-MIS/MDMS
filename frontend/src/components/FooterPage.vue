<template>
  <v-footer app height="36" class="py-1 px-3" color="primary">
    <v-container fluid>
      <v-row align="center" justify="space-between" class="text-caption">
        <!-- 左 -->
        <v-col cols="4" class="text-left py-0"></v-col>

        <!-- 中 -->
        <v-col cols="4" class="text-center py-0"> &copy; {{ new Date().getFullYear() }} 南部化成股份有限公司 </v-col>

        <!-- 右 -->
        <v-col cols="4" class="text-right py-0">版本 v1.1.0</v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>
